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
import { useChild } from '../context/ChildContext';
import { useAudio } from '../context/AudioContext';
import { MysteryChest } from '../components/MysteryChest';
import { TaskCheckIn } from '../components/TaskCheckIn';
import { BonusWheel } from '../components/BonusWheel';
import { usePets } from '../context/PetsContext';
import { PieceArt, FoamQuadrant, MouthMap } from '../components/Puzzle/PuzzleArt';
import { getPuzzleById, PIECES_PER_PUZZLE, BRUSH_STAGES, stageVoice, foundVoice, finishedVoice, type VoiceLine } from '../data/puzzles';
import { getPuzzleProgress, withPuzzleProgress, addPiece } from '../utils/puzzleProgress';
import { calculateSessionPoints } from '../utils/pointsCalculator';
import { isToday } from '../utils/streakCalculator';
import type { ChestReward, TaskCheckInResult } from '../types';
import { DEFAULT_TASKS } from '../types';

const TOTAL_SECONDS = 120;
const STAGE_SECONDS = TOTAL_SECONDS / BRUSH_STAGES.length;

// ?fast speeds the timer up 10x so a whole session can be checked in 12 seconds.
const TICK_MS = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('fast') ? 100 : 1000;

type Phase = 'countdown' | 'brushing' | 'reveal' | 'checkin' | 'wheel' | 'chest';

interface PuzzleBrushingScreenProps {
  onComplete: (newPieceIndex: number | null) => void;
  onExit: () => void;
}

export function PuzzleBrushingScreen({ onComplete, onExit }: PuzzleBrushingScreenProps) {
  const { child, updateStreak, addPoints, updateChild, claimChestReward } = useChild();
  const { playSound } = useAudio();
  const { getPetById } = usePets();

  // Freeze the puzzle and progress at the start of the session.
  const [startProgress] = useState(() => getPuzzleProgress(child));
  const puzzle = getPuzzleById(startProgress.currentPuzzleId);
  const pieceIndex = Math.min(startProgress.piecesFound, PIECES_PER_PUZZLE - 1);
  const piece = puzzle?.pieces[pieceIndex];

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
  const { play: playVoice, preload: preloadVoice, stop: stopSpeaking } = usePuzzleVoice(voiceOn);
  const say = useCallback((line: VoiceLine) => {
    playVoice(line).catch(() => { /* chime already played; voice is a bonus */ });
  }, [playVoice]);

  const handleTimerComplete = useCallback(async () => {
    if (completedRef.current || !child || !puzzle) return;
    completedRef.current = true;
    playSound('complete');

    const isFirstBrushOfDay = !isToday(child.lastBrushDate);
    const { newStreak } = await updateStreak();
    const { next, completed } = addPiece(startProgress);
    const points = calculateSessionPoints(newStreak, completed, isFirstBrushOfDay, false);
    await addPoints(points.total);
    await updateChild({ modeProgress: withPuzzleProgress(child, next) });

    setPointsEarned(points.total);
    setPuzzleDone(completed);
    setPhase('reveal');
    playSound('unlock');
    say(foundVoice(puzzle, pieceIndex));
    if (completed) setTimeout(() => say(finishedVoice(puzzle)), 2200);
  }, [child, puzzle, pieceIndex, startProgress, playSound, updateStreak, addPoints, updateChild, say]);

  const { elapsedSeconds, isRunning, start, pause, resume } = useBrushingTimer(handleTimerComplete, undefined, TICK_MS);

  // 3-2-1, warming the voice clips meanwhile so they play on time.
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (puzzle) {
      BRUSH_STAGES.forEach((_, s) => preloadVoice(stageVoice(s)));
      preloadVoice(foundVoice(puzzle, pieceIndex));
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

  const taskConfig = child?.taskConfig ?? { enabled: true, tasks: DEFAULT_TASKS };
  const bonusEnabled = taskConfig.enabled && taskConfig.tasks.some((t) => t.enabled);
  const pet = child ? getPetById(child.activePetId) : undefined;

  const finish = () => {
    stopSpeaking();
    onComplete(pieceIndex);
  };

  const handleReward = async (reward: ChestReward) => {
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
        tasks={taskConfig.tasks}
        pet={pet ?? null}
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
        onRewardClaimed={handleReward}
        onComplete={finish}
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
        onClose={finish}
      />
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
          {puzzleDone ? `That's all ${PIECES_PER_PUZZLE} pieces of ${puzzle.title}! 🎉` : `Piece ${pieceIndex + 1} of ${PIECES_PER_PUZZLE}`}
          <br />
          You earned {pointsEarned} points!
        </p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setPhase(bonusEnabled ? 'checkin' : 'chest')}
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
            aria-label={voiceOn ? 'Turn voice off' : 'Turn voice on'}
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
        Scrub away the bubbles to find piece {pieceIndex + 1} of {PIECES_PER_PUZZLE} in {puzzle.title}!
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
