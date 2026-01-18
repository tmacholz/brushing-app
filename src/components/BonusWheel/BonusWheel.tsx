import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChestReward } from '../../types';
import { generateChestReward, getRewardDisplayInfo } from '../../services/rewardGenerator';
import { useAudio } from '../../context/AudioContext';

interface BonusWheelProps {
  tokensAvailable: number;
  worldId?: string;
  collectedStickers?: string[];
  collectedAccessories?: string[];
  onRewardClaimed: (reward: ChestReward) => void;
  onComplete: () => void;
}

// Wheel segments configuration
const WHEEL_SEGMENTS = [
  { label: '5 pts', emoji: '⭐', color: '#fbbf24' },
  { label: 'Sticker', emoji: '🎨', color: '#f472b6' },
  { label: '10 pts', emoji: '⭐', color: '#fb923c' },
  { label: 'Rare!', emoji: '✨', color: '#a78bfa' },
  { label: '15 pts', emoji: '⭐', color: '#fcd34d' },
  { label: 'Sticker', emoji: '🎨', color: '#f9a8d4' },
  { label: '25 pts', emoji: '🌟', color: '#fb7185' },
  { label: 'Bonus!', emoji: '🎁', color: '#22d3ee' },
];

const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;

type WheelPhase = 'ready' | 'spinning' | 'revealed' | 'complete';

export function BonusWheel({
  tokensAvailable,
  worldId,
  collectedStickers = [],
  collectedAccessories = [],
  onRewardClaimed,
  onComplete,
}: BonusWheelProps) {
  const { playSound } = useAudio();
  const [phase, setPhase] = useState<WheelPhase>('ready');
  const [tokensRemaining, setTokensRemaining] = useState(tokensAvailable);
  const [currentReward, setCurrentReward] = useState<ChestReward | null>(null);
  const [allRewards, setAllRewards] = useState<ChestReward[]>([]);
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const spinCountRef = useRef(0);

  // Track collected items as we claim them
  const [localCollectedStickers, setLocalCollectedStickers] = useState(collectedStickers);
  const [localCollectedAccessories, setLocalCollectedAccessories] = useState(collectedAccessories);

  const doSpin = useCallback(async () => {
    if (tokensRemaining <= 0 || isAnimating) return;

    const isSubsequentSpin = spinCountRef.current > 0;

    setPhase('spinning');
    setIsAnimating(true);
    playSound('chapterStart');

    try {
      // For subsequent spins, reset rotation to 0 and wait for wheel to animate in
      if (isSubsequentSpin) {
        setRotation(0); // Reset to 0 so each spin has same starting point
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Generate the reward first so we know what we're landing on
      const reward = await generateChestReward(
        worldId,
        localCollectedStickers,
        localCollectedAccessories
      );

      // Calculate spin: 4-6 full rotations + random final position
      // Always spin the same amount (from 0 to target) for consistent speed
      const spins = 4 + Math.floor(Math.random() * 3);
      const segmentIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
      const newRotation = (spins * 360) + (segmentIndex * SEGMENT_ANGLE) + (SEGMENT_ANGLE / 2);

      setRotation(newRotation);

      // Wait for animation to complete (4 seconds)
      await new Promise(resolve => setTimeout(resolve, 4000));

      setCurrentReward(reward);
      setAllRewards(prev => [...prev, reward]);
      setPhase('revealed');
      setIsAnimating(false);
      playSound('success');

      // Update local collected state for subsequent spins
      if (reward.type === 'sticker' && reward.isNew) {
        setLocalCollectedStickers(prev => [...prev, reward.collectible.id]);
      } else if (reward.type === 'accessory' && reward.isNew) {
        setLocalCollectedAccessories(prev => [...prev, reward.collectible.id]);
      }

      // Claim the reward
      onRewardClaimed(reward);
      spinCountRef.current += 1;

    } catch (error) {
      console.error('Error generating reward:', error);
      setIsAnimating(false);
      const fallbackReward: ChestReward = { type: 'points', amount: 5 };
      setCurrentReward(fallbackReward);
      setAllRewards(prev => [...prev, fallbackReward]);
      setPhase('revealed');
      onRewardClaimed(fallbackReward);
    }
  }, [tokensRemaining, isAnimating, worldId, localCollectedStickers, localCollectedAccessories, playSound, onRewardClaimed]);

  const handleSpin = () => {
    if (phase !== 'ready') return;
    doSpin();
  };

  const handleContinue = useCallback(() => {
    const newTokensRemaining = tokensRemaining - 1;
    setTokensRemaining(newTokensRemaining);
    setCurrentReward(null);

    if (newTokensRemaining > 0) {
      // Go to spinning state for subsequent spins (skip the ready/tap screen)
      setPhase('spinning');
      playSound('storyTransition');
    } else {
      setPhase('complete');
    }
  }, [tokensRemaining, playSound]);

  // Auto-spin when entering spinning phase (for subsequent spins)
  useEffect(() => {
    if (phase === 'spinning' && !isAnimating) {
      doSpin();
    }
  }, [phase, isAnimating, doSpin]);

  const displayInfo = currentReward ? getRewardDisplayInfo(currentReward) : null;

  // Calculate total points earned
  const totalPointsEarned = allRewards.reduce((sum, r) => {
    if (r.type === 'points') return sum + r.amount;
    return sum;
  }, 0);

  const newItemsEarned = allRewards.filter(
    r => r.type !== 'points' && r.isNew
  ).length;

  // Render the wheel SVG
  const renderWheel = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {WHEEL_SEGMENTS.map((segment, index) => {
        const startAngle = index * SEGMENT_ANGLE - 90;
        const endAngle = startAngle + SEGMENT_ANGLE;
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1 = 50 + 45 * Math.cos(startRad);
        const y1 = 50 + 45 * Math.sin(startRad);
        const x2 = 50 + 45 * Math.cos(endRad);
        const y2 = 50 + 45 * Math.sin(endRad);

        const midAngle = ((startAngle + endAngle) / 2 + 90) * (Math.PI / 180);
        const textX = 50 + 30 * Math.cos(midAngle - Math.PI / 2);
        const textY = 50 + 30 * Math.sin(midAngle - Math.PI / 2);

        return (
          <g key={index}>
            <path
              d={`M 50 50 L ${x1} ${y1} A 45 45 0 0 1 ${x2} ${y2} Z`}
              fill={segment.color}
              stroke="white"
              strokeWidth="0.5"
            />
            <text
              x={textX}
              y={textY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="6"
              fontWeight="bold"
              transform={`rotate(${(startAngle + endAngle) / 2 + 90}, ${textX}, ${textY})`}
            >
              {segment.emoji}
            </text>
          </g>
        );
      })}
      {/* Center circle */}
      <circle cx="50" cy="50" r="12" fill="white" stroke="#7c3aed" strokeWidth="2" />
      <text x="50" y="51" textAnchor="middle" dominantBaseline="middle" fontSize="8">
        🎰
      </text>
    </svg>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-violet-600 via-purple-700 to-indigo-800 flex flex-col items-center justify-center p-6 overflow-hidden"
    >
      {/* Sparkle background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-300 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: 0,
            }}
            animate={{
              y: [null, Math.random() * -150],
              opacity: [0, 0.8, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Ready / Spinning - Show Wheel */}
        {(phase === 'ready' || phase === 'spinning') && (
          <motion.div
            key="wheel-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center"
          >
            {/* Tokens remaining */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 bg-yellow-400 text-yellow-900 font-bold py-2 px-4 rounded-full text-lg mb-4"
            >
              <span className="text-xl">🎟️</span>
              {tokensRemaining} {tokensRemaining === 1 ? 'spin' : 'spins'} remaining
            </motion.div>

            {/* Wheel */}
            <div className="relative mb-8">
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[24px] border-t-white drop-shadow-lg" />
              </div>

              {/* Wheel container - single element that animates */}
              <motion.div
                className="relative w-72 h-72 rounded-full shadow-2xl"
                initial={{ rotate: 0 }}
                animate={{ rotate: rotation }}
                transition={{
                  duration: phase === 'spinning' ? 4 : 0,
                  ease: [0.2, 0.8, 0.3, 1],
                }}
              >
                {renderWheel()}
              </motion.div>
            </div>

            {/* Spin button or spinning text */}
            {phase === 'ready' ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSpin}
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-4 px-12 rounded-full text-2xl shadow-lg"
                >
                  Tap to Spin!
                </motion.button>
                <p className="text-white/60 text-sm mt-4">
                  {spinCountRef.current > 0 ? `Spin ${spinCountRef.current + 1} of ${tokensAvailable}` : 'Use your tokens!'}
                </p>
              </>
            ) : (
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="text-white text-xl font-bold"
              >
                Spinning...
              </motion.p>
            )}
          </motion.div>
        )}

        {/* Revealed Reward */}
        {phase === 'revealed' && currentReward && displayInfo && (
          <motion.div
            key="revealed"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 10 }}
            className="text-center"
          >
            {/* Reward card */}
            <motion.div
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', damping: 8 }}
              className={`bg-gradient-to-br ${displayInfo.color} rounded-3xl p-8 shadow-2xl mb-6 relative overflow-hidden`}
            >
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
              />

              {currentReward.type === 'points' ? (
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="text-7xl mb-2"
                >
                  {displayInfo.emoji}
                </motion.div>
              ) : (
                <div className="relative">
                  {currentReward.collectible.imageUrl ? (
                    <img
                      src={currentReward.collectible.imageUrl}
                      alt={currentReward.collectible.displayName}
                      className="w-28 h-28 object-contain mx-auto rounded-2xl"
                    />
                  ) : (
                    <div className="text-7xl">{displayInfo.emoji}</div>
                  )}
                  {currentReward.isNew && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full"
                    >
                      NEW!
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-white mb-2"
            >
              {displayInfo.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/80 text-lg mb-6"
            >
              {displayInfo.subtitle}
            </motion.p>

            {/* Tokens remaining indicator */}
            {tokensRemaining > 1 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-yellow-300 text-sm mb-4"
              >
                🎟️ {tokensRemaining - 1} more {tokensRemaining - 1 === 1 ? 'spin' : 'spins'} remaining!
              </motion.p>
            )}

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleContinue}
              className="bg-white text-purple-700 font-bold py-4 px-10 rounded-full text-xl shadow-lg"
            >
              {tokensRemaining > 1 ? 'Spin Again!' : 'Awesome!'}
            </motion.button>
          </motion.div>
        )}

        {/* Complete - Summary */}
        {phase === 'complete' && (
          <motion.div
            key="complete"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-8xl mb-6"
            >
              🎉
            </motion.div>

            <h2 className="text-3xl font-bold text-white mb-4">Amazing!</h2>

            {/* Summary */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 max-w-sm mx-auto">
              <p className="text-white/70 text-sm mb-3">You won:</p>

              {totalPointsEarned > 0 && (
                <div className="flex items-center justify-center gap-2 text-yellow-300 text-xl font-bold mb-2">
                  <span>⭐</span>
                  <span>+{totalPointsEarned} Points</span>
                </div>
              )}

              {newItemsEarned > 0 && (
                <div className="flex items-center justify-center gap-2 text-pink-300 text-lg mb-2">
                  <span>🎨</span>
                  <span>{newItemsEarned} new {newItemsEarned === 1 ? 'collectible' : 'collectibles'}!</span>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-white/60 text-sm">
                  {allRewards.length} total {allRewards.length === 1 ? 'reward' : 'rewards'} earned
                </p>
              </div>
            </div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onComplete}
              className="bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold py-4 px-12 rounded-full text-xl shadow-lg"
            >
              Done!
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default BonusWheel;
