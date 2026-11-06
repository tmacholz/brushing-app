import type { Child, PuzzleProgress } from '../types';
import { PUZZLES, PIECES_PER_PUZZLE, type Puzzle } from '../data/puzzles';

const EMPTY: PuzzleProgress = { currentPuzzleId: null, piecesFound: 0, completedPuzzleIds: [], paused: {} };

const clampPieces = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(PIECES_PER_PUZZLE, Math.floor(v))) : 0;
};

// modeProgress is free-form JSON from the server, so read it defensively.
export function getPuzzleProgress(child: Pick<Child, 'modeProgress'> | null | undefined): PuzzleProgress {
  const raw = (child?.modeProgress as { puzzle?: Partial<PuzzleProgress> } | undefined)?.puzzle;
  if (!raw || typeof raw !== 'object') return EMPTY;
  const paused: Record<string, number> = {};
  if (raw.paused && typeof raw.paused === 'object') {
    for (const [id, n] of Object.entries(raw.paused)) {
      const pieces = clampPieces(n);
      if (pieces > 0 && pieces < PIECES_PER_PUZZLE) paused[id] = pieces;
    }
  }
  return {
    currentPuzzleId: typeof raw.currentPuzzleId === 'string' ? raw.currentPuzzleId : null,
    piecesFound: clampPieces(raw.piecesFound),
    completedPuzzleIds: Array.isArray(raw.completedPuzzleIds)
      ? raw.completedPuzzleIds.filter((id): id is string => typeof id === 'string')
      : [],
    paused,
  };
}

export function withPuzzleProgress(child: Pick<Child, 'modeProgress'>, progress: PuzzleProgress): Record<string, unknown> {
  return { ...(child.modeProgress ?? {}), puzzle: progress };
}

export function isPuzzleFinished(progress: PuzzleProgress): boolean {
  return progress.currentPuzzleId !== null && progress.piecesFound >= PIECES_PER_PUZZLE;
}

export interface PuzzleChoice {
  puzzle: Puzzle;
  note: string | null; // e.g. "Sam is doing this one"
  piecesFound: number; // > 0 when this kid set it aside mid-way
}

interface Sibling { name: string; progress: PuzzleProgress }

// Up to three puzzles to choose from. Puzzles nobody in the family has done
// come first, so siblings don't all end up on the same pictures; then ones a
// sibling finished, then ones a sibling is doing (labelled); then repeats.
export function getPuzzleChoices(progress: PuzzleProgress, siblings: Sibling[] = [], count = 3): PuzzleChoice[] {
  const mine = new Set(progress.completedPuzzleIds);
  const noteFor = (id: string): string | null => {
    const doing = siblings.find((s) => s.progress.currentPuzzleId === id && !isPuzzleFinished(s.progress));
    if (doing) return `${doing.name} is doing this one`;
    const done = siblings.find((s) => s.progress.completedPuzzleIds.includes(id));
    return done ? `${done.name} finished this one` : null;
  };
  const siblingDoing = (id: string) =>
    siblings.some((s) => s.progress.currentPuzzleId === id && !isPuzzleFinished(s.progress));
  // 0 fresh for the family, 1 a sibling already finished it, 2 a sibling is on
  // it right now, 3 this kid has done it before.
  const rank = (p: Puzzle) => (mine.has(p.id) ? 3 : siblingDoing(p.id) ? 2 : noteFor(p.id) ? 1 : 0);
  return PUZZLES
    .filter((p) => !p.retired && p.id !== progress.currentPuzzleId)
    .map((p, i) => ({ p, i, r: rank(p) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, count)
    .map(({ p }) => ({ puzzle: p, note: noteFor(p.id), piecesFound: progress.paused?.[p.id] ?? 0 }));
}

// Progress after one brush: one more piece; the 9th completes the puzzle.
export function addPiece(progress: PuzzleProgress): { next: PuzzleProgress; pieceIndex: number; completed: boolean } {
  const pieceIndex = progress.piecesFound;
  const piecesFound = Math.min(PIECES_PER_PUZZLE, pieceIndex + 1);
  const completed = piecesFound >= PIECES_PER_PUZZLE;
  const completedPuzzleIds =
    completed && progress.currentPuzzleId && !progress.completedPuzzleIds.includes(progress.currentPuzzleId)
      ? [...progress.completedPuzzleIds, progress.currentPuzzleId]
      : progress.completedPuzzleIds;
  return { next: { ...progress, piecesFound, completedPuzzleIds }, pieceIndex, completed };
}

// Start (or go back to) a puzzle. Switching away from an unfinished puzzle
// keeps its pieces, so coming back picks up where the kid left off.
export function startPuzzle(progress: PuzzleProgress, puzzleId: string): PuzzleProgress {
  const paused = { ...(progress.paused ?? {}) };
  const current = progress.currentPuzzleId;
  if (current && current !== puzzleId && progress.piecesFound > 0 && !isPuzzleFinished(progress)) {
    paused[current] = progress.piecesFound;
  }
  const piecesFound = paused[puzzleId] ?? 0;
  delete paused[puzzleId];
  return { ...progress, currentPuzzleId: puzzleId, piecesFound, paused };
}
