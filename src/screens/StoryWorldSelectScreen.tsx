import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lock, Check, AlertTriangle } from 'lucide-react';
import { useChild } from '../context/ChildContext';
import { useAudio } from '../context/AudioContext';
import { worlds } from '../data/worlds';
import { createStoryArcForWorld } from '../utils/storyGenerator';
import type { StoryWorld } from '../types';

interface StoryWorldSelectScreenProps {
  onBack: () => void;
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

const getWorldGradient = (worldId: string): string => {
  switch (worldId) {
    case 'magical-forest':
      return 'from-emerald-400 to-emerald-600';
    case 'space-station':
      return 'from-indigo-500 to-purple-700';
    case 'underwater-kingdom':
      return 'from-cyan-400 to-blue-600';
    case 'dinosaur-valley':
      return 'from-amber-400 to-orange-600';
    case 'pirate-cove':
      return 'from-yellow-500 to-amber-700';
    default:
      return 'from-gray-400 to-gray-600';
  }
};

interface WorldCardProps {
  world: StoryWorld;
  isUnlocked: boolean;
  isActive: boolean;
  hasStoryInProgress: boolean;
  onSelect: () => void;
}

function WorldCard({ world, isUnlocked, isActive, hasStoryInProgress, onSelect }: WorldCardProps) {
  return (
    <motion.button
      whileHover={isUnlocked ? { scale: 1.02 } : undefined}
      whileTap={isUnlocked ? { scale: 0.98 } : undefined}
      onClick={isUnlocked ? onSelect : undefined}
      className={`relative w-full rounded-2xl overflow-hidden shadow-lg text-left transition-all ${
        isActive
          ? 'ring-4 ring-accent ring-offset-2'
          : isUnlocked
          ? 'cursor-pointer'
          : 'opacity-60 cursor-not-allowed'
      }`}
    >
      {/* Background gradient */}
      <div className={`bg-gradient-to-br ${getWorldGradient(world.id)} p-5`}>
        {/* Active indicator */}
        {isActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 right-3 bg-accent text-white rounded-full p-1.5"
          >
            <Check className="w-4 h-4" />
          </motion.div>
        )}

        {/* Lock indicator */}
        {!isUnlocked && (
          <div className="absolute top-3 right-3 bg-black/30 text-white rounded-full p-1.5">
            <Lock className="w-4 h-4" />
          </div>
        )}

        {/* Story in progress indicator */}
        {isActive && hasStoryInProgress && (
          <div className="absolute top-3 left-3 bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
            Story in progress
          </div>
        )}

        <div className="flex items-center gap-4">
          {/* World emoji */}
          <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-4xl">
            {getWorldEmoji(world.id)}
          </div>

          {/* World info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-xl">{world.displayName}</h3>
            <p className="text-white/80 text-sm">{world.description}</p>
            {!isUnlocked && (
              <p className="text-white font-medium text-sm mt-1">
                🔒 {world.unlockCost} points to unlock
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  worldName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ isOpen, worldName, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 z-50 max-w-sm mx-auto shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-text">Start New Adventure?</h2>
            </div>

            <p className="text-text/70 mb-6">
              You have a story in progress! Starting a new adventure in{' '}
              <strong>{worldName}</strong> will abandon your current story.
            </p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 font-medium text-text"
              >
                Keep Current
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-medium"
              >
                Start New
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function StoryWorldSelectScreen({ onBack }: StoryWorldSelectScreenProps) {
  const { child, updateChild, setCurrentStoryArc } = useChild();
  const { playSound } = useAudio();
  const [confirmWorld, setConfirmWorld] = useState<StoryWorld | null>(null);

  if (!child) return null;

  const hasStoryInProgress = child.currentStoryArc !== null;

  const handleSelectWorld = (world: StoryWorld) => {
    playSound('tap');

    // If same world and has story, just go back
    if (world.id === child.activeWorldId && hasStoryInProgress) {
      onBack();
      return;
    }

    // If has story in progress, show confirmation
    if (hasStoryInProgress) {
      setConfirmWorld(world);
      return;
    }

    // Otherwise, select the world and create a new story
    startNewStoryInWorld(world);
  };

  const startNewStoryInWorld = (world: StoryWorld) => {
    playSound('success');

    // Update active world
    updateChild({ activeWorldId: world.id });

    // Create new story arc for this world
    const newStoryArc = createStoryArcForWorld(
      world.id,
      child.name,
      child.activePetId
    );

    if (newStoryArc) {
      setCurrentStoryArc(newStoryArc);
    }

    setConfirmWorld(null);
    onBack();
  };

  const handleConfirm = () => {
    if (confirmWorld) {
      startNewStoryInWorld(confirmWorld);
    }
  };

  const handleBack = () => {
    playSound('tap');
    onBack();
  };

  const unlockedWorlds = worlds.filter((world) =>
    child.unlockedWorlds.includes(world.id)
  );
  const lockedWorlds = worlds.filter(
    (world) => !child.unlockedWorlds.includes(world.id)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleBack}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100"
          >
            <ArrowLeft className="w-6 h-6 text-text" />
          </motion.button>
          <div>
            <h1 className="text-2xl font-bold text-text">Story Worlds</h1>
            <p className="text-sm text-text/60">Choose your next adventure</p>
          </div>
        </div>
      </div>

      <div className="p-4 pb-24">
        {/* Current story info */}
        {hasStoryInProgress && child.currentStoryArc && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 rounded-xl p-4 mb-6"
          >
            <p className="text-primary font-medium text-sm mb-1">
              Current Adventure
            </p>
            <p className="text-text font-bold">{child.currentStoryArc.title}</p>
            <p className="text-text/60 text-sm">
              Chapter {child.currentStoryArc.currentChapterIndex + 1} of{' '}
              {child.currentStoryArc.totalChapters}
            </p>
          </motion.div>
        )}

        {/* Unlocked worlds */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-text mb-3 flex items-center gap-2">
            <span>Available Worlds</span>
            <span className="text-sm font-normal text-text/60">
              ({unlockedWorlds.length})
            </span>
          </h2>
          <div className="space-y-4">
            {unlockedWorlds.map((world, index) => (
              <motion.div
                key={world.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <WorldCard
                  world={world}
                  isUnlocked={true}
                  isActive={child.activeWorldId === world.id}
                  hasStoryInProgress={
                    child.activeWorldId === world.id && hasStoryInProgress
                  }
                  onSelect={() => handleSelectWorld(world)}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Locked worlds */}
        {lockedWorlds.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-text mb-3 flex items-center gap-2">
              <span>Locked Worlds</span>
              <span className="text-sm font-normal text-text/60">
                ({lockedWorlds.length})
              </span>
            </h2>
            <div className="space-y-4">
              {lockedWorlds.map((world, index) => (
                <motion.div
                  key={world.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (unlockedWorlds.length + index) * 0.1 }}
                >
                  <WorldCard
                    world={world}
                    isUnlocked={false}
                    isActive={false}
                    hasStoryInProgress={false}
                    onSelect={() => {}}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      <ConfirmModal
        isOpen={confirmWorld !== null}
        worldName={confirmWorld?.displayName ?? ''}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmWorld(null)}
      />
    </div>
  );
}

export default StoryWorldSelectScreen;
