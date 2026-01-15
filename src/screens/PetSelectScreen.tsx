import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, ArrowLeft, Sparkles, X } from 'lucide-react';
import { useChild } from '../context/ChildContext';
import { useAudio } from '../context/AudioContext';
import { usePets } from '../context/PetsContext';
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
  canAfford: boolean;
  onSelect: () => void;
  onUnlockAttempt: () => void;
}

function PetCard({ pet, isUnlocked, isActive, canAfford, onSelect, onUnlockAttempt }: PetCardProps) {
  const handleClick = () => {
    if (isUnlocked) {
      onSelect();
    } else if (canAfford) {
      onUnlockAttempt();
    }
  };

  return (
    <motion.button
      whileHover={(isUnlocked || canAfford) ? { scale: 1.02 } : undefined}
      whileTap={(isUnlocked || canAfford) ? { scale: 0.98 } : undefined}
      onClick={handleClick}
      className={`relative w-full bg-white rounded-2xl p-4 shadow-md text-left transition-all ${
        isActive
          ? 'ring-4 ring-primary ring-offset-2'
          : isUnlocked
          ? 'hover:shadow-lg cursor-pointer'
          : canAfford
          ? 'hover:shadow-lg cursor-pointer ring-2 ring-accent/50'
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
        <div className={`absolute -top-2 -right-2 ${canAfford ? 'bg-accent' : 'bg-gray-400'} text-white rounded-full p-1`}>
          {canAfford ? <Sparkles className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
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
            <p className={`font-medium text-sm mt-1 ${canAfford ? 'text-accent' : 'text-gray-400'}`}>
              {canAfford ? `Tap to unlock for ${pet.unlockCost} pts` : `${pet.unlockCost} points to unlock`}
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
  const { child, updateChild, unlockPet } = useChild();
  const { playSound } = useAudio();
  const { pets } = usePets();
  const [petToUnlock, setPetToUnlock] = useState<Pet | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

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

  const handleUnlockAttempt = (pet: Pet) => {
    playSound('tap');
    setPetToUnlock(pet);
  };

  const handleConfirmUnlock = async () => {
    if (!petToUnlock) return;

    setIsUnlocking(true);
    const success = await unlockPet(petToUnlock.id);
    setIsUnlocking(false);

    if (success) {
      playSound('success');
      setPetToUnlock(null);
    } else {
      playSound('tap');
    }
  };

  const handleCancelUnlock = () => {
    playSound('tap');
    setPetToUnlock(null);
  };

  const unlockedPets = pets.filter((pet) =>
    child.unlockedPets.includes(pet.id) || child.unlockedPets.includes(pet.name)
  );
  const lockedPets = pets.filter(
    (pet) => !child.unlockedPets.includes(pet.id) && !child.unlockedPets.includes(pet.name)
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-text">My Pets</h1>
            <p className="text-sm text-text/60">
              Choose your adventure companion
            </p>
          </div>
          <div className="bg-accent/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="font-bold text-accent">{child.points}</span>
            <span className="text-accent/70 text-sm">pts</span>
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
                  canAfford={false}
                  onSelect={() => handleSelectPet(pet.id)}
                  onUnlockAttempt={() => {}}
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
                    canAfford={child.points >= pet.unlockCost}
                    onSelect={() => {}}
                    onUnlockAttempt={() => handleUnlockAttempt(pet)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Unlock Confirmation Modal */}
      <AnimatePresence>
        {petToUnlock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={handleCancelUnlock}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-text">Unlock Pet?</h2>
                <button
                  onClick={handleCancelUnlock}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <span className="text-4xl">{getPetEmoji(petToUnlock.id)}</span>
                </div>
                <div>
                  <h3 className="font-bold text-text">{petToUnlock.displayName}</h3>
                  <p className="text-text/60 text-sm">{petToUnlock.description}</p>
                </div>
              </div>

              <div className="bg-accent/10 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-text/70">Cost</span>
                  <span className="font-bold text-accent">{petToUnlock.unlockCost} pts</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-text/70">Your points</span>
                  <span className="font-bold text-text">{child.points} pts</span>
                </div>
                <div className="border-t border-accent/20 mt-2 pt-2 flex justify-between items-center">
                  <span className="text-text/70">After unlock</span>
                  <span className="font-bold text-text">{child.points - petToUnlock.unlockCost} pts</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelUnlock}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-medium text-text hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUnlock}
                  disabled={isUnlocking}
                  className="flex-1 px-4 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUnlocking ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Unlock
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PetSelectScreen;
