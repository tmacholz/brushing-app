import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lock, Sparkles, X } from 'lucide-react';
import { useChild } from '../context/ChildContext';
import { useAudio } from '../context/AudioContext';
import { useContent } from '../context/ContentContext';
import type { StoryWorld } from '../types';

interface StoryWorldSelectScreenProps {
  onBack: () => void;
  onSelectWorld: (worldId: string) => void;
}

const getWorldEmoji = (worldId: string): string => {
  switch (worldId) {
    case 'magical-forest':
      return '🌳';
    case 'space-station':
      return '🚀';
    case 'underwater-kingdom':
      return '🐠';
    case 'dinosaur-valley':
      return '🦕';
    case 'pirate-cove':
      return '🏴‍☠️';
    default:
      return '✨';
  }
};

const getWorldColors = (worldId: string): { gradient: string; glow: string; bg: string } => {
  switch (worldId) {
    case 'magical-forest':
      return {
        gradient: 'from-emerald-400 to-emerald-600',
        glow: 'shadow-emerald-400/50',
        bg: 'bg-emerald-500',
      };
    case 'space-station':
      return {
        gradient: 'from-indigo-400 to-purple-600',
        glow: 'shadow-purple-400/50',
        bg: 'bg-indigo-500',
      };
    case 'underwater-kingdom':
      return {
        gradient: 'from-cyan-400 to-blue-600',
        glow: 'shadow-cyan-400/50',
        bg: 'bg-cyan-500',
      };
    case 'dinosaur-valley':
      return {
        gradient: 'from-amber-400 to-orange-600',
        glow: 'shadow-orange-400/50',
        bg: 'bg-amber-500',
      };
    case 'pirate-cove':
      return {
        gradient: 'from-yellow-400 to-red-500',
        glow: 'shadow-yellow-400/50',
        bg: 'bg-yellow-500',
      };
    default:
      return {
        gradient: 'from-gray-400 to-gray-600',
        glow: 'shadow-gray-400/50',
        bg: 'bg-gray-500',
      };
  }
};

interface WorldPlanetProps {
  world: StoryWorld;
  isUnlocked: boolean;
  canAfford: boolean;
  hasActiveStory: boolean;
  storiesCompleted: number;
  totalStories: number;
  index: number;
  onSelect: () => void;
  onUnlockAttempt: () => void;
}

function WorldPlanet({
  world,
  isUnlocked,
  canAfford,
  hasActiveStory,
  storiesCompleted,
  totalStories,
  index,
  onSelect,
  onUnlockAttempt,
}: WorldPlanetProps) {
  const colors = getWorldColors(world.id);
  const hasImage = world.backgroundImageUrl && !world.backgroundImageUrl.startsWith('/worlds/');

  // Staggered floating animation
  const floatDelay = index * 0.5;

  const handleClick = () => {
    if (isUnlocked) {
      onSelect();
    } else if (canAfford) {
      onUnlockAttempt();
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, type: 'spring', damping: 15 }}
      whileHover={(isUnlocked || canAfford) ? { scale: 1.1 } : undefined}
      whileTap={(isUnlocked || canAfford) ? { scale: 0.95 } : undefined}
      onClick={handleClick}
      className={`flex flex-col items-center ${!isUnlocked && !canAfford ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {/* Planet orb */}
      <motion.div
        animate={{
          y: isUnlocked ? [0, -8, 0] : 0,
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          delay: floatDelay,
          ease: 'easeInOut',
        }}
        className="relative"
      >
        {/* Glow effect */}
        <div
          className={`absolute inset-0 rounded-full blur-xl ${colors.bg} opacity-40 scale-110`}
        />

        {/* Planet */}
        <div
          className={`relative w-36 h-36 rounded-full ${!hasImage ? `bg-gradient-to-br ${colors.gradient}` : ''} shadow-xl ${colors.glow} shadow-2xl flex items-center justify-center overflow-hidden`}
        >
          {hasImage ? (
            <>
              {/* AI Generated World Image */}
              <img
                src={world.backgroundImageUrl}
                alt={world.displayName}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Subtle shine overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            </>
          ) : (
            <>
              {/* Shine effect */}
              <div className="absolute top-2 left-4 w-6 h-6 bg-white/30 rounded-full blur-sm" />
              {/* Fallback Emoji */}
              <span className="text-5xl relative z-10">{getWorldEmoji(world.id)}</span>
            </>
          )}

          {/* Lock overlay */}
          {!isUnlocked && (
            <div className={`absolute inset-0 ${canAfford ? 'bg-accent/60' : 'bg-black/40'} flex items-center justify-center`}>
              {canAfford ? (
                <Sparkles className="w-8 h-8 text-white" />
              ) : (
                <Lock className="w-8 h-8 text-white" />
              )}
            </div>
          )}
        </div>

        {/* Active story indicator */}
        {hasActiveStory && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg"
          >
            <span className="text-white text-xs font-bold">!</span>
          </motion.div>
        )}

        {/* Completion indicator */}
        {isUnlocked && storiesCompleted > 0 && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white rounded-full px-2 py-0.5 shadow-md">
            <span className="text-xs font-bold text-text">
              {storiesCompleted}/{totalStories}
            </span>
          </div>
        )}
      </motion.div>

      {/* World name */}
      <p className={`mt-3 font-bold text-center ${isUnlocked ? 'text-white' : 'text-white/50'}`}>
        {world.displayName}
      </p>

      {/* Unlock cost */}
      {!isUnlocked && (
        <p className={`text-xs flex items-center gap-1 ${canAfford ? 'text-accent' : 'text-white/50'}`}>
          {canAfford ? <Sparkles className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          {canAfford ? `Tap to unlock` : `${world.unlockCost} pts`}
        </p>
      )}
    </motion.button>
  );
}

export function StoryWorldSelectScreen({ onBack, onSelectWorld }: StoryWorldSelectScreenProps) {
  const { child, unlockWorld } = useChild();
  const { playSound } = useAudio();
  const { worlds, getStoriesForWorld } = useContent();
  const [worldToUnlock, setWorldToUnlock] = useState<StoryWorld | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  if (!child) return null;

  const handleSelectWorld = (world: StoryWorld) => {
    playSound('tap');
    onSelectWorld(world.id);
  };

  const handleBack = () => {
    playSound('tap');
    onBack();
  };

  const handleUnlockAttempt = (world: StoryWorld) => {
    playSound('tap');
    setWorldToUnlock(world);
  };

  const handleConfirmUnlock = async () => {
    if (!worldToUnlock) return;

    setIsUnlocking(true);
    const success = await unlockWorld(worldToUnlock.id, worldToUnlock.unlockCost);
    setIsUnlocking(false);

    if (success) {
      playSound('success');
      setWorldToUnlock(null);
    } else {
      playSound('tap');
    }
  };

  const handleCancelUnlock = () => {
    playSound('tap');
    setWorldToUnlock(null);
  };

  // Check if world is unlocked (either explicitly unlocked, is a starter, or has 0 cost)
  const isWorldUnlocked = (world: StoryWorld) => {
    return child.unlockedWorlds.includes(world.id) ||
           child.unlockedWorlds.includes(world.name) ||
           world.isStarter ||
           world.unlockCost === 0;
  };

  // Separate unlocked and locked worlds
  const unlockedWorlds = worlds.filter(isWorldUnlocked);
  const lockedWorlds = worlds.filter((world) => !isWorldUnlocked(world));

  // Calculate story completion for each world
  const getWorldProgress = (worldId: string) => {
    const stories = getStoriesForWorld(worldId);
    const completed = stories.filter((story) =>
      child.completedStoryArcs.includes(story.id)
    ).length;
    return { completed, total: stories.length };
  };

  // Check if world has active story
  const hasActiveStoryInWorld = (worldId: string) => {
    return child.currentStoryArc?.worldId === worldId;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900">
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-20 sticky top-0 bg-indigo-900/80 backdrop-blur-sm px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleBack}
            className="p-2 -ml-2 rounded-xl hover:bg-white/10"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Explore Worlds</h1>
            <p className="text-sm text-white/60">Choose a world to discover stories</p>
          </div>
          <div className="bg-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="font-bold text-white">{child.points}</span>
            <span className="text-white/70 text-sm">pts</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 p-6 pb-32 pt-4">
        {/* Current story info */}
        {child.currentStoryArc && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-8 border border-white/20"
          >
            <p className="text-accent font-medium text-sm mb-1">
              Continue Your Adventure
            </p>
            <p className="text-white font-bold">{child.currentStoryArc.title}</p>
            <p className="text-white/60 text-sm">
              Chapter {child.currentStoryArc.currentChapterIndex + 1} of{' '}
              {child.currentStoryArc.totalChapters}
            </p>
          </motion.div>
        )}

        {/* Unlocked worlds grid */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-white mb-6 text-center">
            Available Worlds
          </h2>
          <div className="grid grid-cols-2 gap-8 justify-items-center max-w-sm mx-auto">
            {unlockedWorlds.map((world, index) => {
              const progress = getWorldProgress(world.id);
              return (
                <WorldPlanet
                  key={world.id}
                  world={world}
                  isUnlocked={true}
                  canAfford={false}
                  hasActiveStory={hasActiveStoryInWorld(world.id)}
                  storiesCompleted={progress.completed}
                  totalStories={progress.total}
                  index={index}
                  onSelect={() => handleSelectWorld(world)}
                  onUnlockAttempt={() => {}}
                />
              );
            })}
          </div>
        </div>

        {/* Locked worlds */}
        {lockedWorlds.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white/60 mb-6 text-center">
              Locked Worlds
            </h2>
            <div className="grid grid-cols-2 gap-8 justify-items-center max-w-sm mx-auto">
              {lockedWorlds.map((world, index) => {
                const progress = getWorldProgress(world.id);
                return (
                  <WorldPlanet
                    key={world.id}
                    world={world}
                    isUnlocked={false}
                    canAfford={child.points >= world.unlockCost}
                    hasActiveStory={false}
                    storiesCompleted={progress.completed}
                    totalStories={progress.total}
                    index={unlockedWorlds.length + index}
                    onSelect={() => {}}
                    onUnlockAttempt={() => handleUnlockAttempt(world)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Unlock Confirmation Modal */}
      <AnimatePresence>
        {worldToUnlock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={handleCancelUnlock}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Unlock World?</h2>
                <button
                  onClick={handleCancelUnlock}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getWorldColors(worldToUnlock.id).gradient} flex items-center justify-center overflow-hidden`}>
                  {worldToUnlock.backgroundImageUrl && !worldToUnlock.backgroundImageUrl.startsWith('/worlds/') ? (
                    <img
                      src={worldToUnlock.backgroundImageUrl}
                      alt={worldToUnlock.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">{getWorldEmoji(worldToUnlock.id)}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{worldToUnlock.displayName}</h3>
                  <p className="text-gray-600 text-sm">{worldToUnlock.description}</p>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cost</span>
                  <span className="font-bold text-indigo-600">{worldToUnlock.unlockCost} pts</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600">Your points</span>
                  <span className="font-bold text-gray-900">{child.points} pts</span>
                </div>
                <div className="border-t border-indigo-200 mt-2 pt-2 flex justify-between items-center">
                  <span className="text-gray-600">After unlock</span>
                  <span className="font-bold text-gray-900">{child.points - worldToUnlock.unlockCost} pts</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelUnlock}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUnlock}
                  disabled={isUnlocking}
                  className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUnlocking ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Unlock
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default StoryWorldSelectScreen;
