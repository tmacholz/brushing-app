import type { Child, PuzzleProgress } from '../types';
import { PUZZLES, PIECES_PER_PUZZLE, type Puzzle } from '../data/puzzles';

const EMPTY: PuzzleProgress = { currentPuzzleId: null, piecesFound: 0, completedPuzzleIds: [] };

// modeProgress is free-form JSON from the server, so read it defensively.
export function getPuzzleProgress(child: Pick<Child, 'modeProgress'> | null | undefined): PuzzleProgress {
  const raw = (child?.modeProgress as { puzzle?: Partial<PuzzleProgress> } | undefined)?.puzzle;
  if (!raw || typeof raw !== 'object') return EMPTY;
  const found = Number(raw.piecesFound);
  return {
    currentPuzzleId: typeof raw.currentPuzzleId === 'string' ? raw.currentPuzzleId : null,
    piecesFound: Number.isFinite(found) ? Math.max(0, Math.min(PIECES_PER_PUZZLE, Math.floor(found))) : 0,
    completedPuzzleIds: Array.isArray(raw.completedPuzzleIds)
      ? raw.completedPuzzleIds.filter((id): id is string => typeof id === 'string')
      : [],
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
}

interface Sibling { name: string; progress: PuzzleProgress }

// Up to three puzzles to choose from. Puzzles nobody in the family has done
// come first, so siblings don't all end up on the same pictures; then ones a
// sibling has done or is doing (labelled); then this kid's own repeats.
export function getPuzzleChoices(progress: PuzzleProgress, siblings: Sibling[] = [], count = 3): PuzzleChoice[] {
  const mine = new Set(progress.completedPuzzleIds);
  const noteFor = (id: string): string | null => {
    const doing = siblings.find((s) => s.progress.currentPuzzleId === id && !isPuzzleFinished(s.progress));
    if (doing) return `${doing.name} is doing this one`;
    const done = siblings.find((s) => s.progress.completedPuzzleIds.includes(id));
    return done ? `${done.name} finished this one` : null;
  };
  const rank = (p: Puzzle) => (mine.has(p.id) ? 2 : noteFor(p.id) ? 1 : 0);
  return PUZZLES
    .filter((p) => !p.retired && p.id !== progress.currentPuzzleId)
    .map((p, i) => ({ p, i, r: rank(p) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, count)
    .map(({ p }) => ({ puzzle: p, note: noteFor(p.id) }));
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

export function startPuzzle(progress: PuzzleProgress, puzzleId: string): PuzzleProgress {
  return { ...progress, currentPuzzleId: puzzleId, piecesFound: 0 };
}
