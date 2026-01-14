import { motion } from 'framer-motion';
import { Check, Lock, ArrowLeft } from 'lucide-react';
import { useChild } from '../context/ChildContext';
import { useAudio } from '../context/AudioContext';
import { pets } from '../data/pets';
import type { Pet } from '../types';

interface PetSelectScreenProps {
  onBack: () => void;
}

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

interface PetCardProps {
  pet: Pet;
  isUnlocked: boolean;
  isActive: boolean;
  onSelect: () => void;
}

function PetCard({ pet, isUnlocked, isActive, onSelect }: PetCardProps) {
  return (
    <motion.button
      whileHover={isUnlocked ? { scale: 1.02 } : undefined}
      whileTap={isUnlocked ? { scale: 0.98 } : undefined}
      onClick={isUnlocked ? onSelect : undefined}
      className={`relative w-full bg-white rounded-2xl p-4 shadow-md text-left transition-all ${
        isActive
          ? 'ring-4 ring-primary ring-offset-2'
          : isUnlocked
          ? 'hover:shadow-lg cursor-pointer'
          : 'opacity-60 cursor-not-allowed'
      }`}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-1"
        >
          <Check className="w-4 h-4" />
        </motion.div>
      )}

      {/* Lock indicator */}
      {!isUnlocked && (
        <div className="absolute -top-2 -right-2 bg-gray-400 text-white rounded-full p-1">
          <Lock className="w-4 h-4" />
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Pet avatar */}
        <div
          className={`w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center ${
            isUnlocked
              ? 'bg-gradient-to-br from-primary/20 to-secondary/20'
              : 'bg-gray-200'
          }`}
        >
          {pet.avatarUrl ? (
            <img
              src={pet.avatarUrl}
              alt={pet.displayName}
              className={`w-full h-full object-cover ${!isUnlocked ? 'opacity-50 grayscale' : ''}`}
            />
          ) : isUnlocked ? (
            <span className="text-4xl">{getPetEmoji(pet.id)}</span>
          ) : (
            <span className="text-4xl opacity-50">{getPetEmoji(pet.id)}</span>
          )}
        </div>

        {/* Pet info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-text text-lg">{pet.displayName}</h3>
          <p className="text-text/60 text-sm truncate">{pet.description}</p>
          {!isUnlocked && (
            <p className="text-accent font-medium text-sm mt-1">
              {pet.unlockCost} points to unlock
            </p>
          )}
        </div>
      </div>

      {/* Personality tag */}
      {isUnlocked && (
        <div className="mt-3 inline-block bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
          {pet.storyPersonality}
        </div>
      )}
    </motion.button>
  );
}

export function PetSelectScreen({ onBack }: PetSelectScreenProps) {
  const { child, updateChild } = useChild();
  const { playSound } = useAudio();

  if (!child) return null;

  const handleSelectPet = (petId: string) => {
    if (petId !== child.activePetId) {
      playSound('success');
      updateChild({ activePetId: petId });
    } else {
      playSound('tap');
    }
  };

  const handleBack = () => {
    playSound('tap');
    onBack();
  };

  const unlockedPets = pets.filter((pet) =>
    child.unlockedPets.includes(pet.id)
  );
  const lockedPets = pets.filter(
    (pet) => !child.unlockedPets.includes(pet.id)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleBack}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100"
          >
            <ArrowLeft className="w-6 h-6 text-text" />
          </motion.button>
          <div>
            <h1 className="text-2xl font-bold text-text">My Pets</h1>
            <p className="text-sm text-text/60">
              Choose your adventure companion
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 pb-24">
        {/* Unlocked pets section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-text mb-3 flex items-center gap-2">
            <span>Your Pets</span>
            <span className="text-sm font-normal text-text/60">
              ({unlockedPets.length})
            </span>
          </h2>
          <div className="space-y-3">
            {unlockedPets.map((pet, index) => (
              <motion.div
                key={pet.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <PetCard
                  pet={pet}
                  isUnlocked={true}
                  isActive={child.activePetId === pet.id}
                  onSelect={() => handleSelectPet(pet.id)}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Locked pets section */}
        {lockedPets.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-text mb-3 flex items-center gap-2">
              <span>Locked Pets</span>
              <span className="text-sm font-normal text-text/60">
                ({lockedPets.length})
              </span>
            </h2>
            <div className="space-y-3">
              {lockedPets.map((pet, index) => (
                <motion.div
                  key={pet.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (unlockedPets.length + index) * 0.1 }}
                >
                  <PetCard
                    pet={pet}
                    isUnlocked={false}
                    isActive={false}
                    onSelect={() => {}}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PetSelectScreen;
