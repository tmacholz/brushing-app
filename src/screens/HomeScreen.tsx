import { motion } from 'framer-motion';
import { Flame, Star, Sparkles, ChevronDown, Check } from 'lucide-react';
import { useChild } from '../context/ChildContext';
import { useAudio } from '../context/AudioContext';
import { getPetById } from '../data/pets';
import { getStreakLevel } from '../utils/streakCalculator';
import type { ScreenName } from '../types';

interface HomeScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getPetEmoji = (petId: string): string => {
  switch (petId) {
    case 'sparkle':
      return '⭐';
    case 'bubbles':
      return '🐠';
    case 'cosmo':
      return '🤖';
    case 'fern':
      return '🐉';
    case 'captain-whiskers':
      return '🐱';
    default:
      return '✨';
  }
};

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { child, hasMultipleChildren } = useChild();
  const { playSound } = useAudio();

  if (!child) return null;

  const handleNavigate = (screen: ScreenName) => {
    playSound('tap');
    onNavigate(screen);
  };

  const handleStartBrushing = () => {
    playSound('success');
    onNavigate('brushing');
  };

  const pet = getPetById(child.activePetId);
  const streakLevel = getStreakLevel(child.currentStreak);
  const hasStoryInProgress = child.currentStoryArc !== null;

  const getStreakColor = () => {
    switch (streakLevel) {
      case 'fire':
        return 'text-orange-500';
      case 'high':
        return 'text-amber-500';
      case 'medium':
        return 'text-yellow-500';
      default:
        return 'text-gray-400';
    }
  };

  // Chapter progression data
  const currentChapter = child.currentStoryArc?.currentChapterIndex ?? 0;
  const totalChapters = child.currentStoryArc?.totalChapters ?? 5;

  return (
    <div className="min-h-screen bg-background p-6 pb-24 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4"
      >
        <motion.button
          onClick={() => handleNavigate('profile-select')}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-1 focus:outline-none"
        >
          <h1 className="text-2xl font-bold text-text">
            {getGreeting()}, {child.name}!
          </h1>
          {hasMultipleChildren && (
            <ChevronDown className="w-5 h-5 text-text/60 mt-1" />
          )}
        </motion.button>
      </motion.div>

      {/* Stats Row - moved below greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-3 mb-6"
      >
        {/* Streak Card */}
        <div className="flex-1 bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center`}>
            <Flame className={`w-5 h-5 ${getStreakColor()}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${getStreakColor()}`}>
              {child.currentStreak}
            </p>
            <p className="text-xs text-text/50">day streak</p>
          </div>
        </div>

        {/* Points Card */}
        <div className="flex-1 bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <Star className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-bold text-accent">{child.points}</p>
            <p className="text-xs text-text/50">points</p>
          </div>
        </div>
      </motion.div>

      {/* Pet Display - smaller */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', damping: 12 }}
        className="flex flex-col items-center mb-6"
      >
        <motion.button
          onClick={() => handleNavigate('pet-select')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative focus:outline-none"
        >
          <motion.div
            animate={{
              y: [0, -6, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="relative"
          >
            {/* Pet circle - smaller */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shadow-lg overflow-hidden">
              {pet?.avatarUrl ? (
                <img src={pet.avatarUrl} alt={pet.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl">{getPetEmoji(child.activePetId)}</span>
              )}
            </div>

            {/* Sparkle effects */}
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="w-6 h-6 text-accent" />
            </motion.div>
          </motion.div>

          {pet && (
            <p className="mt-2 text-lg font-medium text-text">
              {pet.displayName}
            </p>
          )}
        </motion.button>
      </motion.div>

      {/* Chapter Progression */}
      {hasStoryInProgress && child.currentStoryArc && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-md p-4 mb-6"
        >
          <p className="text-sm font-medium text-text/70 mb-1">
            {child.currentStoryArc.title}
          </p>
          <p className="text-xs text-text/50 mb-4">
            Chapter {currentChapter + 1} of {totalChapters}
          </p>

          {/* Chapter circles */}
          <div className="flex items-center justify-between">
            {Array.from({ length: totalChapters }).map((_, index) => {
              const isCompleted = index < currentChapter;
              const isCurrent = index === currentChapter;

              return (
                <div key={index} className="flex items-center flex-1">
                  {/* Circle */}
                  <div className="relative flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? 'bg-accent text-white'
                          : isCurrent
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span className="text-xs font-bold">{index + 1}</span>
                      )}
                    </motion.div>
                    {isCurrent && (
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-full bg-primary/30"
                      />
                    )}
                  </div>

                  {/* Connector line */}
                  {index < totalChapters - 1 && (
                    <div
                      className={`flex-1 h-1 mx-1 rounded ${
                        index < currentChapter ? 'bg-accent' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* No story prompt */}
      {!hasStoryInProgress && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => handleNavigate('story-world-select')}
          className="bg-primary/10 rounded-2xl p-4 mb-6 text-left"
        >
          <p className="text-primary font-medium">Start a Story Adventure!</p>
          <p className="text-primary/60 text-sm">
            Choose a world and unlock chapters by brushing
          </p>
        </motion.button>
      )}

      {/* Spacer to push button down */}
      <div className="flex-1" />

      {/* Start Brushing Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleStartBrushing}
        className="w-full bg-gradient-to-r from-primary to-primary/80 text-white text-xl font-bold py-5 rounded-2xl shadow-lg"
      >
        {hasStoryInProgress ? 'CONTINUE STORY' : 'START BRUSHING'}
      </motion.button>

      {/* Bottom hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-text/40 text-sm mt-4"
      >
        2 minutes of fun awaits!
      </motion.p>
    </div>
  );
}

export default HomeScreen;
