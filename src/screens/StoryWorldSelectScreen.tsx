import { motion } from 'framer-motion';
import { ArrowLeft, Lock } from 'lucide-react';
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
  hasActiveStory: boolean;
  storiesCompleted: number;
  totalStories: number;
  index: number;
  onSelect: () => void;
}

function WorldPlanet({
  world,
  isUnlocked,
  hasActiveStory,
  storiesCompleted,
  totalStories,
  index,
  onSelect,
}: WorldPlanetProps) {
  const colors = getWorldColors(world.id);

  // Staggered floating animation
  const floatDelay = index * 0.5;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, type: 'spring', damping: 15 }}
      whileHover={isUnlocked ? { scale: 1.1 } : undefined}
      whileTap={isUnlocked ? { scale: 0.95 } : undefined}
      onClick={isUnlocked ? onSelect : undefined}
      className={`flex flex-col items-center ${!isUnlocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
          className={`relative w-36 h-36 rounded-full bg-gradient-to-br ${colors.gradient} shadow-xl ${colors.glow} shadow-2xl flex items-center justify-center overflow-hidden`}
        >
          {/* Shine effect */}
          <div className="absolute top-2 left-4 w-6 h-6 bg-white/30 rounded-full blur-sm" />

          {/* Emoji */}
          <span className="text-5xl relative z-10">{getWorldEmoji(world.id)}</span>

          {/* Lock overlay */}
          {!isUnlocked && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
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
        <p className="text-xs text-white/50 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          {world.unlockCost} pts
        </p>
      )}
    </motion.button>
  );
}

export function StoryWorldSelectScreen({ onBack, onSelectWorld }: StoryWorldSelectScreenProps) {
  const { child } = useChild();
  const { playSound } = useAudio();
  const { worlds, getStoriesForWorld } = useContent();

  if (!child) return null;

  const handleSelectWorld = (world: StoryWorld) => {
    playSound('tap');
    onSelectWorld(world.id);
  };

  const handleBack = () => {
    playSound('tap');
    onBack();
  };

  // Separate unlocked and locked worlds
  const unlockedWorlds = worlds.filter((world) =>
    child.unlockedWorlds.includes(world.id)
  );
  const lockedWorlds = worlds.filter(
    (world) => !child.unlockedWorlds.includes(world.id)
  );

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
          <div>
            <h1 className="text-2xl font-bold text-white">Explore Worlds</h1>
            <p className="text-sm text-white/60">Choose a world to discover stories</p>
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
                  hasActiveStory={hasActiveStoryInWorld(world.id)}
                  storiesCompleted={progress.completed}
                  totalStories={progress.total}
                  index={index}
                  onSelect={() => handleSelectWorld(world)}
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
                    hasActiveStory={false}
                    storiesCompleted={progress.completed}
                    totalStories={progress.total}
                    index={unlockedWorlds.length + index}
                    onSelect={() => {}}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StoryWorldSelectScreen;
