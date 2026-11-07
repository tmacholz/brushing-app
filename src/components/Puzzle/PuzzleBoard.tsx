import { motion } from 'framer-motion';
import type { Puzzle } from '../../data/puzzles';
import { PIECES_PER_PUZZLE } from '../../data/puzzles';
import { PieceArt } from './PuzzleArt';
import { FriendBadge } from './FriendBadge';

interface PuzzleBoardProps {
  puzzle: Puzzle;
  found: number[];            // which pieces are found (0-8, row-major)
  nextPiece?: number | null;  // the mystery square that glows as "next"
  onPick?: (index: number) => void; // tap a mystery square to make it next
  justAdded?: number | null;  // piece index that should animate in
  friendAt?: number | null;   // piece where this kid found the hidden friend
  size?: string;              // CSS width of the board
}

// The 3x3 board. Found pieces show their art, the rest are mystery tiles,
// the next one glows. When all nine are found the gaps close into one picture.
export function PuzzleBoard({ puzzle, found, nextPiece = null, onPick, justAdded = null, friendAt = null, size = 'min(86vw, 52vh, 440px)' }: PuzzleBoardProps) {
  const complete = found.length >= PIECES_PER_PUZZLE;
  return (
    <motion.div
      className="grid grid-cols-3 rounded-3xl overflow-hidden shadow-xl bg-slate-300 mx-auto"
      style={{ width: size, aspectRatio: '1' }}
      initial={false}
      animate={{ gap: complete ? 0 : 5, padding: complete ? 0 : 5 }}
      transition={{ duration: 0.8, delay: complete ? 0.6 : 0 }}
    >
      {puzzle.pieces.map((p, i) => {
        const have = found.includes(i);
        const isNext = i === nextPiece && !complete;
        const tileClass = `relative overflow-hidden ${complete ? '' : 'rounded-xl'} ${isNext ? 'ring-4 ring-amber-300 animate-pulse' : ''}`;
        if (have) {
          return (
            <div key={i} className={tileClass}>
              <motion.div
                className="absolute inset-0"
                initial={i === justAdded ? { scale: 1.8, opacity: 0, rotate: -10 } : false}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 16, delay: i === justAdded ? 0.35 : 0 }}
              >
                <PieceArt puzzle={puzzle} index={i} />
              </motion.div>
              {i === friendAt && (
                <FriendBadge puzzle={puzzle} className="absolute bottom-1 right-1 w-[38%] h-[38%] ring-2 ring-white shadow-md text-xl" />
              )}
              <span className="sr-only">{p.name}{i === friendAt ? `, with ${puzzle.friend.name}` : ''}</span>
            </div>
          );
        }
        return onPick ? (
          <button
            key={i}
            type="button"
            onClick={() => onPick(i)}
            aria-pressed={isNext}
            aria-label={isNext ? 'Mystery piece, finding this one next' : 'Mystery piece, find this one next'}
            className={`${tileClass} active:scale-95 transition-transform`}
          >
            <PieceArt puzzle={puzzle} index={i} mystery />
          </button>
        ) : (
          <div key={i} className={tileClass}>
            <PieceArt puzzle={puzzle} index={i} mystery />
            <span className="sr-only">Mystery piece</span>
          </div>
        );
      })}
    </motion.div>
  );
}
