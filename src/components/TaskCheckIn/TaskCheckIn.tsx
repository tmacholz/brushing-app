import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import type { TaskDefinition, TaskCheckInResult, Pet } from '../../types';
import { useAudio } from '../../context/AudioContext';

interface TaskCheckInProps {
  tasks: TaskDefinition[];
  pet: Pet | null;
  onComplete: (results: TaskCheckInResult[], tokensEarned: number) => void;
}

type CheckInPhase = 'intro' | 'question' | 'celebration' | 'encouragement' | 'summary';

export function TaskCheckIn({ tasks, pet, onComplete }: TaskCheckInProps) {
  const { playSound } = useAudio();
  const [phase, setPhase] = useState<CheckInPhase>('intro');
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [results, setResults] = useState<TaskCheckInResult[]>([]);
  const [tokensEarned, setTokensEarned] = useState(1); // Start with 1 for completing the chapter

  const enabledTasks = tasks.filter(t => t.enabled);
  const currentTask = enabledTasks[currentTaskIndex];
  const isLastTask = currentTaskIndex >= enabledTasks.length - 1;

  // Intro animation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (enabledTasks.length > 0) {
        setPhase('question');
        playSound('storyTransition');
      } else {
        // No tasks enabled, go straight to summary
        setPhase('summary');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [enabledTasks.length, playSound]);

  const handleAnswer = (completed: boolean) => {
    if (!currentTask) return;

    const result: TaskCheckInResult = {
      taskId: currentTask.id,
      completed,
    };

    const newResults = [...results, result];
    setResults(newResults);

    if (completed) {
      setTokensEarned(prev => prev + 1);
      setPhase('celebration');
      playSound('success');
    } else {
      setPhase('encouragement');
      playSound('tap');
    }
  };

  const handleContinue = () => {
    if (isLastTask) {
      setPhase('summary');
    } else {
      setCurrentTaskIndex(prev => prev + 1);
      setPhase('question');
      playSound('storyTransition');
    }
  };

  const handleFinish = () => {
    onComplete(results, tokensEarned);
  };

  // Pet emoji based on pet id
  const getPetEmoji = () => {
    if (!pet) return '🌟';
    switch (pet.id) {
      case 'sparkle': return '⭐';
      case 'bubbles': return '🐠';
      case 'cosmo': return '🤖';
      case 'fern': return '🐉';
      case 'captain-whiskers': return '🐱';
      default: return '🌟';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-blue-600 via-indigo-600 to-purple-700 flex flex-col items-center justify-center p-6"
    >
      {/* Floating stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: 0.3,
            }}
            animate={{
              y: [null, Math.random() * -100],
              opacity: [0.3, 0.6, 0.3],
              rotate: [0, 360],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          >
            ✨
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Intro Phase */}
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-8xl mb-6"
            >
              {getPetEmoji()}
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Great brushing!</h1>
            <p className="text-white/80 text-lg">
              {pet?.displayName || 'Your buddy'} wants to check in...
            </p>
          </motion.div>
        )}

        {/* Question Phase */}
        {phase === 'question' && currentTask && (
          <motion.div
            key={`question-${currentTask.id}`}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            className="text-center w-full max-w-md"
          >
            {/* Pet asking */}
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-8"
            >
              <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full p-6">
                <span className="text-6xl">{getPetEmoji()}</span>
              </div>
            </motion.div>

            {/* Speech bubble */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-6 mb-8 relative shadow-2xl"
            >
              {/* Bubble tail */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[16px] border-b-white" />

              <p className="text-2xl text-gray-800 font-medium">
                {currentTask.question}
              </p>
              <span className="text-4xl mt-2 block">{currentTask.emoji}</span>
            </motion.div>

            {/* Answer buttons */}
            <div className="flex gap-4 justify-center">
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAnswer(true)}
                className="flex-1 max-w-[160px] bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-2xl text-xl shadow-lg flex items-center justify-center gap-2"
              >
                <Check className="w-6 h-6" />
                Yes!
              </motion.button>
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAnswer(false)}
                className="flex-1 max-w-[160px] bg-white/20 hover:bg-white/30 text-white font-bold py-4 px-6 rounded-2xl text-xl shadow-lg flex items-center justify-center gap-2"
              >
                <X className="w-6 h-6" />
                Not yet
              </motion.button>
            </div>

            {/* Progress indicator */}
            <div className="flex justify-center gap-2 mt-8">
              {enabledTasks.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    idx < currentTaskIndex ? 'bg-green-400' :
                    idx === currentTaskIndex ? 'bg-white' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Celebration Phase */}
        {phase === 'celebration' && (
          <motion.div
            key="celebration"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="text-center"
          >
            {/* Confetti effect */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 1] }}
              className="absolute inset-0 pointer-events-none"
            >
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-3xl"
                  initial={{
                    x: '50%',
                    y: '50%',
                    opacity: 1,
                  }}
                  animate={{
                    x: `${50 + (Math.random() - 0.5) * 80}%`,
                    y: `${50 + (Math.random() - 0.5) * 80}%`,
                    opacity: [1, 1, 0],
                    rotate: Math.random() * 360,
                  }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                >
                  {['🎉', '⭐', '✨', '🌟', '💫'][Math.floor(Math.random() * 5)]}
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
              className="text-8xl mb-4"
            >
              🎉
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-2">Awesome!</h2>
            <p className="text-white/90 text-xl mb-2">You earned a spin token!</p>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.3 }}
              className="inline-flex items-center gap-2 bg-yellow-400 text-yellow-900 font-bold py-2 px-4 rounded-full text-lg mb-8"
            >
              <span className="text-2xl">🎟️</span>
              +1 Token
            </motion.div>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleContinue}
              className="bg-white text-purple-700 font-bold py-3 px-8 rounded-full text-lg shadow-lg"
            >
              {isLastTask ? 'See My Tokens!' : 'Next Question'}
            </motion.button>
          </motion.div>
        )}

        {/* Encouragement Phase */}
        {phase === 'encouragement' && (
          <motion.div
            key="encouragement"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-8xl mb-4"
            >
              {getPetEmoji()}
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">No worries!</h2>
            <p className="text-white/90 text-lg mb-8">
              You'll do better next time! {pet?.displayName || 'Your buddy'} believes in you!
            </p>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleContinue}
              className="bg-white text-purple-700 font-bold py-3 px-8 rounded-full text-lg shadow-lg"
            >
              {isLastTask ? 'See My Tokens!' : 'Next Question'}
            </motion.button>
          </motion.div>
        )}

        {/* Summary Phase */}
        {phase === 'summary' && (
          <motion.div
            key="summary"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="text-8xl mb-4"
            >
              🎟️
            </motion.div>

            <h2 className="text-3xl font-bold text-white mb-2">
              You earned {tokensEarned} {tokensEarned === 1 ? 'token' : 'tokens'}!
            </h2>

            <p className="text-white/80 text-lg mb-6">
              Time to spin the bonus wheel!
            </p>

            {/* Token breakdown */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-8 max-w-sm mx-auto">
              <div className="flex items-center justify-between text-white/80 text-sm mb-2">
                <span>Chapter completed</span>
                <span className="text-yellow-400 font-bold">+1 🎟️</span>
              </div>
              {results.map((result, idx) => {
                const task = enabledTasks.find(t => t.id === result.taskId);
                return (
                  <div key={idx} className="flex items-center justify-between text-white/80 text-sm">
                    <span>{task?.shortLabel || result.taskId}</span>
                    <span className={result.completed ? 'text-yellow-400 font-bold' : 'text-white/50'}>
                      {result.completed ? '+1 🎟️' : '-'}
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-white/20 mt-2 pt-2 flex items-center justify-between text-white font-bold">
                <span>Total</span>
                <span className="text-yellow-400">{tokensEarned} 🎟️</span>
              </div>
            </div>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFinish}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-4 px-10 rounded-full text-xl shadow-lg"
            >
              Spin the Wheel!
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default TaskCheckIn;
