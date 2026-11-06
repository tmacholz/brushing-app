import { BookOpen, Puzzle } from 'lucide-react';
import type { PlayMode } from '../../types';

interface PlayModeToggleProps {
  mode: PlayMode;
  onChange: (mode: PlayMode) => void;
  compact?: boolean;
}

const OPTIONS: { mode: PlayMode; label: string; Icon: typeof BookOpen }[] = [
  { mode: 'story', label: 'Story', Icon: BookOpen },
  { mode: 'puzzle', label: 'Puzzle', Icon: Puzzle },
];

// "Way to play" switch, used on Home (kids) and in Settings (parents).
export function PlayModeToggle({ mode, onChange, compact = false }: PlayModeToggleProps) {
  return (
    <div role="radiogroup" aria-label="Way to play" className="flex bg-white rounded-full p-1 shadow-sm">
      {OPTIONS.map(({ mode: m, label, Icon }) => {
        const active = m === mode;
        return (
          <button
            key={m}
            role="radio"
            aria-checked={active}
            onClick={() => !active && onChange(m)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full font-bold transition-colors ${
              compact ? 'py-1.5 px-3 text-sm' : 'py-2.5 px-4'
            } ${active ? 'bg-primary text-white' : 'text-text/60'}`}
          >
            <Icon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
