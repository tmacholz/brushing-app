import { motion } from 'framer-motion';
import type { Puzzle } from '../../data/puzzles';
import type { PuzzleChoice } from '../../utils/puzzleProgress';

interface PuzzleChooserProps {
  choices: PuzzleChoice[];
  completedIds: string[];
  onChoose: (puzzle: Puzzle) => void;
}

// Kids pick their next puzzle. Previews are blurred so the picture is still a
// surprise; the emojis hint at who's hiding inside.
export function PuzzleChooser({ choices, completedIds, onChoose }: PuzzleChooserProps) {
  return (
    <div className="grid gap-3">
      {choices.map(({ puzzle: p, note }, i) => (
        <motion.button
          key={p.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.08 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onChoose(p)}
          className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm text-left"
        >
          <div
            className="w-16 h-16 rounded-xl bg-cover bg-center shrink-0 grid place-items-center text-white font-black text-xl"
            style={{ backgroundImage: `url(${p.thumb})` }}
          >
            ?
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-text">
              {p.title}
              {completedIds.includes(p.id) && <span className="ml-2 text-xs font-medium text-success">Done before</span>}
            </p>
            {note && <p className="text-xs font-medium text-secondary">{note}</p>}
            <p className="text-lg tracking-wide">{p.pieces.slice(0, 4).map((x) => x.emoji).join(' ')} …</p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
