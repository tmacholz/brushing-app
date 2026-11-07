import { motion } from 'framer-motion';
import { PIECES_PER_PUZZLE, PUZZLE_UNLOCK_COST, type Puzzle } from '../../data/puzzles';
import type { PuzzleChoice } from '../../utils/puzzleProgress';

interface PuzzleChooserProps {
  choices: PuzzleChoice[];
  onChoose: (puzzle: Puzzle) => void;
}

// Every puzzle, each with a progress bar. Unfinished previews are blurred so
// the picture stays a surprise; finished ones show the whole picture.
export function PuzzleChooser({ choices, onChoose }: PuzzleChooserProps) {
  return (
    <div className="grid gap-3">
      {choices.map(({ puzzle: p, note, piecesFound, current, done, locked }, i) => {
        const pct = Math.round((piecesFound / PIECES_PER_PUZZLE) * 100);
        const status = locked
          ? null
          : current
          ? 'Playing now'
          : piecesFound > 0 && piecesFound < PIECES_PER_PUZZLE
            ? 'Keep going'
            : done ? 'Done! Play again?' : null;
        return (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChoose(p)}
            className={`flex items-center gap-3 rounded-2xl p-3 shadow-sm text-left ${locked ? 'bg-white/70' : 'bg-white'} ${current ? 'ring-2 ring-primary' : ''}`}
          >
            <div
              className="w-16 h-16 rounded-xl bg-cover bg-center shrink-0 grid place-items-center text-white font-black text-xl"
              style={{ backgroundImage: `url(${done ? p.image : p.thumb})` }}
            >
              {locked ? '🔒' : done ? '' : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-text flex items-baseline gap-2">
                <span className="truncate">{p.title}</span>
                {status && (
                  <span className={`text-xs font-medium shrink-0 ${done && !current && piecesFound >= PIECES_PER_PUZZLE ? 'text-success' : 'text-amber-600'}`}>
                    {status}
                  </span>
                )}
              </p>
              {note && <p className="text-xs font-medium text-secondary">{note}</p>}
              {locked ? (
                <p className="mt-1 text-sm font-bold text-amber-600">Unlock for {PUZZLE_UNLOCK_COST} ⭐</p>
              ) : (
              <div className="mt-1.5 flex items-center gap-2">
                <div
                  className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={PIECES_PER_PUZZLE}
                  aria-valuenow={piecesFound}
                  aria-label={`${piecesFound} of ${PIECES_PER_PUZZLE} pieces found`}
                >
                  <div
                    className={`h-full rounded-full ${piecesFound >= PIECES_PER_PUZZLE ? 'bg-success' : 'bg-amber-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-text/60 tabular-nums">{piecesFound}/{PIECES_PER_PUZZLE}</span>
              </div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
