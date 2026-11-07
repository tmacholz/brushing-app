import { motion } from 'framer-motion';
import { PUZZLE_UNLOCK_COST, type Puzzle } from '../../data/puzzles';

interface UnlockPuzzleModalProps {
  puzzle: Puzzle;
  points: number;
  keys: number;
  onUnlock: (useKey: boolean) => void;
  onClose: () => void;
}

// Buy a locked puzzle with points, or spend a key won on the bonus wheel.
export function UnlockPuzzleModal({ puzzle, points, keys, onUnlock, onClose }: UnlockPuzzleModalProps) {
  const canPay = points >= PUZZLE_UNLOCK_COST;
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Unlock ${puzzle.title}`}
        className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl"
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-24 h-24 mx-auto rounded-2xl bg-cover bg-center grid place-items-center text-4xl mb-3"
          style={{ backgroundImage: `url(${puzzle.thumb})` }}
        >
          🔒
        </div>
        <h2 className="text-2xl font-bold text-text">{puzzle.title}</h2>
        <p className="text-lg tracking-wide my-2">{puzzle.pieces.slice(0, 5).map((x) => x.emoji).join(' ')}</p>

        <div className="flex flex-col gap-3 mt-4">
          {keys > 0 && (
            <button
              onClick={() => onUnlock(true)}
              className="py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-lg shadow"
            >
              Use a 🔑 key{keys > 1 ? ` (you have ${keys})` : ''}
            </button>
          )}
          <button
            onClick={() => canPay && onUnlock(false)}
            disabled={!canPay}
            className={`py-3 rounded-2xl font-bold text-lg shadow ${canPay ? 'bg-primary text-white' : 'bg-slate-200 text-text/50'}`}
          >
            {canPay ? `Unlock for ${PUZZLE_UNLOCK_COST} ⭐` : `Need ${PUZZLE_UNLOCK_COST - points} more ⭐`}
          </button>
          <p className="text-sm text-text/60">You have {points} ⭐</p>
          <button onClick={onClose} className="py-2 font-semibold text-text/70">Not now</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
