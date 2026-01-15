import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Pause, Play, X, Loader2 } from 'lucide-react';
import { useBrushingTimer, formatTime } from '../hooks/useBrushingTimer';
import { useStoryProgression } from '../hooks/useStoryProgression';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useAudioSplicing } from '../hooks/useAudioSplicing';
import { useChild } from '../context/ChildContext';
import { useAudio } from '../context/AudioContext';
import { usePets } from '../context/PetsContext';
import { useContent } from '../context/ContentContext';
import { ProgressBar } from '../components/ui/ProgressBar';
import { personalizeStory } from '../utils/storyGenerator';
import { calculateSessionPoints } from '../utils/pointsCalculator';
import { generateImagesForChapter, type ImageGenerationProgress } from '../services/imageGeneration';
import { getPetAudioUrl } from '../services/petAudio';

// Helper to replace any remaining placeholder tokens before TTS
const replaceStoryPlaceholders = (text: string, childName: string, petName: string): string => {
  return text
    .replace(/\[CHILD\]/g, childName)
    .replace(/\[PET\]/g, petName);
};

interface BrushingScreenProps {
  onComplete: (pointsEarned: number) => void;
  onExit: () => void;
}

export function BrushingScreen({ onComplete, onExit }: BrushingScreenProps) {
  const { child, updateStreak, addPoints, setCurrentStoryArc, completeChapter, updateStoryImages } = useChild();
  const { playSound } = useAudio();
  const { getPetById } = usePets();
  const { getStoriesForWorld, getStoryById } = useContent();
  const { speak, stop: stopSpeaking, pause: pauseSpeaking, resume: resumeSpeaking, isLoading: isTTSLoading, isSpeaking } = useTextToSpeech();
  const [showCountdown, setShowCountdown] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [narrationEnabled, setNarrationEnabled] = useState(true);
  const [isPreparingImages, setIsPreparingImages] = useState(true);
  const [imageProgress, setImageProgress] = useState<ImageGenerationProgress | null>(null);
  const [petNameAudioUrl, setPetNameAudioUrl] = useState<string | null>(null);
  const lastPhaseRef = useRef<string | null>(null);
  const lastSegmentRef = useRef<string | null>(null);
  const lastSpokenTextRef = useRef<string | null>(null);
  const imageGenerationStarted = useRef(false);
  const lastSplicedSegmentRef = useRef<string | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);

  // Audio splicing hook for pre-recorded narration with name insertion
  const {
    play: playSplicedAudio,
    stop: stopSplicedAudio,
    pause: pauseSplicedAudio,
    resume: resumeSplicedAudio,
    isPlaying: isSplicedAudioPlaying,
    isLoading: isSplicedAudioLoading,
  } = useAudioSplicing({
    childNameAudioUrl: child?.nameAudioUrl ?? null,
    petNameAudioUrl,
  });

  // Fetch pet audio URL based on the story arc's pet (not the current active pet)
  const storyPetId = child?.currentStoryArc?.petId ?? child?.activePetId;
  useEffect(() => {
    if (storyPetId) {
      getPetAudioUrl(storyPetId).then(setPetNameAudioUrl);
    }
  }, [storyPetId]);

  // Get or create story arc
  useEffect(() => {
    if (!child) return;

    // Create new story if needed
    if (!child.currentStoryArc) {
      const activePet = getPetById(child.activePetId);
      const stories = getStoriesForWorld(child.activeWorldId);

      if (stories.length > 0) {
        // Use the first available story from the database/content
        const storyArc = personalizeStory(
          stories[0],
          child.name,
          child.activePetId,
          activePet?.displayName ?? 'Friend'
        );
        setCurrentStoryArc(storyArc);
      } else {
        // No stories available for this world - skip loading and show error
        console.warn('[BrushingScreen] No stories available for world:', child.activeWorldId);
        setIsPreparingImages(false);
      }
    }
  }, [child, setCurrentStoryArc, getPetById, getStoriesForWorld]);

  // Derive chapter directly from context so it updates when images are added
  const chapterIndex = child?.currentStoryArc?.currentChapterIndex ?? 0;
  const currentChapter = child?.currentStoryArc?.chapters[chapterIndex] ?? null;

  // Use the story arc's pet, falling back to active pet for new stories
  const pet = storyPetId ? getPetById(storyPetId) : null;

  // Generate images for the current chapter
  useEffect(() => {
    console.log('[BrushingScreen] Image generation effect running', {
      hasStoryArc: !!child?.currentStoryArc,
      alreadyStarted: imageGenerationStarted.current,
    });

    if (!child?.currentStoryArc || imageGenerationStarted.current) return;

    const storyArc = child.currentStoryArc;
    const chapter = storyArc.chapters[storyArc.currentChapterIndex];

    console.log('[BrushingScreen] Chapter:', storyArc.currentChapterIndex, 'Segments:', chapter?.segments?.length);

    // Check if images already exist for this chapter
    const hasAllImages = chapter?.segments.every(s => s.imageUrl);
    console.log('[BrushingScreen] hasAllImages:', hasAllImages);
    if (hasAllImages) {
      setIsPreparingImages(false);
      return;
    }

    imageGenerationStarted.current = true;
    console.log('[BrushingScreen] Starting image generation...');

    // Generate images in the background with character context for avatar consistency
    generateImagesForChapter(
      storyArc.currentChapterIndex,
      storyArc,
      (progress) => setImageProgress(progress),
      child,
      pet
    ).then((imageUrlMap) => {
      if (imageUrlMap.size > 0) {
        updateStoryImages(imageUrlMap);
      }
      setIsPreparingImages(false);
    }).catch((error) => {
      console.error('Failed to generate images:', error);
      setIsPreparingImages(false);
    });
  }, [child?.currentStoryArc, updateStoryImages, child, pet]);

  const handleBrushingComplete = async () => {
    if (!child) return;

    // Play completion sound
    playSound('complete');

    // Update streak and calculate points
    const { newStreak } = await updateStreak();
    const isStoryArcComplete =
      child.currentStoryArc &&
      chapterIndex === child.currentStoryArc.totalChapters - 1;

    const points = calculateSessionPoints(
      newStreak,
      isStoryArcComplete ?? false,
      true, // isFirstBrushOfDay - simplified for now
      false
    );

    await addPoints(points.total);
    setPointsEarned(points.total);

    // Mark chapter as complete
    await completeChapter(chapterIndex);

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
    resume,
  } = useBrushingTimer(handleBrushingComplete);

  const {
    currentSegment,
    phase,
    getSegmentForTime,
  } = useStoryProgression(currentChapter);

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

  // Text-to-speech narration (with audio splicing support for story segments)
  useEffect(() => {
    if (!narrationEnabled || !isRunning || !child) return;

    const childName = child.name;
    const petName = pet?.displayName ?? 'Friend';

    // For story segments with pre-recorded audio, use gapless audio splicing
    if (phase === 'story' && currentSegment?.narrationSequence && currentSegment.narrationSequence.length > 0) {
      // Only play if this is a new segment
      if (currentSegment.id !== lastSplicedSegmentRef.current) {
        lastSplicedSegmentRef.current = currentSegment.id;
        lastSpokenTextRef.current = null; // Reset TTS ref so we don't duplicate
        playSplicedAudio(currentSegment.narrationSequence);
      }
      return;
    }

    // Fall back to TTS for segments without pre-recorded audio
    let textToSpeak: string | null = null;

    switch (phase) {
      case 'recap':
        if (currentChapter?.recap) {
          textToSpeak = `Last time... ${currentChapter.recap}`;
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
      lastSplicedSegmentRef.current = null; // Reset splicing ref
      // Ensure any remaining placeholders are replaced before TTS
      const finalText = replaceStoryPlaceholders(textToSpeak, childName, petName);
      lastSpokenTextRef.current = textToSpeak;
      speak(finalText);
    }
  }, [phase, currentSegment, currentChapter, narrationEnabled, isRunning, speak, playSplicedAudio, child, pet]);

  // Stop narration when brushing completes or pauses
  useEffect(() => {
    if (!isRunning && !showCountdown) {
      pauseSpeaking();
      pauseSplicedAudio();
    } else if (isRunning) {
      resumeSpeaking();
      resumeSplicedAudio();
    }
  }, [isRunning, showCountdown, pauseSpeaking, resumeSpeaking, pauseSplicedAudio, resumeSplicedAudio]);

  // Cleanup narration on exit
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopSplicedAudio();
    };
  }, [stopSpeaking, stopSplicedAudio]);

  // Backfill background music URL for existing story arcs that don't have it
  useEffect(() => {
    if (!child?.currentStoryArc) return;
    if (child.currentStoryArc.backgroundMusicUrl) return; // Already has music URL

    // Look up the story template to get the music URL
    const storyTemplate = getStoryById(child.currentStoryArc.storyTemplateId);
    if (storyTemplate?.backgroundMusicUrl) {
      console.log('[BrushingScreen] Backfilling background music URL from template:', storyTemplate.backgroundMusicUrl);
      // Update the story arc with the music URL
      setCurrentStoryArc({
        ...child.currentStoryArc,
        backgroundMusicUrl: storyTemplate.backgroundMusicUrl,
      });
    }
  }, [child?.currentStoryArc, getStoryById, setCurrentStoryArc]);

  // Background music playback
  useEffect(() => {
    const musicUrl = child?.currentStoryArc?.backgroundMusicUrl;
    console.log('[BrushingScreen] Background music URL:', musicUrl);

    if (!musicUrl) {
      console.log('[BrushingScreen] No background music URL found');
      return;
    }

    // Create audio element if it doesn't exist
    if (!backgroundMusicRef.current) {
      console.log('[BrushingScreen] Creating audio element for:', musicUrl);
      backgroundMusicRef.current = new Audio(musicUrl);
      backgroundMusicRef.current.loop = true;
      backgroundMusicRef.current.volume = 0.15; // Low volume so narration is clear
    }

    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
    };
  }, [child?.currentStoryArc?.backgroundMusicUrl]);

  // Start/pause background music with brushing
  useEffect(() => {
    if (!backgroundMusicRef.current) return;

    if (isRunning && !showCountdown) {
      backgroundMusicRef.current.play().catch(console.error);
    } else {
      backgroundMusicRef.current.pause();
    }
  }, [isRunning, showCountdown]);

  // Countdown before starting (wait for images to be ready first)
  useEffect(() => {
    if (!showCountdown || isPreparingImages) return;

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
  }, [showCountdown, isPreparingImages, start, playSound]);

  // Render image preparation screen
  if (isPreparingImages) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary to-primary/80 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="mb-6"
          >
            <Loader2 className="w-16 h-16 text-white" />
          </motion.div>
          <p className="text-white text-xl mb-2">Preparing your adventure...</p>
          {imageProgress && (
            <p className="text-white/60 text-sm">
              Creating scene {imageProgress.completed + 1} of {imageProgress.total}
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  // Render error if no story is available
  if (!currentChapter && !isPreparingImages) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary to-primary/80 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <p className="text-6xl mb-6">📚</p>
          <h1 className="text-2xl font-bold text-white mb-4">No Stories Yet!</h1>
          <p className="text-white/80 text-lg mb-8">
            Stories for this world are coming soon.
          </p>
          <button
            onClick={onExit}
            className="bg-white text-primary font-bold py-3 px-8 rounded-full text-lg shadow-lg"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

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
            <p className="text-white/60 text-sm mb-2">Last time...</p>
            <p className="text-white text-xl italic leading-relaxed">
              {currentChapter?.recap}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center flex flex-col items-center justify-end flex-1"
          >
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 max-w-lg">
              <p className="text-white text-xl leading-relaxed mb-2 drop-shadow-lg">
                {currentSegment?.text}
              </p>
              {currentSegment?.brushingPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/20 rounded-xl p-3 mt-2"
                >
                  <p className="text-accent font-bold text-lg drop-shadow">
                    {currentSegment.brushingPrompt}
                  </p>
                </motion.div>
              )}
            </div>
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

  // Get background image for story phase
  const backgroundImage = phase === 'story' && currentSegment?.imageUrl
    ? currentSegment.imageUrl
    : null;

  return (
    <div
      className={`min-h-screen bg-gradient-to-b ${getBackgroundClass()} flex flex-col p-6 relative overflow-hidden`}
    >
      {/* Full-screen background image for story phase */}
      <AnimatePresence mode="wait">
        {backgroundImage && (
          <motion.div
            key={backgroundImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-0"
          >
            <img
              src={backgroundImage}
              alt=""
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header with progress and narration toggle */}
      <div className="relative z-10 mb-8">
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
                stopSplicedAudio();
              }
              setNarrationEnabled(!narrationEnabled);
            }}
            className={`p-2 rounded-full transition-colors ${
              narrationEnabled ? 'bg-white/30 text-white' : 'bg-white/10 text-white/50'
            }`}
            title={narrationEnabled ? 'Turn off narration' : 'Turn on narration'}
          >
            {narrationEnabled ? (
              <Volume2 className={`w-5 h-5 ${(isSpeaking || isSplicedAudioPlaying) ? 'animate-pulse' : ''}`} />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </motion.button>
        </div>
        {(isTTSLoading || isSplicedAudioLoading) && (
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
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        <AnimatePresence mode="wait">{renderStoryContent()}</AnimatePresence>
      </div>

      {/* Pet companion */}
      {pet && (
        <motion.div
          className="absolute bottom-24 right-6 z-10"
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

      {/* Control buttons */}
      <div className="relative z-10 mt-auto pt-6 flex gap-3">
        <button
          onClick={isRunning ? pause : resume}
          className="flex-1 bg-white/20 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Resume
            </>
          )}
        </button>
        <button
          onClick={onExit}
          className="bg-white/10 text-white/80 font-medium py-3 px-4 rounded-xl flex items-center justify-center"
          title="Exit"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default BrushingScreen;
