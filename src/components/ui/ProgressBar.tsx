import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number; // 0 to 1
  showTime?: boolean;
  timeRemaining?: string;
  className?: string;
}

export function ProgressBar({
  progress,
  showTime = false,
  timeRemaining,
  className = '',
}: ProgressBarProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="relative h-4 bg-white/30 rounded-full overflow-hidden shadow-inner">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-success rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute inset-y-0 left-0 bg-white/20 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
          }}
        />
      </div>
      {showTime && timeRemaining && (
        <div className="text-center mt-2">
          <span className="text-white/90 font-bold text-lg">{timeRemaining}</span>
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
