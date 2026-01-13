import { motion } from 'framer-motion';
import { Flame, Star, Sparkles, ChevronDown } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-background p-6 pb-24 flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <motion.button
          onClick={() => handleNavigate('profile-select')}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-1 focus:outline-none"
        >
          <h1 className="text-3xl font-bold text-text">
            {getGreeting()}, {child.name}!
          </h1>
          {hasMultipleChildren && (
            <ChevronDown className="w-5 h-5 text-text/60 mt-1" />
          )}
        </motion.button>
        <p className="text-text/60 mt-1">
          {hasMultipleChildren ? 'Tap name to switch brusher' : 'Ready for an adventure?'}
        </p>
      </motion.div>

      {/* Pet Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', damping: 12 }}
        className="flex-1 flex flex-col items-center justify-center"
      >
        <motion.button
          onClick={() => handleNavigate('pet-select')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative focus:outline-none"
        >
          <motion.div
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="relative"
          >
            {/* Pet circle */}
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shadow-lg">
              <span className="text-8xl">{getPetEmoji(child.activePetId)}</span>
            </div>

            {/* Sparkle effects */}
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="w-8 h-8 text-accent" />
            </motion.div>
          </motion.div>

          {pet && (
            <p className="mt-4 text-xl font-medium text-text">
              {pet.displayName}
            </p>
          )}
          <p className="text-xs text-text/40 mt-1">Tap to change pet</p>
        </motion.button>

        {hasStoryInProgress && child.currentStoryArc && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 bg-primary/10 rounded-xl px-4 py-2"
          >
            <p className="text-primary text-sm font-medium">
              Continue: {child.currentStoryArc.title}
            </p>
            <p className="text-primary/60 text-xs">
              Chapter {child.currentStoryArc.currentChapterIndex + 1} of{' '}
              {child.currentStoryArc.totalChapters}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4 mb-8"
      >
        {/* Streak Card */}
        <div className="flex-1 bg-white rounded-2xl shadow-md p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame className={`w-5 h-5 ${getStreakColor()}`} />
            <span className="text-sm text-text/60">Streak</span>
          </div>
          <p className={`text-3xl font-bold ${getStreakColor()}`}>
            {child.currentStreak}
          </p>
          <p className="text-xs text-text/40">days</p>
        </div>

        {/* Points Card */}
        <div className="flex-1 bg-white rounded-2xl shadow-md p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Star className="w-5 h-5 text-accent" />
            <span className="text-sm text-text/60">Points</span>
          </div>
          <p className="text-3xl font-bold text-accent">{child.points}</p>
          <p className="text-xs text-text/40">earned</p>
        </div>
      </motion.div>

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
        START BRUSHING
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
