import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChestReward } from '../../types';
import {
  generateSpecificReward,
  getRewardDisplayInfo,
  getRewardAvailability,
  type RewardAvailability,
} from '../../services/rewardGenerator';
import { useAudio } from '../../context/AudioContext';

interface BonusWheelProps {
  tokensAvailable: number;
  worldId?: string;
  collectedStickers?: string[];
  collectedAccessories?: string[];
  onRewardClaimed: (reward: ChestReward) => void;
  onComplete: () => void;
}

// Segment type definition
interface WheelSegment {
  id: string;
  label: string;
  emoji: string;
  color: string;
  rewardType: 'points' | 'sticker' | 'accessory';
  pointAmount?: number;
}

// Base segments that are always available (points)
const POINT_SEGMENTS: WheelSegment[] = [
  { id: 'pts-5', label: '5 pts', emoji: '⭐', color: '#fbbf24', rewardType: 'points', pointAmount: 5 },
  { id: 'pts-10', label: '10 pts', emoji: '⭐', color: '#fb923c', rewardType: 'points', pointAmount: 10 },
  { id: 'pts-15', label: '15 pts', emoji: '⭐', color: '#fcd34d', rewardType: 'points', pointAmount: 15 },
  { id: 'pts-25', label: '25 pts', emoji: '🌟', color: '#fb7185', rewardType: 'points', pointAmount: 25 },
];

// Sticker segments (only shown if stickers are available)
const STICKER_SEGMENTS: WheelSegment[] = [
  { id: 'sticker-1', label: 'Sticker', emoji: '🎨', color: '#f472b6', rewardType: 'sticker' },
  { id: 'sticker-2', label: 'Sticker', emoji: '🎨', color: '#f9a8d4', rewardType: 'sticker' },
];

// Accessory segment (only shown if accessories are available)
const ACCESSORY_SEGMENT: WheelSegment = {
  id: 'accessory', label: 'Rare!', emoji: '✨', color: '#a78bfa', rewardType: 'accessory',
};

// Bonus segment (extra points, always available)
const BONUS_SEGMENT: WheelSegment = {
  id: 'bonus', label: 'Bonus!', emoji: '🎁', color: '#22d3ee', rewardType: 'points', pointAmount: 20,
};

/**
 * Build wheel segments based on what rewards are available
 */
function buildWheelSegments(availability: RewardAvailability): WheelSegment[] {
  const segments: WheelSegment[] = [];

  // Always include point segments
  segments.push(POINT_SEGMENTS[0]); // 5 pts

  // Add sticker if available
  if (availability.stickersAvailable) {
    segments.push(STICKER_SEGMENTS[0]);
  }

  segments.push(POINT_SEGMENTS[1]); // 10 pts

  // Add accessory or bonus depending on availability
  if (availability.accessoriesAvailable) {
    segments.push(ACCESSORY_SEGMENT);
  } else {
    segments.push(BONUS_SEGMENT);
  }

  segments.push(POINT_SEGMENTS[2]); // 15 pts

  // Add second sticker if available
  if (availability.stickersAvailable) {
    segments.push(STICKER_SEGMENTS[1]);
  }

  segments.push(POINT_SEGMENTS[3]); // 25 pts

  // Add bonus segment if we haven't already (when accessories were available)
  if (availability.accessoriesAvailable) {
    segments.push(BONUS_SEGMENT);
  } else if (!availability.stickersAvailable) {
    // If no stickers and no accessories, add more point variety
    segments.push({ id: 'pts-10b', label: '10 pts', emoji: '⭐', color: '#fdba74', rewardType: 'points', pointAmount: 10 });
  } else {
    // Add extra bonus for variety
    segments.push({ id: 'bonus-2', label: 'Bonus!', emoji: '🎁', color: '#67e8f9', rewardType: 'points', pointAmount: 15 });
  }

  return segments;
}

type WheelPhase = 'loading' | 'ready' | 'spinning' | 'revealed' | 'complete';

export function BonusWheel({
  tokensAvailable,
  worldId,
  collectedStickers = [],
  collectedAccessories = [],
  onRewardClaimed,
  onComplete,
}: BonusWheelProps) {
  const { playSound } = useAudio();
  const [phase, setPhase] = useState<WheelPhase>('loading');
  const [tokensRemaining, setTokensRemaining] = useState(tokensAvailable);
  const [currentReward, setCurrentReward] = useState<ChestReward | null>(null);
  const [allRewards, setAllRewards] = useState<ChestReward[]>([]);
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const spinCountRef = useRef(0);

  // Track collected items as we claim them
  const [localCollectedStickers, setLocalCollectedStickers] = useState(collectedStickers);
  const [localCollectedAccessories, setLocalCollectedAccessories] = useState(collectedAccessories);

  // Track reward availability for dynamic wheel segments
  const [availability, setAvailability] = useState<RewardAvailability>({
    stickersAvailable: true,
    stickerCount: 0,
    accessoriesAvailable: false,
    accessoryCount: 0,
  });

  // Build wheel segments based on availability
  const wheelSegments = useMemo(() => buildWheelSegments(availability), [availability]);
  const segmentAngle = 360 / wheelSegments.length;

  // Load availability on mount and when collected items change
  useEffect(() => {
    async function loadAvailability() {
      const avail = await getRewardAvailability(localCollectedStickers, localCollectedAccessories);
      setAvailability(avail);
      // Only transition to 'ready' if we're still in 'loading' phase (initial mount)
      // Don't reset phase if we're already spinning/revealed/complete
      setPhase(prev => prev === 'loading' ? 'ready' : prev);
    }
    loadAvailability();
  }, [localCollectedStickers, localCollectedAccessories]);

  const doSpin = useCallback(async () => {
    if (tokensRemaining <= 0 || isAnimating || phase === 'loading') return;

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

      // 1. First, randomly select which segment to land on
      const segmentIndex = Math.floor(Math.random() * wheelSegments.length);
      const landingSegment = wheelSegments[segmentIndex];

      // 2. Generate a reward matching the segment type
      const reward = await generateSpecificReward(
        landingSegment.rewardType,
        landingSegment.pointAmount,
        localCollectedStickers,
        localCollectedAccessories,
        worldId
      );

      // 3. Calculate spin: 4-6 full rotations + land on the selected segment
      // The wheel rotates clockwise, pointer is at top
      // Segment 0 is at 12 o'clock - to land on segment N, we subtract its position
      const spins = 4 + Math.floor(Math.random() * 3);
      // Add slight randomness within the segment for visual variety
      const segmentOffset = (Math.random() * 0.6 + 0.2) * segmentAngle; // 20-80% into segment
      // Subtract segment position to rotate it TO the pointer, subtract offset to land within the segment
      const newRotation = ((spins + 1) * 360) - (segmentIndex * segmentAngle) - segmentOffset;

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
  }, [tokensRemaining, isAnimating, phase, localCollectedStickers, localCollectedAccessories, worldId, playSound, onRewardClaimed, wheelSegments, segmentAngle]);

  const handleSpin = () => {
    if (phase !== 'ready' || isAnimating) return;
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

  // Render the wheel SVG with dynamic segments
  const renderWheel = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {wheelSegments.map((segment, index) => {
        const startAngle = index * segmentAngle - 90;
        const endAngle = startAngle + segmentAngle;
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1 = 50 + 45 * Math.cos(startRad);
        const y1 = 50 + 45 * Math.sin(startRad);
        const x2 = 50 + 45 * Math.cos(endRad);
        const y2 = 50 + 45 * Math.sin(endRad);

        const midAngle = ((startAngle + endAngle) / 2 + 90) * (Math.PI / 180);
        const textX = 50 + 30 * Math.cos(midAngle - Math.PI / 2);
        const textY = 50 + 30 * Math.sin(midAngle - Math.PI / 2);

        // For larger arcs, use the large arc flag
        const largeArcFlag = segmentAngle > 180 ? 1 : 0;

        return (
          <g key={segment.id}>
            <path
              d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
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
        {/* Loading state */}
        {phase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="text-6xl mb-4"
            >
              🎰
            </motion.div>
            <p className="text-white text-xl">Loading prizes...</p>
          </motion.div>
        )}

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
            {currentReward.type === 'points' ? (
              /* Points reward - show in colored card */
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
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="text-7xl mb-2"
                >
                  {displayInfo.emoji}
                </motion.div>
              </motion.div>
            ) : (
              /* Collectible reward - show image with rounded border and shine effect */
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="mb-6 relative"
              >
                <div className="bg-gradient-to-br from-yellow-300 to-amber-400 rounded-2xl p-3 shadow-xl relative overflow-hidden">
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                  />
                  {currentReward.collectible.imageUrl ? (
                    <img
                      src={currentReward.collectible.imageUrl}
                      alt={currentReward.collectible.displayName}
                      className="w-40 h-40 object-contain mx-auto rounded-xl bg-white/30 p-2 relative"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`text-8xl ${currentReward.collectible.imageUrl ? 'hidden' : ''}`}>
                    {displayInfo.emoji}
                  </div>
                </div>
              </motion.div>
            )}

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
