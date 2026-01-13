import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useBrushingTimer, formatTime } from '../hooks/useBrushingTimer';
import { useStoryProgression } from '../hooks/useStoryProgression';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useChild } from '../context/ChildContext';
import { useAudio } from '../context/AudioContext';
import { ProgressBar } from '../components/ui/ProgressBar';
import { createStoryArcForWorld } from '../utils/storyGenerator';
import { calculateSessionPoints } from '../utils/pointsCalculator';
import { getPetById } from '../data/pets';
import type { StoryChapter } from '../types';

interface BrushingScreenProps {
  onComplete: (pointsEarned: number) => void;
  onExit: () => void;
}

export function BrushingScreen({ onComplete, onExit }: BrushingScreenProps) {
  const { child, updateStreak, addPoints, setCurrentStoryArc, completeChapter } = useChild();
  const { playSound } = useAudio();
  const { speak, stop: stopSpeaking, pause: pauseSpeaking, resume: resumeSpeaking, isLoading: isTTSLoading, isSpeaking } = useTextToSpeech();
  const [showCountdown, setShowCountdown] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [narrationEnabled, setNarrationEnabled] = useState(true);
  const lastPhaseRef = useRef<string | null>(null);
  const lastSegmentRef = useRef<string | null>(null);
  const lastSpokenTextRef = useRef<string | null>(null);

  // Get or create story arc
  const [currentChapter, setCurrentChapter] = useState<StoryChapter | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [previousChapterSummary, setPreviousChapterSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!child) return;

    let storyArc = child.currentStoryArc;

    // Create new story if needed
    if (!storyArc) {
      storyArc = createStoryArcForWorld(
        child.activeWorldId,
        child.name,
        child.activePetId
      );
      if (storyArc) {
        setCurrentStoryArc(storyArc);
      }
    }

    if (storyArc) {
      const idx = storyArc.currentChapterIndex;
      setChapterIndex(idx);
      setCurrentChapter(storyArc.chapters[idx] ?? null);

      // Get previous chapter cliffhanger for recap
      if (idx > 0) {
        const prevChapter = storyArc.chapters[idx - 1];
        setPreviousChapterSummary(prevChapter?.cliffhanger ?? null);
      }
    }
  }, [child, setCurrentStoryArc]);

  const isFirstChapter = chapterIndex === 0;
  const pet = child ? getPetById(child.activePetId) : null;

  const handleBrushingComplete = () => {
    if (!child) return;

    // Play completion sound
    playSound('complete');

    // Update streak and calculate points
    const { newStreak } = updateStreak();
    const isStoryArcComplete =
      child.currentStoryArc &&
      chapterIndex === child.currentStoryArc.totalChapters - 1;

    const points = calculateSessionPoints(
      newStreak,
      isStoryArcComplete ?? false,
      true, // isFirstBrushOfDay - simplified for now
      false
    );

    addPoints(points.total);
    setPointsEarned(points.total);

    // Mark chapter as complete
    completeChapter(chapterIndex);

    onComplete(points.total);
  };

  const {
    elapsedSeconds,
    remainingSeconds,
    progress,
    isRunning,
    isComplete,
    start,
    pause,
  } = useBrushingTimer(handleBrushingComplete);

  const {
    currentSegment,
    phase,
    getSegmentForTime,
  } = useStoryProgression(currentChapter, isFirstChapter);

  // Update story progression based on timer
  useEffect(() => {
    if (isRunning) {
      getSegmentForTime(elapsedSeconds);
    }
  }, [elapsedSeconds, isRunning, getSegmentForTime]);

  // Play sounds on phase changes
  useEffect(() => {
    if (phase !== lastPhaseRef.current) {
      lastPhaseRef.current = phase;

      switch (phase) {
        case 'title':
          playSound('chapterStart');
          break;
        case 'cliffhanger':
        case 'teaser':
          playSound('storyTransition');
          break;
      }
    }
  }, [phase, playSound]);

  // Play sounds on segment changes (for brushing prompts)
  useEffect(() => {
    if (currentSegment?.id !== lastSegmentRef.current) {
      lastSegmentRef.current = currentSegment?.id ?? null;

      if (currentSegment?.brushingPrompt) {
        playSound('brushingPrompt');
      } else if (phase === 'story' && currentSegment) {
        playSound('storyTransition');
      }
    }
  }, [currentSegment, phase, playSound]);

  // Text-to-speech narration
  useEffect(() => {
    if (!narrationEnabled || !isRunning) return;

    let textToSpeak: string | null = null;

    switch (phase) {
      case 'recap':
        if (previousChapterSummary) {
          textToSpeak = `Previously... ${previousChapterSummary}`;
        }
        break;
      case 'title':
        if (currentChapter) {
          textToSpeak = `Chapter ${currentChapter.chapterNumber}: ${currentChapter.title}`;
        }
        break;
      case 'story':
        if (currentSegment) {
          // Combine story text with brushing prompt if present
          textToSpeak = currentSegment.text;
          if (currentSegment.brushingPrompt) {
            textToSpeak += ` ${currentSegment.brushingPrompt}`;
          }
        }
        break;
      case 'cliffhanger':
        if (currentChapter?.cliffhanger) {
          textToSpeak = currentChapter.cliffhanger;
        }
        break;
      case 'teaser':
        if (currentChapter?.nextChapterTeaser) {
          textToSpeak = `To be continued... ${currentChapter.nextChapterTeaser}`;
        }
        break;
    }

    // Only speak if we have new text
    if (textToSpeak && textToSpeak !== lastSpokenTextRef.current) {
      lastSpokenTextRef.current = textToSpeak;
      speak(textToSpeak);
    }
  }, [phase, currentSegment, currentChapter, previousChapterSummary, narrationEnabled, isRunning, speak]);

  // Stop narration when brushing completes or pauses
  useEffect(() => {
    if (!isRunning && !showCountdown) {
      pauseSpeaking();
    } else if (isRunning) {
      resumeSpeaking();
    }
  }, [isRunning, showCountdown, pauseSpeaking, resumeSpeaking]);

  // Cleanup narration on exit
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  // Countdown before starting
  useEffect(() => {
    if (!showCountdown) return;

    // Play initial countdown sound
    playSound('countdown');

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowCountdown(false);
          playSound('success'); // Start sound
          start();
          return 0;
        }
        playSound('countdown');
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showCountdown, start, playSound]);

  // Render countdown
  if (showCountdown) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary to-primary/80 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <p className="text-white/80 text-xl mb-4">Get ready to brush!</p>
          <motion.div
            key={countdown}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="text-9xl font-bold text-white"
          >
            {countdown}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Render completion screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-success to-success/80 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-8xl mb-6"
          >
            🎉
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-4">Amazing job!</h1>
          <p className="text-white/90 text-xl mb-8">
            You earned {pointsEarned} points!
          </p>

          {currentChapter && (
            <div className="bg-white/20 rounded-2xl p-6 mb-8 max-w-md">
              <p className="text-white/80 text-sm mb-2">Next time...</p>
              <p className="text-white text-lg italic">
                {currentChapter.nextChapterTeaser}
              </p>
            </div>
          )}

          <button
            onClick={onExit}
            className="bg-white text-success font-bold py-4 px-12 rounded-full text-xl shadow-lg"
          >
            Done!
          </button>
        </motion.div>
      </div>
    );
  }

  // Get background color based on world theme
  const getBackgroundClass = () => {
    switch (child?.activeWorldId) {
      case 'magical-forest':
        return 'from-emerald-500 to-emerald-700';
      case 'space-station':
        return 'from-indigo-600 to-purple-800';
      case 'underwater-kingdom':
        return 'from-cyan-500 to-blue-700';
      case 'dinosaur-valley':
        return 'from-amber-500 to-orange-700';
      case 'pirate-cove':
        return 'from-yellow-600 to-amber-800';
      default:
        return 'from-primary to-primary/80';
    }
  };

  // Render content based on phase
  const renderStoryContent = () => {
    switch (phase) {
      case 'recap':
        return (
          <motion.div
            key="recap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <p className="text-white/60 text-sm mb-2">Previously...</p>
            <p className="text-white text-xl italic leading-relaxed">
              {previousChapterSummary}
            </p>
          </motion.div>
        );

      case 'title':
        return (
          <motion.div
            key="title"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 12 }}
            className="text-center"
          >
            <p className="text-white/60 text-sm mb-2">
              Chapter {currentChapter?.chapterNumber}
            </p>
            <h2 className="text-3xl font-bold text-white">
              {currentChapter?.title}
            </h2>
          </motion.div>
        );

      case 'story':
        return (
          <motion.div
            key={`segment-${currentSegment?.id}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="text-center"
          >
            <p className="text-white text-2xl leading-relaxed mb-6">
              {currentSegment?.text}
            </p>
            {currentSegment?.brushingPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/20 rounded-xl p-4 mt-4"
              >
                <p className="text-accent font-bold text-lg">
                  {currentSegment.brushingPrompt}
                </p>
              </motion.div>
            )}
          </motion.div>
        );

      case 'cliffhanger':
        return (
          <motion.div
            key="cliffhanger"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <p className="text-white text-2xl italic leading-relaxed">
              {currentChapter?.cliffhanger}
            </p>
          </motion.div>
        );

      case 'teaser':
        return (
          <motion.div
            key="teaser"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <p className="text-white/60 text-lg mb-2">To be continued...</p>
            <p className="text-accent text-xl font-medium">
              {currentChapter?.nextChapterTeaser}
            </p>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-b ${getBackgroundClass()} flex flex-col p-6`}
    >
      {/* Header with progress and narration toggle */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <ProgressBar
              progress={progress}
              showTime
              timeRemaining={formatTime(remainingSeconds)}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (narrationEnabled) {
                stopSpeaking();
              }
              setNarrationEnabled(!narrationEnabled);
            }}
            className={`p-2 rounded-full transition-colors ${
              narrationEnabled ? 'bg-white/30 text-white' : 'bg-white/10 text-white/50'
            }`}
            title={narrationEnabled ? 'Turn off narration' : 'Turn on narration'}
          >
            {narrationEnabled ? (
              <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </motion.button>
        </div>
        {isTTSLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/60 text-xs text-center"
          >
            Loading narration...
          </motion.div>
        )}
      </div>

      {/* Story content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <AnimatePresence mode="wait">{renderStoryContent()}</AnimatePresence>
      </div>

      {/* Pet companion */}
      {pet && (
        <motion.div
          className="absolute bottom-24 right-6"
          animate={{
            y: [0, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className="bg-white/20 rounded-full p-4">
            <span className="text-4xl">
              {pet.id === 'sparkle' && '⭐'}
              {pet.id === 'bubbles' && '🐠'}
              {pet.id === 'cosmo' && '🤖'}
              {pet.id === 'fern' && '🐉'}
              {pet.id === 'captain-whiskers' && '🐱'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Pause button */}
      <div className="mt-auto pt-6">
        <button
          onClick={isRunning ? pause : onExit}
          className="w-full bg-white/20 text-white font-medium py-3 rounded-xl"
        >
          {isRunning ? 'Pause' : 'Exit'}
        </button>
      </div>
    </div>
  );
}

export default BrushingScreen;
