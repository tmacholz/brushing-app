import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Star, ChevronDown, Check, PartyPopper, Globe, BookOpen, RotateCcw } from 'lucide-react';
import { useChild } from '../context/ChildContext';
import { useAudio } from '../context/AudioContext';
import { usePets } from '../context/PetsContext';
import { BuddyCard } from '../components/Pets/BuddyCard';
import { LevelUpCelebration } from '../components/Pets/LevelUpCelebration';
import { buddyPet, getPetProgress, markLevelUpSeen, pendingLevelUp, petBrushes, withPetProgress } from '../utils/petProgress';
import { useContent } from '../context/ContentContext';
import { getStreakLevel } from '../utils/streakCalculator';
import { personalizeStory } from '../utils/storyGenerator';
import { BonusWheel } from '../components/BonusWheel/BonusWheel';
import { primeSpeechFallback, usePuzzleVoice } from '../hooks/usePuzzleVoice';
import { PlayModeToggle } from '../components/ui/PlayModeToggle';
import { PuzzleBoard } from '../components/Puzzle/PuzzleBoard';
import { PuzzleChooser } from '../components/Puzzle/PuzzleChooser';
import { UnlockPuzzleModal } from '../components/Puzzle/UnlockPuzzleModal';
import { PieceViewer } from '../components/Puzzle/PieceViewer';
import { getPuzzleById, secretPieceFor, foundVoice, friendVoice, voiceClipUrl, type Puzzle } from '../data/puzzles';
import { getPuzzleProgress, getPuzzleChoices, isPuzzleFinished, startPuzzle, withPuzzleProgress, getNextPiece, choosePiece, isPuzzleUnlocked, unlockPuzzle, puzzlesToFinishFor } from '../utils/puzzleProgress';
import type { ScreenName, StoryTemplate, ChestReward, PlayMode } from '../types';

interface HomeScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { child, allChildren, hasMultipleChildren, setCurrentStoryArc, clearLastCompletedStoryInfo, updateChild, claimChestReward, replayChapter, clearReplayState } = useChild();
  const { playSound } = useAudio();
  const { getPetById } = usePets();
  const { getWorldById, getStoriesForWorld } = useContent();

  // DEV: Test wheel state
  const [showTestWheel, setShowTestWheel] = useState(false);

  // Replay chapter modal state
  const [replayChapterIndex, setReplayChapterIndex] = useState<number | null>(null);
  const [switchingPuzzle, setSwitchingPuzzle] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<Puzzle | null>(null);
  const [viewingPiece, setViewingPiece] = useState<number | null>(null);
  const { playSequence: playVoiceSequence, stop: stopVoice } = usePuzzleVoice(true);

  // Set by the puzzle brushing screen so the new piece snaps into the board.
  const location = useLocation();
  const newPieceIndex = (location.state as { newPiece?: number } | null)?.newPiece ?? null;

  if (!child) return null;

  // DEV: Test wheel handlers
  const handleTestWheelReward = async (reward: ChestReward) => {
    await claimChestReward(reward);
  };

  const handleTestWheelComplete = () => {
    setShowTestWheel(false);
  };

  // Get the next unfinished story in a world (excludes completed stories)
  const getNextStoryInWorld = (worldId: string): StoryTemplate | null => {
    const stories = getStoriesForWorld(worldId);
    const unfinishedStory = stories.find(
      (story) => !child.completedStoryArcs.includes(story.id)
    );
    return unfinishedStory ?? null;
  };

  // Check if there's a just-completed story to show a prompt for
  const completedStoryInfo = child.lastCompletedStoryInfo;
  const completedWorld = completedStoryInfo ? getWorldById(completedStoryInfo.worldId) : null;
  const nextStoryInWorld = completedStoryInfo ? getNextStoryInWorld(completedStoryInfo.worldId) : null;

  const handleStartNextStory = () => {
    if (!nextStoryInWorld || !completedStoryInfo) return;
    playSound('success');

    const activePet = getPetById(child.activePetId);

    // Update active world and clear the completed story info
    updateChild({ activeWorldId: completedStoryInfo.worldId });

    // Create new story arc from the story template
    const newStoryArc = personalizeStory(
      nextStoryInWorld,
      child.name,
      child.activePetId,
      activePet?.displayName ?? 'Friend'
    );

    setCurrentStoryArc(newStoryArc);
    clearLastCompletedStoryInfo();
    onNavigate('brushing');
  };

  const handlePickNewStory = () => {
    playSound('tap');
    clearLastCompletedStoryInfo();
    onNavigate('story-world-select');
  };

  const handleNavigate = (screen: ScreenName) => {
    playSound('tap');
    onNavigate(screen);
  };

  const handleStartBrushing = () => {
    playSound('success');
    // Lets the device voice speak later if a recorded clip is missing (iOS).
    if (child.mode === 'puzzle') primeSpeechFallback();
    clearReplayState();
    onNavigate('brushing');
  };

  const handleReplayChapter = async () => {
    if (replayChapterIndex === null) return;
    playSound('success');
    await replayChapter(replayChapterIndex);
    setReplayChapterIndex(null);
    onNavigate('brushing');
  };

  // Puzzle mode ("ways to play")
  const isPuzzleMode = child.mode === 'puzzle';
  const puzzleProgress = getPuzzleProgress(child);
  const currentPuzzle = getPuzzleById(puzzleProgress.currentPuzzleId);
  const puzzleFinished = isPuzzleFinished(puzzleProgress);
  const siblings = allChildren
    .filter((c) => c.id !== child.id)
    .map((c) => ({ name: c.name, progress: getPuzzleProgress(c) }));
  const puzzleChoices = getPuzzleChoices(puzzleProgress, siblings);

  const handleModeChange = (mode: PlayMode) => {
    playSound('tap');
    updateChild({ mode });
  };

  const handleChoosePuzzle = (puzzle: Puzzle) => {
    if (!isPuzzleUnlocked(puzzleProgress, puzzle)) {
      playSound('tap');
      setUnlockTarget(puzzle);
      return;
    }
    setSwitchingPuzzle(false);
    if (puzzle.id === puzzleProgress.currentPuzzleId && !puzzleFinished) {
      playSound('tap');
      return;
    }
    playSound('success');
    updateChild({ modeProgress: withPuzzleProgress(child, startPuzzle(puzzleProgress, puzzle.id)) });
    setSwitchingPuzzle(false);
  };
  const choosingPuzzle = !currentPuzzle || puzzleFinished || switchingPuzzle;

  // Buy a locked puzzle (points or a wheel key) and start it straight away.
  const handleUnlockPuzzle = (useKey: boolean) => {
    if (!unlockTarget) return;
    const result = unlockPuzzle(puzzleProgress, unlockTarget.id, child.points, useKey);
    if (!result) return;
    playSound('success');
    updateChild({
      points: child.points - result.cost,
      modeProgress: withPuzzleProgress(child, startPuzzle(result.next, unlockTarget.id)),
    });
    setUnlockTarget(null);
    setSwitchingPuzzle(false);
  };

  // Kids tap a mystery square to choose which piece the next brush finds.
  const handlePickPiece = (index: number) => {
    playSound('tap');
    updateChild({ modeProgress: withPuzzleProgress(child, choosePiece(puzzleProgress, index)) });
  };

  const pet = getPetById(child.activePetId);
  const petProgress = getPetProgress(child);
  const buddy = buddyPet(child, pet?.name);
  const buddyCard = (
    <div className="mb-5">
      <BuddyCard pet={buddy} brushes={petBrushes(petProgress, buddy.id)} onClick={() => handleNavigate('pet-select')} />
    </div>
  );
  const levelUp = pendingLevelUp(child);
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

      {/* Buddy pet: grows with every brush (in puzzle mode it sits below the board and button) */}
      {!isPuzzleMode && buddyCard}

      {levelUp && (
        <LevelUpCelebration
          pet={levelUp.pet}
          stage={levelUp.stage}
          onDone={() => updateChild({ modeProgress: withPetProgress(child.modeProgress, markLevelUpSeen(child, levelUp.pet.id, levelUp.stage)) })}
        />
      )}

      {/* Way to play */}
      <div className="mb-5 max-w-xs w-full mx-auto">
        <PlayModeToggle mode={child.mode} onChange={handleModeChange} compact />
      </div>

      {isPuzzleMode ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col gap-4"
        >
          {currentPuzzle && !switchingPuzzle && (
            <>
              <div className="text-center">
                <p className="text-xl font-bold text-text">{currentPuzzle.title}</p>
                {puzzleFinished && <p className="text-sm text-text/60">You found everyone! 🎉</p>}
                {!puzzleFinished && (
                  <button
                    onClick={() => { playSound('tap'); setSwitchingPuzzle(true); }}
                    className="mt-1 text-sm font-semibold text-primary underline underline-offset-2"
                  >
                    Switch puzzle
                  </button>
                )}
              </div>
              <PuzzleBoard
                puzzle={currentPuzzle}
                found={puzzleProgress.found}
                nextPiece={puzzleFinished ? null : getNextPiece(puzzleProgress)}
                onPick={puzzleFinished ? undefined : handlePickPiece}
                onView={(i) => {
                  playSound('tap');
                  setViewingPiece(i);
                  // Say the piece's name ("You found ...!"), plus the hidden friend if it's here.
                  // Clips are passed as URLs so play() starts inside this tap, which iPhone needs.
                  const hasFriend = puzzleProgress.friends.includes(currentPuzzle.id) && secretPieceFor(child.id, currentPuzzle.id) === i;
                  const lines = [foundVoice(currentPuzzle, i), ...(hasFriend ? [friendVoice(currentPuzzle)] : [])];
                  playVoiceSequence(lines.map((l) => ({ url: voiceClipUrl(l.key) })));
                }}
                friendAt={puzzleProgress.friends.includes(currentPuzzle.id) ? secretPieceFor(child.id, currentPuzzle.id) : null}
                justAdded={newPieceIndex}
              />
              {viewingPiece !== null && (
                <PieceViewer
                  puzzle={currentPuzzle}
                  index={viewingPiece}
                  withFriend={puzzleProgress.friends.includes(currentPuzzle.id) && secretPieceFor(child.id, currentPuzzle.id) === viewingPiece}
                  onClose={() => { stopVoice(); setViewingPiece(null); }}
                />
              )}
            </>
          )}

          {choosingPuzzle && (
            <div>
              <p className="text-lg font-bold text-text mb-2">
                {switchingPuzzle
                  ? 'All puzzles'
                  : currentPuzzle ? 'Pick your next puzzle!' : 'Pick a puzzle to start!'}
              </p>
              {puzzleProgress.keys > 0 && (
                <p className="text-sm font-semibold text-amber-600 mb-2">
                  You have {puzzleProgress.keys} 🔑 {puzzleProgress.keys === 1 ? 'key' : 'keys'}! Tap a 🔒 puzzle to use it.
                </p>
              )}
              {switchingPuzzle && puzzleProgress.piecesFound > 0 && (
                <p className="text-sm text-text/60 mb-2">
                  Your {puzzleProgress.piecesFound} {puzzleProgress.piecesFound === 1 ? 'piece stays' : 'pieces stay'} saved in {currentPuzzle?.title}.
                </p>
              )}
              <PuzzleChooser
                choices={puzzleChoices}
                onChoose={handleChoosePuzzle}
              />
              {switchingPuzzle && (
                <button
                  onClick={() => { playSound('tap'); setSwitchingPuzzle(false); }}
                  className="mt-3 w-full py-3 rounded-2xl bg-white/70 font-bold text-text"
                >
                  Keep {currentPuzzle?.title}
                </button>
              )}
            </div>
          )}
        </motion.div>
      ) : (
        <>
      {/* Chapter Progression - Responsive */}
      {hasStoryInProgress && child.currentStoryArc && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-md p-4 mb-6"
        >
          <p className="text-sm font-medium text-text mb-3">
            {child.currentStoryArc.title}
          </p>

          {/* Horizontal layout for larger screens */}
          <div className="hidden md:block">
            <div className="flex items-start justify-between">
              {child.currentStoryArc.chapters.map((chapter, index) => {
                const isCompleted = chapter.isRead;
                const isCurrent = index === currentChapter && !chapter.isRead;

                return (
                  <div key={index} className="flex items-start flex-1">
                    {/* Circle and label */}
                    <div
                      className={`flex flex-col items-center ${isCompleted ? 'cursor-pointer' : ''}`}
                      onClick={isCompleted ? () => setReplayChapterIndex(index) : undefined}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        whileHover={isCompleted ? { scale: 1.1 } : undefined}
                        whileTap={isCompleted ? { scale: 0.95 } : undefined}
                        className={`relative w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? 'bg-accent text-white'
                            : isCurrent
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-bold">{index + 1}</span>
                        )}
                        {isCurrent && (
                          <motion.div
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 rounded-full bg-primary/30"
                          />
                        )}
                      </motion.div>
                      {/* Chapter name */}
                      <p
                        className={`mt-2 text-xs text-center max-w-[80px] leading-tight ${
                          isCompleted
                            ? 'text-accent'
                            : isCurrent
                            ? 'text-primary font-medium'
                            : 'text-text/40'
                        }`}
                      >
                        {chapter.title}
                      </p>
                    </div>

                    {/* Connector line */}
                    {index < totalChapters - 1 && (
                      <div
                        className={`flex-1 h-1 mx-2 mt-5 rounded ${
                          index < currentChapter ? 'bg-accent' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vertical layout for mobile */}
          <div className="flex flex-col md:hidden">
            {child.currentStoryArc.chapters.map((chapter, index) => {
              const isCompleted = chapter.isRead;
              const isCurrent = index === currentChapter && !chapter.isRead;

              return (
                <div
                  key={index}
                  className={`flex items-stretch ${isCompleted ? 'cursor-pointer' : ''}`}
                  onClick={isCompleted ? () => setReplayChapterIndex(index) : undefined}
                >
                  {/* Circle and connector column */}
                  <div className="flex flex-col items-center mr-3">
                    {/* Circle */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      whileHover={isCompleted ? { scale: 1.1 } : undefined}
                      whileTap={isCompleted ? { scale: 0.95 } : undefined}
                      className={`relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
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
                      {isCurrent && (
                        <motion.div
                          animate={{ scale: [1, 1.4, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-full bg-primary/30"
                        />
                      )}
                    </motion.div>

                    {/* Vertical connector line */}
                    {index < totalChapters - 1 && (
                      <div
                        className={`w-0.5 flex-1 min-h-[12px] ${
                          index < currentChapter ? 'bg-accent' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>

                  {/* Chapter label */}
                  <div className={`pb-3 pt-1 ${index === totalChapters - 1 ? 'pb-0' : ''}`}>
                    <p
                      className={`text-sm font-medium ${
                        isCompleted
                          ? 'text-accent'
                          : isCurrent
                          ? 'text-primary'
                          : 'text-text/40'
                      }`}
                    >
                      {chapter.title}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-primary/60">Up next</p>
                    )}
                    {isCompleted && (
                      <p className="text-xs text-accent/60">Complete</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Story completion prompt - shows after finishing a story */}
      {!hasStoryInProgress && completedStoryInfo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl p-5 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <PartyPopper className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-text font-bold">Story Complete!</p>
              <p className="text-text/60 text-sm">
                You finished "{completedStoryInfo.title}"
              </p>
            </div>
          </div>

          <p className="text-text/70 text-sm mb-4">
            What would you like to do next?
          </p>

          <div className="flex flex-col gap-3">
            {/* Next story in same world button - only if there's another story */}
            {nextStoryInWorld && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartNextStory}
                className="flex items-center gap-3 bg-primary text-white p-4 rounded-xl"
              >
                <BookOpen className="w-5 h-5" />
                <div className="text-left flex-1">
                  <p className="font-medium">Next Story</p>
                  <p className="text-sm text-white/70">
                    {nextStoryInWorld.title} in {completedWorld?.displayName}
                  </p>
                </div>
              </motion.button>
            )}

            {/* Pick new world/story button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePickNewStory}
              className="flex items-center gap-3 bg-white border-2 border-primary/20 text-text p-4 rounded-xl"
            >
              <Globe className="w-5 h-5 text-primary" />
              <div className="text-left flex-1">
                <p className="font-medium">Pick a New Story</p>
                <p className="text-sm text-text/60">
                  Explore other worlds
                </p>
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* No story prompt - only when no story in progress and no just-completed story */}
      {!hasStoryInProgress && !completedStoryInfo && (
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

        </>
      )}

      {/* Spacer to push button down */}
      <div className="flex-1" />

      {/* Start Brushing Button - hide when showing a completion prompt or puzzle chooser */}
      {(isPuzzleMode ? currentPuzzle && !puzzleFinished && !switchingPuzzle : !completedStoryInfo) && (
        <>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartBrushing}
            className={`w-full ${isPuzzleMode ? 'mt-6' : ''} bg-gradient-to-r from-primary to-primary/80 text-white text-xl font-bold py-5 rounded-2xl shadow-lg`}
          >
            {isPuzzleMode
              ? `FIND PIECE ${puzzleProgress.piecesFound + 1}`
              : hasStoryInProgress ? 'CONTINUE STORY' : 'START BRUSHING'}
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
        </>
      )}

      {isPuzzleMode && <div className="mt-6">{buddyCard}</div>}

      {/* DEV: Test Wheel Button (local dev builds only) */}
      {import.meta.env.DEV && (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={() => setShowTestWheel(true)}
        className="mt-4 mx-auto px-4 py-2 bg-purple-100 text-purple-600 text-xs font-medium rounded-full border border-purple-200"
      >
        🎰 Test Wheel (Dev)
      </motion.button>
      )}

      {/* DEV: Test Wheel Modal */}
      {unlockTarget && (
        <UnlockPuzzleModal
          puzzle={unlockTarget}
          points={child.points}
          keys={puzzleProgress.keys}
          toFinish={puzzlesToFinishFor(puzzleProgress, unlockTarget)}
          onUnlock={handleUnlockPuzzle}
          onClose={() => setUnlockTarget(null)}
        />
      )}

      {showTestWheel && (
        <BonusWheel
          tokensAvailable={3}
          worldId={child.activeWorldId}
          collectedStickers={child.collectedStickers}
          collectedAccessories={child.collectedAccessories}
          onRewardClaimed={handleTestWheelReward}
          onComplete={handleTestWheelComplete}
        />
      )}

      {/* Replay Chapter Confirmation Modal */}
      <AnimatePresence>
        {replayChapterIndex !== null && child.currentStoryArc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setReplayChapterIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-text">
                  Replay "{child.currentStoryArc.chapters[replayChapterIndex]?.title}"?
                </h3>
              </div>

              <p className="text-text/70 text-sm mb-6">
                You'll watch this chapter again before continuing your story.
              </p>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setReplayChapterIndex(null)}
                  className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-text font-medium"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReplayChapter}
                  className="flex-1 py-3 px-4 rounded-xl bg-accent text-white font-medium"
                >
                  Replay
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HomeScreen;
