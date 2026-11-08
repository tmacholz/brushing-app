import { motion } from 'framer-motion';
import { PUZZLE_UNLOCK_COST, type Puzzle } from '../../data/puzzles';

interface UnlockPuzzleModalProps {
  puzzle: Puzzle;
  points: number;
  keys: number;
  toFinish: number;    // secret puzzles: puzzles still to finish before a key works
  onUnlock: (useKey: boolean) => void;
  onClose: () => void;
}

// Buy a locked puzzle with points, or spend a key won on the bonus wheel.
export function UnlockPuzzleModal({ puzzle, points, keys, toFinish, onUnlock, onClose }: UnlockPuzzleModalProps) {
  const canPay = points >= PUZZLE_UNLOCK_COST;
  // Secret puzzles open only with a key, once enough puzzles are finished.
  const secret = Boolean(puzzle.keyAfter);
  const keyReady = !secret || toFinish === 0;
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
          {secret ? '🗝️' : '🔒'}
        </div>
        {secret && <p className="text-xs font-black tracking-widest text-violet-600 uppercase">Secret puzzle</p>}
        <h2 className="text-2xl font-bold text-text">{puzzle.title}</h2>
        <p className="text-lg tracking-wide my-2">{puzzle.pieces.slice(0, 5).map((x) => x.emoji).join(' ')}</p>

        <div className="flex flex-col gap-3 mt-4">
          {secret && !keyReady && (
            <p className="py-3 px-2 rounded-2xl bg-violet-50 text-violet-700 font-bold">
              Finish {toFinish} more puzzle{toFinish > 1 ? 's' : ''}, then open it with a 🔑 key!
            </p>
          )}
          {secret && keyReady && keys === 0 && (
            <p className="py-3 px-2 rounded-2xl bg-violet-50 text-violet-700 font-bold">
              Only a 🔑 key opens this one. Spin the bonus wheel to win a key!
            </p>
          )}
          {keyReady && keys > 0 && (
            <button
              onClick={() => onUnlock(true)}
              className="py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-lg shadow"
            >
              Use a 🔑 key{keys > 1 ? ` (you have ${keys})` : ''}
            </button>
          )}
          {!secret && (
          <button
            onClick={() => canPay && onUnlock(false)}
            disabled={!canPay}
            className={`py-3 rounded-2xl font-bold text-lg shadow ${canPay ? 'bg-primary text-white' : 'bg-slate-200 text-text/50'}`}
          >
            {canPay ? `Unlock for ${PUZZLE_UNLOCK_COST} ⭐` : `Need ${PUZZLE_UNLOCK_COST - points} more ⭐`}
          </button>
          )}
          {secret
            ? <p className="text-sm text-text/60">You have {keys} 🔑</p>
            : <p className="text-sm text-text/60">You have {points} ⭐</p>}
          <button onClick={onClose} className="py-2 font-semibold text-text/70">Not now</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
