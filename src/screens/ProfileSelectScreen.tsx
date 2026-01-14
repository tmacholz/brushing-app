import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Plus, Trash2, X, Lock } from 'lucide-react';
import { useChild } from '../context/ChildContext';
import { useAudio } from '../context/AudioContext';
import { usePets } from '../context/PetsContext';
import { worlds } from '../data/worlds';
import { characters } from '../data/characters';
import type { Child, Pet, StoryWorld } from '../types';

interface ProfileSelectScreenProps {
  onBack: () => void;
}

const getAvatarColor = (index: number): string => {
  const colors = [
    'from-primary to-cyan-400',
    'from-secondary to-pink-400',
    'from-accent to-yellow-400',
    'from-success to-emerald-400',
    'from-purple-500 to-indigo-400',
    'from-orange-500 to-amber-400',
  ];
  return colors[index % colors.length];
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getPetEmoji = (petId: string): string => {
  switch (petId) {
    case 'sparkle': return '⭐';
    case 'bubbles': return '🐠';
    case 'cosmo': return '🤖';
    case 'fern': return '🐉';
    case 'captain-whiskers': return '🐱';
    default: return '✨';
  }
};

const getWorldEmoji = (theme: string): string => {
  switch (theme) {
    case 'magical-forest': return '🌲';
    case 'space': return '🚀';
    case 'underwater': return '🐚';
    case 'dinosaurs': return '🦕';
    case 'pirates': return '🏴‍☠️';
    default: return '🌍';
  }
};

const getWorldGradient = (theme: string): string => {
  switch (theme) {
    case 'magical-forest': return 'from-emerald-400 to-green-600';
    case 'space': return 'from-indigo-500 to-purple-700';
    case 'underwater': return 'from-cyan-400 to-blue-600';
    case 'dinosaurs': return 'from-orange-400 to-amber-600';
    case 'pirates': return 'from-amber-500 to-red-600';
    default: return 'from-gray-400 to-gray-600';
  }
};

interface ProfileCardProps {
  profile: Child;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

function ProfileCard({
  profile,
  index,
  isActive,
  onSelect,
  onDelete,
  canDelete,
}: ProfileCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative bg-white rounded-2xl p-4 shadow-md transition-all ${
        isActive ? 'ring-4 ring-primary ring-offset-2' : ''
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

      <button onClick={onSelect} className="w-full text-left">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarColor(
              index
            )} flex items-center justify-center text-white font-bold text-xl shadow-md`}
          >
            {getInitials(profile.name)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-text text-lg truncate">
              {profile.name}
            </h3>
            <div className="flex items-center gap-3 text-sm text-text/60">
              <span>{profile.age} years old</span>
              <span>•</span>
              <span>🔥 {profile.currentStreak} day streak</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-text/60">
              <span>⭐ {profile.points} points</span>
              <span>•</span>
              <span>{profile.totalBrushSessions} sessions</span>
            </div>
          </div>
        </div>
      </button>

      {/* Delete button */}
      {canDelete && (
        <div className="absolute top-3 right-3">
          {!showDeleteConfirm ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 bg-red-500 text-white rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                className="p-2 bg-gray-200 text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Pet card for selection
interface PetCardProps {
  pet: Pet;
  isSelected: boolean;
  onSelect: () => void;
}

function PetCard({ pet, isSelected, onSelect }: PetCardProps) {
  const isLocked = !pet.isStarter;

  return (
    <motion.button
      whileHover={!isLocked ? { scale: 1.05 } : {}}
      whileTap={!isLocked ? { scale: 0.95 } : {}}
      onClick={!isLocked ? onSelect : undefined}
      className={`relative p-4 rounded-2xl transition-all ${
        isLocked
          ? 'bg-white/10 cursor-not-allowed'
          : isSelected
          ? 'bg-white ring-4 ring-accent shadow-lg'
          : 'bg-white/20 hover:bg-white/30'
      }`}
    >
      {isLocked && (
        <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center">
          <Lock className="w-6 h-6 text-white/60" />
        </div>
      )}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 bg-accent text-white rounded-full p-1"
        >
          <Check className="w-4 h-4" />
        </motion.div>
      )}
      <div className="w-20 h-20 mx-auto mb-2 rounded-full overflow-hidden bg-white/20">
        {pet.avatarUrl ? (
          <img src={pet.avatarUrl} alt={pet.displayName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl flex items-center justify-center h-full">{getPetEmoji(pet.id)}</span>
        )}
      </div>
      <p className={`font-bold ${isLocked ? 'text-white/40' : isSelected ? 'text-primary' : 'text-white'}`}>
        {pet.displayName}
      </p>
      <p className={`text-xs ${isLocked ? 'text-white/30' : isSelected ? 'text-primary/60' : 'text-white/60'}`}>
        {pet.description}
      </p>
    </motion.button>
  );
}

// World card for selection
interface WorldCardProps {
  world: StoryWorld;
  isSelected: boolean;
  onSelect: () => void;
}

function WorldCard({ world, isSelected, onSelect }: WorldCardProps) {
  const isLocked = !world.isStarter;

  return (
    <motion.button
      whileHover={!isLocked ? { scale: 1.02 } : {}}
      whileTap={!isLocked ? { scale: 0.98 } : {}}
      onClick={!isLocked ? onSelect : undefined}
      className={`relative w-full p-4 rounded-2xl transition-all text-left ${
        isLocked
          ? 'bg-white/10 cursor-not-allowed'
          : isSelected
          ? 'ring-4 ring-accent shadow-lg'
          : 'hover:ring-2 hover:ring-white/50'
      } ${!isLocked ? `bg-gradient-to-br ${getWorldGradient(world.theme)}` : ''}`}
    >
      {isLocked && (
        <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
          <div className="text-center">
            <Lock className="w-6 h-6 text-white/60 mx-auto mb-1" />
            <span className="text-white/60 text-xs">{world.unlockCost} pts</span>
          </div>
        </div>
      )}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 bg-accent text-white rounded-full p-1.5"
        >
          <Check className="w-5 h-5" />
        </motion.div>
      )}
      <div className="flex items-center gap-3">
        <span className="text-4xl">{getWorldEmoji(world.theme)}</span>
        <div>
          <p className={`font-bold ${isLocked ? 'text-white/40' : 'text-white'}`}>
            {world.displayName}
          </p>
          <p className={`text-sm ${isLocked ? 'text-white/30' : 'text-white/80'}`}>
            {world.description}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

// Full-screen add profile flow
interface AddProfileFlowProps {
  onComplete: (name: string, age: number, characterId: string, petId: string, worldId: string) => void;
  onCancel: () => void;
}

function AddProfileFlow({ onComplete, onCancel }: AddProfileFlowProps) {
  const { playSound } = useAudio();
  const { pets, getStarterPets } = usePets();
  const [name, setName] = useState('');
  const [age, setAge] = useState(6);
  const [selectedCharacterId, setSelectedCharacterId] = useState('boy');
  const [selectedPetId, setSelectedPetId] = useState(getStarterPets()[0]?.id ?? '');
  const [selectedWorldId, setSelectedWorldId] = useState(worlds.find(w => w.isStarter)?.id ?? '');
  const [step, setStep] = useState<'name' | 'character' | 'age' | 'pet' | 'world'>('name');

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      playSound('tap');
      setStep('character');
    }
  };

  const handleCharacterSubmit = () => {
    playSound('tap');
    setStep('age');
  };

  const handleAgeSubmit = () => {
    playSound('tap');
    setStep('pet');
  };

  const handlePetSubmit = () => {
    playSound('tap');
    setStep('world');
  };

  const handleComplete = () => {
    playSound('success');
    onComplete(name.trim(), age, selectedCharacterId, selectedPetId, selectedWorldId);
  };

  const handleSelectPet = (petId: string) => {
    playSound('tap');
    setSelectedPetId(petId);
  };

  const handleSelectWorld = (worldId: string) => {
    playSound('tap');
    setSelectedWorldId(worldId);
  };

  const handleBack = () => {
    playSound('tap');
    if (step === 'name') {
      onCancel();
    } else if (step === 'character') {
      setStep('name');
    } else if (step === 'age') {
      setStep('character');
    } else if (step === 'pet') {
      setStep('age');
    } else if (step === 'world') {
      setStep('pet');
    }
  };

  // Progress indicator
  const steps = ['name', 'character', 'age', 'pet', 'world'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-primary to-primary/80 p-6 flex flex-col"
    >
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleBack}
          className="p-2 -ml-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-6 h-6" />
        </motion.button>
        <button
          onClick={onCancel}
          className="text-white/60 hover:text-white text-sm font-medium"
        >
          Cancel
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-6">
        {steps.map((s, i) => (
          <motion.div
            key={s}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`w-2 h-2 rounded-full transition-all ${
              i <= currentStepIndex ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-sm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="text-5xl text-center mb-4"
              >
                👋
              </motion.div>

              <h2 className="text-3xl font-bold text-white text-center mb-2">
                Add New Brusher
              </h2>
              <p className="text-white/80 text-center mb-8">
                What's their name?
              </p>

              <form onSubmit={handleNameSubmit}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl text-lg bg-white/90 focus:bg-white focus:outline-none focus:ring-2 focus:ring-white"
                  placeholder="Enter name"
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="w-full mt-6 bg-white text-primary text-xl font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </form>
            </motion.div>
          )}

          {step === 'character' && (
            <motion.div
              key="character"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-sm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 10 }}
                className="text-5xl text-center mb-4"
              >
                ✨
              </motion.div>

              <h2 className="text-3xl font-bold text-white text-center mb-2">
                Choose {name}'s Character
              </h2>
              <p className="text-white/80 text-center mb-6">
                Who will they be in the story?
              </p>

              <div className="flex justify-center gap-6 mb-8">
                {characters.map((character) => (
                  <motion.button
                    key={character.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      playSound('tap');
                      setSelectedCharacterId(character.id);
                    }}
                    className={`relative p-3 rounded-2xl transition-all ${
                      selectedCharacterId === character.id
                        ? 'bg-white ring-4 ring-accent shadow-lg'
                        : 'bg-white/20 hover:bg-white/30'
                    }`}
                  >
                    {selectedCharacterId === character.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 bg-accent text-white rounded-full p-1"
                      >
                        <Check className="w-4 h-4" />
                      </motion.div>
                    )}
                    <div className="w-28 h-28 rounded-xl overflow-hidden mb-2">
                      <img
                        src={character.avatarUrl}
                        alt={character.displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className={`font-bold text-center ${
                      selectedCharacterId === character.id ? 'text-primary' : 'text-white'
                    }`}>
                      {character.displayName}
                    </p>
                  </motion.button>
                ))}
              </div>

              <button
                onClick={handleCharacterSubmit}
                className="w-full bg-white text-primary text-xl font-bold py-4 rounded-xl shadow-lg"
              >
                Next
              </button>
            </motion.div>
          )}

          {step === 'age' && (
            <motion.div
              key="age"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-sm"
            >
              <h2 className="text-3xl font-bold text-white text-center mb-2">
                Hi, {name}!
              </h2>
              <p className="text-white/80 text-center mb-8">How old are they?</p>

              <div className="bg-white/20 rounded-2xl p-6 mb-8">
                <input
                  type="range"
                  min={4}
                  max={10}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full h-3 rounded-full appearance-none bg-white/30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <p className="text-center text-5xl font-bold text-white mt-4">
                  {age}
                </p>
                <p className="text-center text-white/60">years old</p>
              </div>

              <button
                onClick={handleAgeSubmit}
                className="w-full bg-white text-primary text-xl font-bold py-4 rounded-xl shadow-lg"
              >
                Next
              </button>
            </motion.div>
          )}

          {step === 'pet' && (
            <motion.div
              key="pet"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-md"
            >
              <h2 className="text-3xl font-bold text-white text-center mb-2">
                Choose {name}'s Pet!
              </h2>
              <p className="text-white/80 text-center mb-6">
                Pick a buddy for their adventures
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {pets.map((pet) => (
                  <PetCard
                    key={pet.id}
                    pet={pet}
                    isSelected={selectedPetId === pet.id}
                    onSelect={() => handleSelectPet(pet.id)}
                  />
                ))}
              </div>

              <button
                onClick={handlePetSubmit}
                disabled={!selectedPetId}
                className="w-full bg-white text-primary text-xl font-bold py-4 rounded-xl shadow-lg disabled:opacity-50"
              >
                Next
              </button>
            </motion.div>
          )}

          {step === 'world' && (
            <motion.div
              key="world"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-md"
            >
              <h2 className="text-3xl font-bold text-white text-center mb-2">
                Pick {name}'s World!
              </h2>
              <p className="text-white/80 text-center mb-6">
                Where will their stories take place?
              </p>

              <div className="space-y-3 mb-8">
                {worlds.map((world) => (
                  <WorldCard
                    key={world.id}
                    world={world}
                    isSelected={selectedWorldId === world.id}
                    onSelect={() => handleSelectWorld(world.id)}
                  />
                ))}
              </div>

              <button
                onClick={handleComplete}
                disabled={!selectedWorldId}
                className="w-full bg-white text-primary text-xl font-bold py-4 rounded-xl shadow-lg disabled:opacity-50"
              >
                Add {name}!
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function ProfileSelectScreen({ onBack }: ProfileSelectScreenProps) {
  const { child, allChildren, addChild, switchChild, deleteChild } = useChild();
  const { playSound } = useAudio();
  const [showAddFlow, setShowAddFlow] = useState(false);

  const handleSelectProfile = (profileId: string) => {
    if (profileId !== child?.id) {
      playSound('success');
      switchChild(profileId);
    }
    onBack();
  };

  const handleAddProfile = (name: string, age: number, characterId: string, petId: string, worldId: string) => {
    addChild(name, age, characterId, petId, worldId);
    setShowAddFlow(false);
    onBack();
  };

  const handleDeleteProfile = (profileId: string) => {
    playSound('tap');
    deleteChild(profileId);
  };

  const handleBack = () => {
    playSound('tap');
    onBack();
  };

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
            <h1 className="text-2xl font-bold text-text">Switch Brusher</h1>
            <p className="text-sm text-text/60">Who's brushing today?</p>
          </div>
        </div>
      </div>

      <div className="p-4 pb-24">
        {/* Profile list */}
        <div className="space-y-4 mb-6">
          {allChildren.map((profile, index) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ProfileCard
                profile={profile}
                index={index}
                isActive={profile.id === child?.id}
                onSelect={() => handleSelectProfile(profile.id)}
                onDelete={() => handleDeleteProfile(profile.id)}
                canDelete={allChildren.length > 1}
              />
            </motion.div>
          ))}
        </div>

        {/* Add new profile button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: allChildren.length * 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            playSound('tap');
            setShowAddFlow(true);
          }}
          className="w-full bg-white border-2 border-dashed border-gray-300 rounded-2xl p-6 flex items-center justify-center gap-3 text-gray-500 hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="w-6 h-6" />
          <span className="font-medium">Add Another Brusher</span>
        </motion.button>
      </div>

      {/* Add profile flow */}
      <AnimatePresence>
        {showAddFlow && (
          <AddProfileFlow
            onComplete={handleAddProfile}
            onCancel={() => setShowAddFlow(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProfileSelectScreen;
