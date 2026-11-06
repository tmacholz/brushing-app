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

// Up to three puzzles to choose from: unfinished ones first, then repeats so
// a kid who has done them all can still play.
export function getPuzzleChoices(progress: PuzzleProgress, count = 3): Puzzle[] {
  const done = new Set(progress.completedPuzzleIds);
  const fresh = PUZZLES.filter((p) => !done.has(p.id) && p.id !== progress.currentPuzzleId);
  const repeats = PUZZLES.filter((p) => done.has(p.id) && p.id !== progress.currentPuzzleId);
  return [...fresh, ...repeats].slice(0, count);
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
