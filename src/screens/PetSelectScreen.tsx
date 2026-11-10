// Pick the buddy pet you brush with. Pets are the starters plus every hidden
// friend found in puzzle mode; friends still hiding show as silhouettes.
// Pets can't be bought: they grow from brushes instead.
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { useChild } from '../context/ChildContext';
import { useAudio } from '../context/AudioContext';
import { usePets } from '../context/PetsContext';
import { PetArt, StageStars } from '../components/Pets/PetArt';
import { brushesToNextStage, type RosterPet } from '../data/petRoster';
import {
  buddyPet, getPetProgress, hiddenPets, ownedPets, petBrushes, petStage, setBuddy, withPetProgress,
} from '../utils/petProgress';

interface PetSelectScreenProps {
  onBack: () => void;
}

export function PetSelectScreen({ onBack }: PetSelectScreenProps) {
  const { child, updateChild } = useChild();
  const { playSound } = useAudio();
  const { pets, getPetById } = usePets();

  if (!child) return null;

  const progress = getPetProgress(child);
  const buddy = buddyPet(child, getPetById(child.activePetId)?.name);
  const owned = ownedPets(child);
  const hidden = hiddenPets(child);

  const choose = (pet: RosterPet) => {
    if (pet.id === buddy.id) {
      playSound('tap');
      return;
    }
    playSound('success');
    const updates: Parameters<typeof updateChild>[0] = {
      modeProgress: withPetProgress(child.modeProgress, setBuddy(child, pet.id)),
    };
    // Starters also star in story mode, which uses the pets table.
    if (pet.kind === 'starter') {
      const storyPet = pets.find((p) => p.name === pet.id || p.id === pet.id);
      if (storyPet) updates.activePetId = storyPet.id;
    }
    updateChild(updates);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { playSound('tap'); onBack(); }} className="p-2 rounded-full bg-white shadow-sm" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-text">My Pets</h1>
      </div>
      <p className="text-text/60 text-sm mb-4">
        Pick a buddy to brush with. Your buddy grows a little with every brush!
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {owned.map((pet) => {
          const stage = petStage(progress, pet.id);
          const left = brushesToNextStage(petBrushes(progress, pet.id));
          const active = pet.id === buddy.id;
          return (
            <motion.button
              key={pet.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => choose(pet)}
              className={`relative bg-white rounded-2xl p-3 flex flex-col items-center shadow-sm border-4 ${active ? 'border-primary' : 'border-transparent'}`}
            >
              {active && (
                <span className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                  <Check className="w-4 h-4" />
                </span>
              )}
              <PetArt pet={pet} stage={stage} className="w-28 h-28" />
              <p className="mt-1 font-bold text-text">{pet.name}</p>
              <StageStars stage={stage} />
              <p className="mt-1 text-[11px] text-text/50 font-medium">
                {left === null ? 'All grown up!' : `${left} to grow`}
              </p>
            </motion.button>
          );
        })}

        {hidden.map((pet) => (
          <div key={pet.id} className="bg-white/60 rounded-2xl p-3 flex flex-col items-center border-4 border-dashed border-gray-200">
            <div className="w-28 h-28 rounded-2xl bg-gray-100 grid place-items-center text-5xl font-black text-gray-300">?</div>
            <p className="mt-1 font-bold text-text/40">???</p>
            <p className="mt-1 text-[11px] text-text/50 font-medium text-center">Hiding in {pet.puzzle?.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PetSelectScreen;
