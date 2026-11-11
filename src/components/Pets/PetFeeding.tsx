// After brushing: feed snacks from the snack bag to any pet. Each snack is one
// step of growth (a fully grown pet gets a heart instead). The pet bobs, a snack
// flies in, the pet chomps and crumbs fly. Reaching a new stage plays the
// level-up right here. Leftover snacks stay in the bag for next time.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useChild } from '../../context/ChildContext';
import { useAudio } from '../../context/AudioContext';
import { usePets } from '../../context/PetsContext';
import { usePuzzleVoice } from '../../hooks/usePuzzleVoice';
import { PetArt, StageStars } from './PetArt';
import { LevelUpCelebration } from './LevelUpCelebration';
import {
  brushesToNextStage, getRosterPet, stageFor, MAX_STAGE, stageProgress, type PetStage, type RosterPet,
} from '../../data/petRoster';
import { feedIntroVoice, feedLoveVoice, feedYumVoices } from '../../data/puzzles';
import {
  buddyPet, feedPet, getPetProgress, ownedPets, petBrushes, petHearts, withPetProgress, type PetProgress,
} from '../../utils/petProgress';

const SNACK = '🍎';
const FLIGHT_MS = 450;
const MAX_SHOWN = 12;

interface Burst { id: number; heart: boolean }

export function PetFeeding({ voice = true, onDone }: { voice?: boolean; onDone: () => void }) {
  const { child, updateChild } = useChild();
  const { playSound } = useAudio();
  const { getPetById } = usePets();
  const { play, stop } = usePuzzleVoice(voice);
  const chomp = useAnimationControls();

  const [progress, setProgress] = useState<PetProgress>(() => getPetProgress(child));
  const [petId, setPetId] = useState(() => buddyPet(child, child ? getPetById(child.activePetId)?.name : undefined).id);
  const [flying, setFlying] = useState(0); // key of the snack in the air, 0 = none
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [levelUp, setLevelUp] = useState<{ pet: RosterPet; stage: PetStage } | null>(null);

  // Latest values for the timers below.
  const progressRef = useRef(progress);
  const childRef = useRef(child);
  useEffect(() => { childRef.current = child; }, [child]);
  const busy = useRef(false);

  useEffect(() => {
    play(feedIntroVoice).catch(() => {});
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on open
  }, []);

  if (!child) return null;
  const owned = ownedPets(child);
  const pet = getRosterPet(petId) ?? owned[0];
  const brushes = petBrushes(progress, pet.id);
  const stage = stageFor(brushes);
  const left = brushesToNextStage(brushes);
  const hearts = petHearts(progress, pet.id);
  const food = progress.food;

  const save = (next: PetProgress) => {
    progressRef.current = next;
    setProgress(next);
    const c = childRef.current;
    if (c) void updateChild({ modeProgress: withPetProgress(c.modeProgress, next) });
  };

  const feed = () => {
    if (busy.current || progressRef.current.food <= 0 || levelUp) return;
    busy.current = true;
    const target = pet;
    setFlying(Date.now());
    playSound('tap');
    setTimeout(() => {
      const before = progressRef.current;
      const grown = stageFor(petBrushes(before, target.id)) === MAX_STAGE;
      const next = feedPet(before, target.id);
      save(next);
      setFlying(0);
      setBursts((b) => [...b, { id: Date.now(), heart: grown }]);
      void chomp.start({
        scaleX: [1, 1.12, 0.94, 1.06, 1],
        scaleY: [1, 0.86, 1.08, 0.96, 1],
        rotate: [0, -4, 4, -2, 0],
        transition: { duration: 0.55 },
      });
      playSound(grown ? 'success' : 'points');
      const nextStage = stageFor(petBrushes(next, target.id));
      if (nextStage > (next.seen[target.id] ?? 1)) {
        setTimeout(() => { setLevelUp({ pet: target, stage: nextStage }); busy.current = false; }, 700);
      } else {
        play(grown ? feedLoveVoice : feedYumVoices[Math.floor(Math.random() * feedYumVoices.length)]).catch(() => {});
        setTimeout(() => { busy.current = false; }, 250);
      }
    }, FLIGHT_MS);
  };

  const finishLevelUp = () => {
    if (!levelUp) return;
    const p = progressRef.current;
    save({ ...p, seen: { ...p.seen, [levelUp.pet.id]: levelUp.stage } });
    setLevelUp(null);
  };

  const choose = (id: string) => {
    if (busy.current || id === pet.id) return;
    playSound('tap');
    setPetId(id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 via-rose-50 to-sky-50 flex flex-col items-center px-5 pt-8 pb-8 gap-4 overflow-hidden">
      <motion.h1 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl font-black text-primary text-center">
        Snack time!
      </motion.h1>
      <p className="-mt-2 text-text/70 font-semibold text-center">
        {food > 0 ? `Tap a snack to feed ${pet.name}` : 'All the snacks are eaten!'}
      </p>

      {/* The pet: bobs while waiting, chomps on each snack */}
      <div className="relative" style={{ width: 'min(64vw, 36vh, 280px)', aspectRatio: '1' }}>
        <motion.div
          className="absolute inset-0"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.div
            key={pet.id}
            className="w-full h-full"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <motion.button
              onClick={feed}
              animate={chomp}
              className="w-full h-full block"
              style={{ originY: 0.9 }}
              aria-label={`Feed ${pet.name}`}
            >
              <PetArt pet={pet} stage={stage} className="w-full h-full shadow-xl ring-8 ring-white" />
            </motion.button>
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {flying !== 0 && (
            <motion.div
              key={flying}
              className="absolute left-1/2 top-1/2 -ml-6 -mt-6 text-5xl pointer-events-none"
              initial={{ y: 260, scale: 1.2, opacity: 1, rotate: 0 }}
              animate={{ y: 10, scale: 0.5, rotate: 200 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: FLIGHT_MS / 1000, ease: 'easeOut' }}
            >
              {SNACK}
            </motion.div>
          )}
        </AnimatePresence>

        {bursts.map((b) => (
          <BurstFx key={b.id} heart={b.heart} onDone={() => setBursts((all) => all.filter((x) => x.id !== b.id))} />
        ))}
      </div>

      {/* Name, stars and growth */}
      <div className="w-full max-w-xs text-center">
        <div className="flex items-center justify-center gap-2">
          <p className="text-2xl font-black text-text">{pet.name}</p>
          <StageStars stage={stage} className="w-5 h-5" />
        </div>
        <div className="mt-2 h-3 rounded-full bg-white shadow-inner overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            animate={{ width: `${stageProgress(brushes) * 100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
        </div>
        <p className="mt-1.5 text-sm text-text/70 font-semibold">
          {left === null
            ? `${pet.name} is all grown up! ❤️ ${hearts}`
            : `${left} more ${left === 1 ? 'snack' : 'snacks'} until ${pet.name} grows!`}
        </p>
      </div>

      {/* Snack bag */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm px-4 py-3">
        <p className="text-xs font-bold text-text/50 uppercase tracking-wide mb-2">Snack bag · {food}</p>
        {food > 0 ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: Math.min(food, MAX_SHOWN) }, (_, i) => (
              <motion.button
                key={i}
                onClick={feed}
                whileTap={{ scale: 0.85 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -8, 8, 0] }}
                transition={{ delay: i * 0.05, rotate: { delay: 1 + i * 0.1, duration: 0.6, repeat: Infinity, repeatDelay: 3 } }}
                className="text-4xl leading-none"
                aria-label="Feed a snack"
              >
                {SNACK}
              </motion.button>
            ))}
            {food > MAX_SHOWN && <span className="self-center font-bold text-text/60">+{food - MAX_SHOWN}</span>}
          </div>
        ) : (
          <p className="text-center text-text/50 font-medium py-1">Brush again to earn more snacks!</p>
        )}
      </div>

      {/* Switch pets */}
      {owned.length > 1 && (
        <div className="w-full max-w-sm">
          <p className="text-xs font-bold text-text/50 uppercase tracking-wide mb-2 text-center">Who's hungry?</p>
          <div className="flex gap-2 overflow-x-auto pb-1 justify-start sm:justify-center">
            {owned.map((p) => {
              const active = p.id === pet.id;
              return (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => choose(p.id)}
                  className={`shrink-0 rounded-2xl border-4 ${active ? 'border-primary' : 'border-transparent opacity-80'}`}
                  aria-label={p.name}
                >
                  <PetArt pet={p} stage={stageFor(petBrushes(progress, p.id))} className="w-14 h-14" />
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => { stop(); onDone(); }}
        className="mt-1 bg-primary text-white font-bold py-4 px-12 rounded-full text-xl shadow-lg"
      >
        Done!
      </motion.button>
      {food > 0 && <p className="-mt-2 text-xs text-text/50 font-medium">Leftover snacks stay in your bag.</p>}

      {levelUp && <LevelUpCelebration pet={levelUp.pet} stage={levelUp.stage} onDone={finishLevelUp} />}
    </div>
  );
}

// Crumbs (or a heart for a grown pet) bursting from the pet's mouth.
function BurstFx({ heart, onDone }: { heart: boolean; onDone: () => void }) {
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);
  useEffect(() => {
    const t = setTimeout(() => doneRef.current(), 1000);
    return () => clearTimeout(t);
  }, []);
  if (heart) {
    return (
      <motion.div
        className="absolute left-1/2 top-1/3 -ml-5 text-5xl pointer-events-none"
        initial={{ y: 0, scale: 0.4, opacity: 0 }}
        animate={{ y: -120, scale: 1.3, opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1 }}
      >
        ❤️
      </motion.div>
    );
  }
  return (
    <>
      {Array.from({ length: 7 }, (_, i) => {
        const angle = (i / 7) * Math.PI * 2 + 0.3;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-[60%] w-3 h-3 rounded-full bg-amber-500 pointer-events-none"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 90, y: Math.sin(angle) * 70 + 40, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        );
      })}
      <motion.span
        className="absolute left-1/2 top-0 -ml-6 text-3xl font-black text-primary pointer-events-none"
        initial={{ y: 0, opacity: 0 }}
        animate={{ y: -40, opacity: [0, 1, 0] }}
        transition={{ duration: 0.9 }}
      >
        +1
      </motion.span>
    </>
  );
}
