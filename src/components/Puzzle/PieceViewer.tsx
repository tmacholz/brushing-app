import { motion } from 'framer-motion';
import type { Puzzle } from '../../data/puzzles';
import { PieceArt } from './PuzzleArt';
import { FriendBadge } from './FriendBadge';

interface PieceViewerProps {
  puzzle: Puzzle;
  index: number;
  withFriend: boolean;   // this kid found the hidden friend behind this piece
  onClose: () => void;
}

// A found piece, big. Tap anywhere to close.
export function PieceViewer({ puzzle, index, withFriend, onClose }: PieceViewerProps) {
  const piece = puzzle.pieces[index];
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/70 flex flex-col items-center justify-center p-6 gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={piece.name}
    >
      <motion.div
        className="relative rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white"
        style={{ width: 'min(84vw, 60vh, 420px)', aspectRatio: '1' }}
        initial={{ scale: 0.4 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <PieceArt puzzle={puzzle} index={index} />
        {withFriend && (
          <FriendBadge puzzle={puzzle} className="absolute bottom-3 right-3 w-[32%] h-[32%] ring-4 ring-white shadow-lg text-4xl" />
        )}
      </motion.div>
      <p className="text-2xl font-black text-white text-center">
        {piece.emoji} {piece.name}
      </p>
      {withFriend && (
        <p className="text-base font-semibold text-violet-200 text-center">with {puzzle.friend.name}</p>
      )}
      <button onClick={onClose} className="mt-2 px-8 py-3 rounded-full bg-white text-text font-bold">Close</button>
    </motion.div>
  );
}
