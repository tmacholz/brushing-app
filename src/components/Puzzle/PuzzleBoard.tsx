import { motion } from 'framer-motion';
import type { Puzzle } from '../../data/puzzles';
import { PIECES_PER_PUZZLE } from '../../data/puzzles';
import { PieceArt } from './PuzzleArt';

interface PuzzleBoardProps {
  puzzle: Puzzle;
  piecesFound: number;
  justAdded?: number | null; // piece index that should animate in
  size?: string;             // CSS width of the board
}

// The 3x3 board. Found pieces show their art, the rest are mystery tiles,
// the next one glows. When all nine are found the gaps close into one picture.
export function PuzzleBoard({ puzzle, piecesFound, justAdded = null, size = 'min(86vw, 52vh, 440px)' }: PuzzleBoardProps) {
  const complete = piecesFound >= PIECES_PER_PUZZLE;
  return (
    <motion.div
      className="grid grid-cols-3 rounded-3xl overflow-hidden shadow-xl bg-slate-300 mx-auto"
      style={{ width: size, aspectRatio: '1' }}
      initial={false}
      animate={{ gap: complete ? 0 : 5, padding: complete ? 0 : 5 }}
      transition={{ duration: 0.8, delay: complete ? 0.6 : 0 }}
    >
      {puzzle.pieces.map((p, i) => {
        const have = i < piecesFound;
        const isNext = i === piecesFound && !complete;
        return (
          <div
            key={i}
            className={`relative overflow-hidden ${complete ? '' : 'rounded-xl'} ${isNext ? 'ring-4 ring-amber-300 animate-pulse' : ''}`}
          >
            {have ? (
              <motion.div
                className="absolute inset-0"
                initial={i === justAdded ? { scale: 1.8, opacity: 0, rotate: -10 } : false}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 16, delay: i === justAdded ? 0.35 : 0 }}
              >
                <PieceArt puzzle={puzzle} index={i} />
              </motion.div>
            ) : (
              <PieceArt puzzle={puzzle} index={i} mystery />
            )}
            <span className="sr-only">{have ? p.name : 'Mystery piece'}</span>
          </div>
        );
      })}
    </motion.div>
  );
}
