import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, AlertTriangle, BookOpen } from 'lucide-react';
import { useChild } from '../context/ChildContext';
import { useAudio } from '../context/AudioContext';
import { worlds } from '../data/worlds';
import { getStoriesForWorld } from '../data/starterStories';
import { createStoryArc } from '../utils/storyGenerator';
import type { StoryTemplate } from '../types';

interface StorySelectScreenProps {
  worldId: string;
  onBack: () => void;
  onStartStory: () => void;
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
      return 'from-emerald-600 to-emerald-800';
    case 'space-station':
      return 'from-indigo-600 to-purple-800';
    case 'underwater-kingdom':
      return 'from-cyan-600 to-blue-800';
    case 'dinosaur-valley':
      return 'from-amber-600 to-orange-800';
    case 'pirate-cove':
      return 'from-yellow-600 to-red-800';
    default:
      return 'from-gray-600 to-gray-800';
  }
};

interface StoryCardProps {
  story: StoryTemplate;
  isCompleted: boolean;
  isInProgress: boolean;
  index: number;
  onSelect: () => void;
}

function StoryCard({ story, isCompleted, isInProgress, index, onSelect }: StoryCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-lg"
    >
      {/* Cover image or placeholder */}
      {story.coverImageUrl ? (
        <img
          src={story.coverImageUrl}
          alt={story.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-secondary/80 flex items-center justify-center">
          <BookOpen className="w-16 h-16 text-white/50" />
        </div>
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Completion badge */}
      {isCompleted && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 bg-accent text-white rounded-full p-2 shadow-lg"
        >
          <Check className="w-4 h-4" />
        </motion.div>
      )}

      {/* In progress badge */}
      {isInProgress && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 left-3 bg-white text-primary text-xs font-bold px-2 py-1 rounded-full shadow-lg"
        >
          In Progress
        </motion.div>
      )}

      {/* Story info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-bold text-white text-lg leading-tight mb-1">
          {story.title}
        </h3>
        <p className="text-white/70 text-sm line-clamp-2">
          {story.description}
        </p>
        <p className="text-white/50 text-xs mt-2">
          {story.totalChapters} chapters
        </p>
      </div>
    </motion.button>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  storyTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ isOpen, storyTitle, onConfirm, onCancel }: ConfirmModalProps) {
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
              <h2 className="text-xl font-bold text-text">Start New Story?</h2>
            </div>

            <p className="text-text/70 mb-6">
              You have a story in progress! Starting{' '}
              <strong>{storyTitle}</strong> will abandon your current story.
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

export function StorySelectScreen({ worldId, onBack, onStartStory }: StorySelectScreenProps) {
  const { child, updateChild, setCurrentStoryArc } = useChild();
  const { playSound } = useAudio();
  const [confirmStory, setConfirmStory] = useState<StoryTemplate | null>(null);

  if (!child) return null;

  const world = worlds.find((w) => w.id === worldId);
  const stories = getStoriesForWorld(worldId);
  const hasStoryInProgress = child.currentStoryArc !== null;

  const handleSelectStory = (story: StoryTemplate) => {
    playSound('tap');

    // If this story is already in progress, just go to brushing
    if (child.currentStoryArc?.storyTemplateId === story.id) {
      onStartStory();
      return;
    }

    // If there's another story in progress, show confirmation
    if (hasStoryInProgress) {
      setConfirmStory(story);
      return;
    }

    // Otherwise, start the new story
    startStory(story);
  };

  const startStory = (story: StoryTemplate) => {
    playSound('success');

    // Update active world
    updateChild({ activeWorldId: worldId });

    // Create new story arc
    const newStoryArc = createStoryArc(story.id, child.name, child.activePetId);

    if (newStoryArc) {
      setCurrentStoryArc(newStoryArc);
    }

    setConfirmStory(null);
    onStartStory();
  };

  const handleConfirm = () => {
    if (confirmStory) {
      startStory(confirmStory);
    }
  };

  const handleBack = () => {
    playSound('tap');
    onBack();
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b ${getWorldGradient(worldId)}`}>
      {/* Header */}
      <div className="sticky top-0 bg-black/20 backdrop-blur-sm z-10 px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleBack}
            className="p-2 -ml-2 rounded-xl hover:bg-white/10"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </motion.button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getWorldEmoji(worldId)}</span>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {world?.displayName ?? 'Stories'}
              </h1>
              <p className="text-sm text-white/60">
                {stories.length} {stories.length === 1 ? 'story' : 'stories'} to explore
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 pb-24">
        {/* Stories grid */}
        <div className="grid grid-cols-2 gap-4">
          {stories.map((story, index) => (
            <StoryCard
              key={story.id}
              story={story}
              isCompleted={child.completedStoryArcs.includes(story.id)}
              isInProgress={child.currentStoryArc?.storyTemplateId === story.id}
              index={index}
              onSelect={() => handleSelectStory(story)}
            />
          ))}
        </div>

        {/* Empty state */}
        {stories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-white/60">
            <BookOpen className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">No stories available yet</p>
            <p className="text-sm">Check back soon!</p>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      <ConfirmModal
        isOpen={confirmStory !== null}
        storyTitle={confirmStory?.title ?? ''}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmStory(null)}
      />
    </div>
  );
}

export default StorySelectScreen;
