import { useState } from 'react';
import type { Puzzle } from '../../data/puzzles';

interface FriendBadgeProps {
  puzzle: Puzzle;
  className?: string; // size, ring and emoji text size
  hidden?: boolean;   // not found yet: a mystery bubble
}

// A puzzle's hidden friend in a round frame. Falls back to its emoji if the
// art hasn't been made yet.
export function FriendBadge({ puzzle, className = '', hidden = false }: FriendBadgeProps) {
  const [broken, setBroken] = useState(false);
  const { friend } = puzzle;
  if (hidden) {
    return (
      <div className={`rounded-full bg-violet-100 grid place-items-center font-black text-violet-300 ${className}`} aria-label="Hidden friend not found yet">
        ?
      </div>
    );
  }
  return (
    <div className={`rounded-full overflow-hidden bg-amber-50 grid place-items-center ${className}`}>
      {broken ? (
        <span aria-label={friend.name}>{friend.emoji}</span>
      ) : (
        <img src={friend.image} alt={friend.name} className="w-full h-full object-cover" onError={() => setBroken(true)} />
      )}
    </div>
  );
}
