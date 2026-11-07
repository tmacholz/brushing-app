import type { Child, PuzzleProgress } from '../types';
import { PUZZLES, PIECES_PER_PUZZLE, PUZZLE_UNLOCK_COST, type Puzzle } from '../data/puzzles';

// Parsed progress always carries the found pieces and the paused map.
export type Progress = PuzzleProgress & {
  found: number[]; nextPiece: number | null; paused: Record<string, number[]>; unlocked: string[]; keys: number; friends: string[];
};

const EMPTY: Progress = { currentPuzzleId: null, piecesFound: 0, found: [], nextPiece: null, completedPuzzleIds: [], paused: {}, unlocked: [], keys: 0, friends: [] };

const isPieceIndex = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < PIECES_PER_PUZZLE;

// Older saves stored a count; pieces were then found in order 0, 1, 2...
const parseFound = (list: unknown, count: unknown): number[] => {
  if (Array.isArray(list)) return [...new Set(list.filter(isPieceIndex))];
  const n = Number(count);
  const c = Number.isFinite(n) ? Math.max(0, Math.min(PIECES_PER_PUZZLE, Math.floor(n))) : 0;
  return Array.from({ length: c }, (_, i) => i);
};

// modeProgress is free-form JSON from the server, so read it defensively.
export function getPuzzleProgress(child: Pick<Child, 'modeProgress'> | null | undefined): Progress {
  const raw = (child?.modeProgress as { puzzle?: Record<string, unknown> } | undefined)?.puzzle;
  if (!raw || typeof raw !== 'object') return EMPTY;
  const paused: Record<string, number[]> = {};
  if (raw.paused && typeof raw.paused === 'object') {
    for (const [id, v] of Object.entries(raw.paused as Record<string, unknown>)) {
      const f = Array.isArray(v) ? parseFound(v, 0) : parseFound(undefined, v);
      if (f.length > 0 && f.length < PIECES_PER_PUZZLE) paused[id] = f;
    }
  }
  const found = parseFound(raw.found, raw.piecesFound);
  return {
    currentPuzzleId: typeof raw.currentPuzzleId === 'string' ? raw.currentPuzzleId : null,
    piecesFound: found.length,
    found,
    nextPiece: isPieceIndex(raw.nextPiece) && !found.includes(raw.nextPiece) ? raw.nextPiece : null,
    completedPuzzleIds: Array.isArray(raw.completedPuzzleIds)
      ? raw.completedPuzzleIds.filter((id): id is string => typeof id === 'string')
      : [],
    paused,
    unlocked: Array.isArray(raw.unlocked) ? raw.unlocked.filter((id): id is string => typeof id === 'string') : [],
    keys: Number.isInteger(raw.keys) && (raw.keys as number) > 0 ? (raw.keys as number) : 0,
    friends: Array.isArray(raw.friends) ? raw.friends.filter((id): id is string => typeof id === 'string') : [],
  };
}

// A puzzle is open if it's a free starter, was bought, or the kid has
// already played it (so nothing started before prices existed gets locked).
export function isPuzzleUnlocked(progress: Progress, puzzle: Puzzle): boolean {
  return Boolean(puzzle.free)
    || progress.unlocked.includes(puzzle.id)
    || progress.currentPuzzleId === puzzle.id
    || Boolean(progress.paused[puzzle.id])
    || progress.completedPuzzleIds.includes(puzzle.id);
}

export function hasLockedPuzzles(progress: Progress): boolean {
  return PUZZLES.some((p) => !p.retired && !isPuzzleUnlocked(progress, p));
}

// Unlock with a key if asked (and one is held), otherwise with points.
// Returns null when the kid can't afford it.
export function unlockPuzzle(
  progress: Progress, puzzleId: string, points: number, useKey: boolean,
): { next: Progress; cost: number } | null {
  if (progress.unlocked.includes(puzzleId)) return { next: progress, cost: 0 };
  const unlocked = [...progress.unlocked, puzzleId];
  if (useKey) {
    return progress.keys > 0 ? { next: { ...progress, unlocked, keys: progress.keys - 1 }, cost: 0 } : null;
  }
  return points >= PUZZLE_UNLOCK_COST ? { next: { ...progress, unlocked }, cost: PUZZLE_UNLOCK_COST } : null;
}

export function addPuzzleKey(progress: Progress): Progress {
  return { ...progress, keys: progress.keys + 1 };
}

export function withPuzzleProgress(child: Pick<Child, 'modeProgress'>, progress: PuzzleProgress): Record<string, unknown> {
  return { ...(child.modeProgress ?? {}), puzzle: progress };
}

export function isPuzzleFinished(progress: Progress): boolean {
  return progress.currentPuzzleId !== null && progress.found.length >= PIECES_PER_PUZZLE;
}

// The piece the next brush will find: the kid's pick, else the first missing one.
export function getNextPiece(progress: Progress): number {
  if (progress.nextPiece !== null && !progress.found.includes(progress.nextPiece)) return progress.nextPiece;
  for (let i = 0; i < PIECES_PER_PUZZLE; i++) if (!progress.found.includes(i)) return i;
  return PIECES_PER_PUZZLE - 1;
}

export function choosePiece(progress: Progress, index: number): Progress {
  if (!isPieceIndex(index) || progress.found.includes(index)) return progress;
  return { ...progress, nextPiece: index };
}

// How many pieces this kid has of any puzzle (current, set aside, or done).
export function piecesFoundIn(progress: Progress, puzzleId: string): number {
  if (progress.currentPuzzleId === puzzleId) return progress.found.length;
  if (progress.paused[puzzleId]) return progress.paused[puzzleId].length;
  return progress.completedPuzzleIds.includes(puzzleId) ? PIECES_PER_PUZZLE : 0;
}

export interface PuzzleChoice {
  puzzle: Puzzle;
  note: string | null;   // e.g. "Sam is doing this one"
  piecesFound: number;   // this kid's pieces of it (9 when done before)
  current: boolean;      // the puzzle the kid is on now
  done: boolean;         // finished before
  locked: boolean;       // needs points or a key
}

interface Sibling { name: string; progress: Progress }

// Every puzzle, for the picker. Order: the one being played, ones set aside
// mid-way, then open puzzles nobody in the family has done (so siblings
// spread out), ones a sibling finished, ones a sibling is on now, locked
// ones, and finally this kid's finished ones.
export function getPuzzleChoices(progress: Progress, siblings: Sibling[] = []): PuzzleChoice[] {
  const mine = new Set(progress.completedPuzzleIds);
  const siblingDoing = (id: string) =>
    siblings.find((s) => s.progress.currentPuzzleId === id && !isPuzzleFinished(s.progress));
  const noteFor = (id: string): string | null => {
    const doing = siblingDoing(id);
    if (doing) return `${doing.name} is doing this one`;
    const done = siblings.find((s) => s.progress.completedPuzzleIds.includes(id));
    return done ? `${done.name} finished this one` : null;
  };
  const isCurrent = (id: string) => progress.currentPuzzleId === id && !isPuzzleFinished(progress);
  const rank = (p: Puzzle) =>
    isCurrent(p.id) ? 0
      : progress.paused[p.id] ? 1
        : mine.has(p.id) ? 6
          : !isPuzzleUnlocked(progress, p) ? 5
          : siblingDoing(p.id) ? 4
            : noteFor(p.id) ? 3
              : 2;
  return PUZZLES
    .filter((p) => !p.retired || isCurrent(p.id) || progress.paused[p.id])
    .map((p, i) => ({ p, i, r: rank(p) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(({ p }) => ({
      puzzle: p,
      note: noteFor(p.id),
      piecesFound: isCurrent(p.id) || progress.paused[p.id] ? piecesFoundIn(progress, p.id) : mine.has(p.id) ? PIECES_PER_PUZZLE : 0,
      current: isCurrent(p.id),
      done: mine.has(p.id),
      locked: !isPuzzleUnlocked(progress, p),
    }));
}

// Progress after one brush: the chosen piece is found; the 9th completes the
// puzzle. If it's the piece hiding the puzzle's friend, the friend is collected.
export function addPiece(
  progress: Progress, secretPiece = -1,
): { next: Progress; pieceIndex: number; completed: boolean; foundFriend: boolean } {
  const pieceIndex = getNextPiece(progress);
  const found = progress.found.includes(pieceIndex) ? progress.found : [...progress.found, pieceIndex];
  const completed = found.length >= PIECES_PER_PUZZLE;
  const completedPuzzleIds =
    completed && progress.currentPuzzleId && !progress.completedPuzzleIds.includes(progress.currentPuzzleId)
      ? [...progress.completedPuzzleIds, progress.currentPuzzleId]
      : progress.completedPuzzleIds;
  const id = progress.currentPuzzleId;
  const foundFriend = pieceIndex === secretPiece && id !== null && !progress.friends.includes(id);
  const friends = foundFriend && id ? [...progress.friends, id] : progress.friends;
  return {
    next: { ...progress, found, piecesFound: found.length, nextPiece: null, completedPuzzleIds, friends },
    pieceIndex,
    completed,
    foundFriend,
  };
}

// Start (or go back to) a puzzle. Switching away from an unfinished puzzle
// keeps its pieces, so coming back picks up where the kid left off.
export function startPuzzle(progress: Progress, puzzleId: string): Progress {
  const paused = { ...progress.paused };
  const current = progress.currentPuzzleId;
  if (current && current !== puzzleId && progress.found.length > 0 && !isPuzzleFinished(progress)) {
    paused[current] = progress.found;
  }
  const found = paused[puzzleId] ?? [];
  delete paused[puzzleId];
  return { ...progress, currentPuzzleId: puzzleId, found, piecesFound: found.length, nextPiece: null, paused };
}
