import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PetArt, StageStars } from './PetArt';
import { usePuzzleVoice } from '../../hooks/usePuzzleVoice';
import { FANFARE_URL } from '../../data/puzzles';
import { levelUpVoice, type PetStage, type RosterPet } from '../../data/petRoster';

// Full-screen moment when a pet reaches a new stage: the old look glows and
// swaps to the new one, with the puzzle fanfare and a line from the pet.
export function LevelUpCelebration({ pet, stage, onDone }: { pet: RosterPet; stage: PetStage; onDone: () => void }) {
  const [grown, setGrown] = useState(false);
  const { playSequence, stop } = usePuzzleVoice(true);
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 1400);
    playSequence([{ url: FANFARE_URL }, levelUpVoice(stage)]).catch(() => {});
    return () => { clearTimeout(t); stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per celebration
  }, []);
  const shown = (grown ? stage : stage - 1) as PetStage;
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-violet-200 via-pink-100 to-amber-50 flex flex-col items-center justify-center p-6 gap-5">
      <motion.p initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-2xl font-black text-violet-600 text-center">
        {grown ? `${pet.name} grew up!` : `Something's happening to ${pet.name}...`}
      </motion.p>
      <div className="relative w-64 h-64">
        <motion.div
          className="absolute -inset-6 rounded-full bg-gradient-to-r from-amber-200 via-pink-200 to-violet-200 blur-2xl"
          animate={{ rotate: 360, scale: grown ? 1.1 : [1, 1.2, 1] }}
          transition={{ rotate: { duration: 6, repeat: Infinity, ease: 'linear' }, scale: { duration: 0.6, repeat: grown ? 0 : Infinity } }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={shown}
            className="absolute inset-0"
            initial={{ scale: 0.6, opacity: 0, filter: 'brightness(3)' }}
            animate={{ scale: 1, opacity: 1, filter: 'brightness(1)' }}
            exit={{ scale: 1.2, opacity: 0, filter: 'brightness(3)' }}
            transition={{ duration: 0.5 }}
          >
            <PetArt pet={pet} stage={shown} className="w-full h-full rounded-3xl shadow-xl ring-8 ring-white" />
          </motion.div>
        </AnimatePresence>
      </div>
      <StageStars stage={shown} className="w-8 h-8" />
      {grown && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onDone}
          className="bg-primary text-white font-bold py-4 px-12 rounded-full text-xl shadow-lg"
        >
          Yay!
        </motion.button>
      )}
    </div>
  );
}
