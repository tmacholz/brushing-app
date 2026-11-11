// Puzzle mode brushing session: 2 minutes in four 30-second stages that follow
// the mouth quadrants. Each stage scrubs the foam off one quarter of today's
// puzzle piece; at the end the piece is revealed by name and added to the board.
// Rewards (points, streak, chore check-in, bonus wheel, mystery chest) match
// story mode.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, X, Volume2, VolumeX } from 'lucide-react';
import { useBrushingTimer } from '../hooks/useBrushingTimer';
import { usePuzzleVoice } from '../hooks/usePuzzleVoice';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import { useChild } from '../context/ChildContext';
import { useAudio } from '../context/AudioContext';
import { MysteryChest } from '../components/MysteryChest';
import { TaskCheckIn } from '../components/TaskCheckIn';
import { BonusWheel } from '../components/BonusWheel';
import { usePets } from '../context/PetsContext';
import { FriendBadge } from '../components/Puzzle/FriendBadge';
import { PieceArt, FoamQuadrant, MouthMap } from '../components/Puzzle/PuzzleArt';
import { getPuzzleById, PIECES_PER_PUZZLE, BRUSH_STAGES, PUZZLE_MUSIC_URL, FANFARE_URL, getReadyVoice, greatJobVoice, stageVoice, foundVoice, finishedVoice, friendVoice, secretPieceFor, type VoiceLine } from '../data/puzzles';
import { getPuzzleProgress, withPuzzleProgress, addPiece, getNextPiece, addPuzzleKey, hasLockedPuzzles } from '../utils/puzzleProgress';
import { calculateSessionPoints, PUZZLE_COMPLETION_BONUS } from '../utils/pointsCalculator';
import { isToday } from '../utils/streakCalculator';
import type { ChestReward, TaskCheckInResult } from '../types';
import { resolveTaskConfig, pickTasksForBrushing } from '../utils/tasks';
import { addSnacks, setBuddy, withPetProgress } from '../utils/petProgress';
import { friendPetId, getRosterPet } from '../data/petRoster';
import { PetFeeding } from '../components/Pets/PetFeeding';

const TOTAL_SECONDS = 120;
const STAGE_SECONDS = TOTAL_SECONDS / BRUSH_STAGES.length;

// ?fast speeds the timer up 10x so a whole session can be checked in 12 seconds.
const TICK_MS = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('fast') ? 100 : 1000;

type Phase = 'countdown' | 'brushing' | 'reveal' | 'friend' | 'checkin' | 'wheel' | 'chest' | 'feed';

interface PuzzleBrushingScreenProps {
  onComplete: (newPieceIndex: number | null) => void;
  onExit: () => void;
}

export function PuzzleBrushingScreen({ onComplete, onExit }: PuzzleBrushingScreenProps) {
  const { child, updateStreak, addPoints, updateChild, claimChestReward } = useChild();
  const { playSound, isMuted } = useAudio();
  const { getPetById } = usePets();

  // Freeze the puzzle and progress at the start of the session.
  const [startProgress] = useState(() => getPuzzleProgress(child));
  const puzzle = getPuzzleById(startProgress.currentPuzzleId);
  const pieceIndex = getNextPiece(startProgress);
  const pieceNumber = Math.min(startProgress.found.length + 1, PIECES_PER_PUZZLE);
  const piece = puzzle?.pieces[pieceIndex];
  // One piece per puzzle hides a collectible friend (a different piece for each kid).
  const secretPiece = child && puzzle ? secretPieceFor(child.id, puzzle.id) : -1;
  const [foundFriend, setFoundFriend] = useState(false);

  const [phase, setPhase] = useState<Phase>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [voiceOn, setVoiceOn] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [puzzleDone, setPuzzleDone] = useState(false);
  const [tokensEarned, setTokensEarned] = useState(0);
  const completedRef = useRef(false);
  const exitConfirmRef = useRef(false);
  useEffect(() => { exitConfirmRef.current = showExitConfirm; }, [showExitConfirm]);
  // Voice lines are pre-recorded clips, so brushing never spends TTS quota.
  const { play: playVoice, playSequence, preload: preloadVoice, stop: stopSpeaking } = usePuzzleVoice(voiceOn);
  const say = useCallback((line: VoiceLine) => {
    playVoice(line).catch(() => { /* chime already played; voice is a bonus */ });
  }, [playVoice]);

  const handleTimerComplete = useCallback(async () => {
    if (completedRef.current || !child || !puzzle) return;
    completedRef.current = true;
    playSound('complete');

    const isFirstBrushOfDay = !isToday(child.lastBrushDate);
    const { newStreak } = await updateStreak();
    const { next, completed, foundFriend: gotFriend } = addPiece(startProgress, secretPiece);
    const points = calculateSessionPoints(newStreak, false, isFirstBrushOfDay, false);
    const total = points.total + (completed ? PUZZLE_COMPLETION_BONUS : 0);
    await addPoints(total);
    // Every finished brush puts a snack in the bag, fed to a pet at the end.
    await updateChild({ modeProgress: withPetProgress(withPuzzleProgress(child, next), addSnacks(child, 1)) });

    setPointsEarned(total);
    setPuzzleDone(completed);
    setFoundFriend(gotFriend);
    setPhase('reveal');
    // Fanfare, "Great job!", then the piece's name.
    const shownAt = Date.now();
    const celebration = playSequence([{ url: FANFARE_URL }, greatJobVoice, foundVoice(puzzle, pieceIndex)]).catch(() => {});
    const afterCelebration = (minMs: number, fn: () => void) => {
      void celebration.then(() => setTimeout(fn, Math.max(400, minMs - (Date.now() - shownAt))));
    };
    if (gotFriend) {
      // The piece first, then the surprise: the hidden friend pops out.
      afterCelebration(2600, () => {
        setPhase((ph) => (ph === 'reveal' ? 'friend' : ph));
        playSound('success');
        say(friendVoice(puzzle));
      });
    } else if (completed) {
      afterCelebration(2200, () => say(finishedVoice(puzzle)));
    }
  }, [child, puzzle, pieceIndex, secretPiece, startProgress, playSound, updateStreak, addPoints, updateChild, say, playSequence]);

  const { elapsedSeconds, isRunning, start, pause, resume } = useBrushingTimer(handleTimerComplete, undefined, TICK_MS);

  // Lively music while actually brushing; fades out on pause and at the end.
  useBackgroundMusic(PUZZLE_MUSIC_URL, phase === 'brushing' && isRunning && voiceOn && !isMuted);

  // 3-2-1, warming the voice clips meanwhile so they play on time.
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (puzzle) {
      say(getReadyVoice);
      BRUSH_STAGES.forEach((_, s) => preloadVoice(stageVoice(s)));
      preloadVoice(greatJobVoice);
      preloadVoice(foundVoice(puzzle, pieceIndex));
      if (pieceIndex === secretPiece) preloadVoice(friendVoice(puzzle));
    }
    playSound('countdown');
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          setPhase('brushing');
          if (!exitConfirmRef.current) start();
          return 0;
        }
        playSound('countdown');
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const stage = Math.min(BRUSH_STAGES.length - 1, Math.floor(elapsedSeconds / STAGE_SECONDS));
  const lastStageRef = useRef(-1);
  useEffect(() => {
    if (phase !== 'brushing' || stage === lastStageRef.current) return;
    lastStageRef.current = stage;
    playSound('brushingPrompt');
    say(stageVoice(stage));
  }, [phase, stage, playSound, say]);

  const stageProgress = (q: number) => Math.max(0, Math.min(1, (elapsedSeconds - q * STAGE_SECONDS) / STAGE_SECONDS));

  // The 2 random questions for this brushing (re-picked only if the config changes)
  const taskConfigKey = JSON.stringify(child?.taskConfig ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const checkInTasks = useMemo(() => pickTasksForBrushing(resolveTaskConfig(child?.taskConfig)), [taskConfigKey]);
  const bonusEnabled = checkInTasks.length > 0;
  const pet = child ? getPetById(child.activePetId) : undefined;

  const finish = () => {
    stopSpeaking();
    onComplete(pieceIndex);
  };

  const handleReward = async (reward: ChestReward) => {
    if (reward.type === 'puzzleKey') {
      if (child) await updateChild({ modeProgress: withPuzzleProgress(child, addPuzzleKey(getPuzzleProgress(child))) });
      return;
    }
    await claimChestReward(reward);
    if (reward.type === 'points') setPointsEarned((p) => p + reward.amount);
  };

  const remaining = Math.max(0, TOTAL_SECONDS - elapsedSeconds);
  const timeLabel = useMemo(() => `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`, [remaining]);
  const ringPct = (elapsedSeconds / TOTAL_SECONDS) * 100;

  if (!child) return null;

  if (!puzzle || !piece) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary to-primary/80 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-6xl mb-6">🧩</p>
        <h1 className="text-2xl font-bold text-white mb-4">Pick a puzzle first!</h1>
        <button onClick={onExit} className="bg-white text-primary font-bold py-3 px-8 rounded-full text-lg shadow-lg">
          Go Back
        </button>
      </div>
    );
  }

  if (phase === 'checkin') {
    return (
      <TaskCheckIn
        tasks={checkInTasks}
        pet={pet ?? null}
        voice={voiceOn}
        onComplete={(_r: TaskCheckInResult[], tokens: number) => {
          setTokensEarned(tokens);
          setPhase('wheel');
        }}
      />
    );
  }
  if (phase === 'wheel') {
    return (
      <BonusWheel
        tokensAvailable={tokensEarned}
        worldId={child.activeWorldId}
        collectedStickers={child.collectedStickers}
        collectedAccessories={child.collectedAccessories}
        offerPuzzleKey={hasLockedPuzzles(getPuzzleProgress(child))}
        onRewardClaimed={handleReward}
        onComplete={() => setPhase('feed')}
      />
    );
  }
  if (phase === 'chest') {
    return (
      <MysteryChest
        worldId={child.activeWorldId}
        collectedStickers={child.collectedStickers}
        collectedAccessories={child.collectedAccessories}
        onRewardClaimed={handleReward}
        onClose={() => setPhase('feed')}
      />
    );
  }
  if (phase === 'feed') {
    return <PetFeeding voice={voiceOn} onDone={finish} />;
  }

  if (phase === 'friend') {
    const newPet = getRosterPet(friendPetId(puzzle.id));
    const next = () => {
      if (puzzleDone) say(finishedVoice(puzzle));
      setPhase(bonusEnabled ? 'checkin' : 'chest');
    };
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-200 via-pink-100 to-amber-50 flex flex-col items-center justify-center p-6 gap-5 overflow-hidden">
        <motion.p initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-2xl font-black text-violet-600 text-center">
          ✨ A hidden friend! ✨
        </motion.p>
        <motion.div
          className="relative"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: [0, 1.25, 1], rotate: [-30, 10, 0] }}
          transition={{ duration: 0.9, type: 'spring' }}
        >
          <motion.div
            className="absolute -inset-8 rounded-full bg-gradient-to-r from-amber-200 via-pink-200 to-violet-200 blur-2xl"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
          <FriendBadge puzzle={puzzle} className="relative w-56 h-56 ring-8 ring-white shadow-2xl text-8xl" />
        </motion.div>
        <motion.h1
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="text-3xl font-black text-accent text-center"
        >
          {puzzle.friend.name}
        </motion.h1>
        <p className="text-text/70 font-semibold text-center">
          It was hiding behind {piece.name}!<br />{newPet?.name ?? 'Your new friend'} wants to come home with you!
        </p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={async () => {
            // Adopted already (found friends are pets); the snack screen opens on them.
            if (newPet) await updateChild({ modeProgress: withPetProgress(child.modeProgress, setBuddy(child, newPet.id)) });
            next();
          }}
          className="bg-primary text-white font-bold py-4 px-10 rounded-full text-xl shadow-lg"
        >
          Welcome home, {newPet?.name ?? 'friend'}!
        </motion.button>
      </div>
    );
  }

  if (phase === 'reveal') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-amber-50 flex flex-col items-center justify-center p-6 gap-5">
        <motion.p initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-xl font-bold text-primary">
          You found...
        </motion.p>
        <motion.div
          className="relative rounded-3xl overflow-hidden shadow-2xl ring-8 ring-accent"
          style={{ width: 'min(78vw, 46vh, 400px)', aspectRatio: '1' }}
          initial={{ rotate: -6, scale: 0.8 }}
          animate={{ rotate: [-6, 4, 0], scale: [0.8, 1.08, 1] }}
          transition={{ duration: 0.7 }}
        >
          <PieceArt puzzle={puzzle} index={pieceIndex} />
        </motion.div>
        <motion.h1
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="text-3xl font-black text-accent text-center"
        >
          {piece.emoji} {piece.name}!
        </motion.h1>
        <p className="text-text/70 font-semibold text-center">
          {puzzleDone ? `That's all ${PIECES_PER_PUZZLE} pieces of ${puzzle.title}! 🎉` : `Piece ${pieceNumber} of ${PIECES_PER_PUZZLE}`}
          <br />
          You earned {pointsEarned} points!
        </p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setPhase(foundFriend ? 'friend' : bonusEnabled ? 'checkin' : 'chest')}
          className="bg-primary text-white font-bold py-4 px-12 rounded-full text-xl shadow-lg"
        >
          Continue
        </motion.button>
      </div>
    );
  }

  // Countdown + brushing
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-amber-50 flex flex-col items-center px-4 pt-6 pb-8 gap-4">
      <div className="w-full max-w-md flex items-center justify-between">
        <button onClick={() => { pause(); setShowExitConfirm(true); }} className="p-2 rounded-full bg-white shadow" aria-label="Exit">
          <X className="w-5 h-5" />
        </button>
        <div className="w-20 h-20 rounded-full grid place-items-center" style={{ background: `conic-gradient(#fbbf24 ${ringPct}%, #e2e8f0 ${ringPct}%)` }}>
          <div className="w-16 h-16 rounded-full bg-white grid place-items-center font-black text-xl">{timeLabel}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setVoiceOn((v) => !v); stopSpeaking(); }}
            className="p-2 rounded-full bg-white shadow"
            aria-label={voiceOn ? 'Turn sound off' : 'Turn sound on'}
          >
            {voiceOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={() => (isRunning ? pause() : resume())}
            disabled={phase !== 'brushing'}
            className="p-2 rounded-full bg-white shadow disabled:opacity-40"
            aria-label={isRunning ? 'Pause' : 'Resume'}
          >
            {isRunning || phase !== 'brushing' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white rounded-full pl-2 pr-5 py-2 shadow">
        <MouthMap stage={phase === 'brushing' ? stage : -1} />
        <p className="font-black text-lg">
          {phase === 'brushing' ? (
            <>Brush your <span className="text-accent">{BRUSH_STAGES[stage].label}</span> teeth</>
          ) : (
            'Get your toothbrush ready!'
          )}
        </p>
      </div>

      <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ width: 'min(88vw, 56vh, 480px)', aspectRatio: '1' }}>
        <PieceArt puzzle={puzzle} index={pieceIndex} />
        {[0, 1, 2, 3].map((q) => (
          <FoamQuadrant key={q} q={q} progress={stageProgress(q)} active={phase === 'brushing' && q === stage} />
        ))}
        <AnimatePresence>
          {phase === 'countdown' && countdown > 0 && (
            <motion.div
              key={countdown}
              className="absolute inset-0 grid place-items-center text-8xl font-black text-primary"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.6, opacity: 0 }}
            >
              {countdown}
            </motion.div>
          )}
        </AnimatePresence>
        {phase === 'brushing' && !isRunning && !showExitConfirm && (
          <div className="absolute inset-0 bg-black/40 grid place-items-center text-white text-3xl font-black">Paused</div>
        )}
      </div>

      <p className="text-text/60 font-semibold text-center">
        Scrub away the bubbles to find piece {pieceNumber} of {PIECES_PER_PUZZLE} in {puzzle.title}!
      </p>

      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Stop brushing?</h3>
              <p className="text-gray-600 mb-6">You won't find a puzzle piece unless you brush for the full 2 minutes.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowExitConfirm(false); if (phase === 'brushing') resume(); }}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold"
                >
                  Keep brushing
                </button>
                <button onClick={() => { stopSpeaking(); onExit(); }} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-medium">
                  Stop
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PuzzleBrushingScreen;
