import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { ChestReward } from '../../types';
import { generateChestReward, getRewardDisplayInfo } from '../../services/rewardGenerator';
import { useAudio } from '../../context/AudioContext';

interface MysteryChestProps {
  worldId?: string;
  collectedStickers?: string[];
  collectedAccessories?: string[];
  onRewardClaimed: (reward: ChestReward) => void;
  onClose: () => void;
}

type ChestState = 'intro' | 'ready' | 'opening' | 'revealed';

export function MysteryChest({
  worldId,
  collectedStickers = [],
  collectedAccessories = [],
  onRewardClaimed,
  onClose,
}: MysteryChestProps) {
  const { playSound } = useAudio();
  const [state, setState] = useState<ChestState>('intro');
  const [reward, setReward] = useState<ChestReward | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Intro animation timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setState('ready');
      playSound('storyTransition');
    }, 1000);
    return () => clearTimeout(timer);
  }, [playSound]);

  const handleOpenChest = async () => {
    if (state !== 'ready' || isLoading) return;

    setIsLoading(true);
    setState('opening');
    playSound('chapterStart');

    try {
      const generatedReward = await generateChestReward(
        worldId,
        collectedStickers,
        collectedAccessories
      );
      setReward(generatedReward);

      // Delay reveal for animation
      setTimeout(() => {
        setState('revealed');
        playSound('success');
        onRewardClaimed(generatedReward);
      }, 1500);
    } catch (error) {
      console.error('Error generating reward:', error);
      // Fallback to points reward
      const fallbackReward: ChestReward = { type: 'points', amount: 5 };
      setReward(fallbackReward);
      setState('revealed');
      onRewardClaimed(fallbackReward);
    }

    setIsLoading(false);
  };

  const displayInfo = reward ? getRewardDisplayInfo(reward) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-900 flex flex-col items-center justify-center p-6"
    >
      {/* Sparkle particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-300 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0,
            }}
            animate={{
              y: [null, Math.random() * -200],
              opacity: [0, 1, 0],
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
        {/* Intro State */}
        {state === 'intro' && (
          <motion.div
            key="intro"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-8xl mb-4"
            >
              🎁
            </motion.div>
            <p className="text-white text-xl">You found a treasure!</p>
          </motion.div>
        )}

        {/* Ready State - Chest waiting to be opened */}
        {state === 'ready' && (
          <motion.div
            key="ready"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            className="text-center"
          >
            <p className="text-white/80 text-lg mb-6">Tap to open!</p>

            <motion.button
              onClick={handleOpenChest}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                y: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="relative"
            >
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 rounded-3xl bg-yellow-400/30 blur-xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Chest */}
              <div className="relative bg-gradient-to-b from-amber-600 to-amber-800 rounded-3xl p-8 shadow-2xl border-4 border-amber-500">
                <div className="text-8xl">🎁</div>

                {/* Sparkle icon */}
                <motion.div
                  className="absolute -top-2 -right-2 text-yellow-300"
                  animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                  transition={{ rotate: { duration: 4, repeat: Infinity }, scale: { duration: 1, repeat: Infinity } }}
                >
                  <Sparkles className="w-8 h-8" />
                </motion.div>
              </div>
            </motion.button>

            <p className="text-white/60 text-sm mt-6">Mystery Chest</p>
          </motion.div>
        )}

        {/* Opening Animation */}
        {state === 'opening' && (
          <motion.div
            key="opening"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.1, 1.2, 0.8, 1.5] }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="text-center"
          >
            <motion.div
              animate={{
                rotate: [0, -20, 20, -20, 20, 0],
                y: [0, -20, 0],
              }}
              transition={{ duration: 1.5 }}
              className="text-9xl"
            >
              🎁
            </motion.div>

            {/* Burst effect */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 3], opacity: [1, 0] }}
              transition={{ duration: 1, delay: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-32 h-32 rounded-full bg-yellow-400" />
            </motion.div>
          </motion.div>
        )}

        {/* Revealed State - Show reward */}
        {state === 'revealed' && reward && displayInfo && (
          <motion.div
            key="revealed"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 10, stiffness: 100 }}
            className="text-center"
          >
            {/* Reward badge */}
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

              {/* Icon or image */}
              {reward.type === 'points' ? (
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="text-8xl mb-2"
                >
                  {displayInfo.emoji}
                </motion.div>
              ) : (
                <div className="relative">
                  {reward.collectible.imageUrl ? (
                    <img
                      src={reward.collectible.imageUrl}
                      alt={reward.collectible.displayName}
                      className="w-32 h-32 object-contain mx-auto rounded-2xl"
                    />
                  ) : (
                    <div className="text-8xl">{displayInfo.emoji}</div>
                  )}
                  {reward.isNew && (
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

            {/* Reward text */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-2"
            >
              {displayInfo.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white/80 text-lg mb-8"
            >
              {displayInfo.subtitle}
            </motion.p>

            {/* Continue button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-purple-700 font-bold py-4 px-12 rounded-full text-xl shadow-lg"
            >
              Awesome!
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default MysteryChest;
