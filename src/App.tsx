import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, Check } from 'lucide-react';
import { ChildProvider, useChild } from './context/ChildContext';
import { AudioProvider, useAudio } from './context/AudioContext';
import { HomeScreen } from './screens/HomeScreen';
import { BrushingScreen } from './screens/BrushingScreen';
import { PetSelectScreen } from './screens/PetSelectScreen';
import { ProfileSelectScreen } from './screens/ProfileSelectScreen';
import { StoryWorldSelectScreen } from './screens/StoryWorldSelectScreen';
import { BottomNav } from './components/ui/BottomNav';
import { pets } from './data/pets';
import { worlds } from './data/worlds';
import type { ScreenName, Pet, StoryWorld } from './types';

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
      <div className="text-5xl mb-2">{getPetEmoji(pet.id)}</div>
      <p className={`font-bold ${isLocked ? 'text-white/40' : isSelected ? 'text-primary' : 'text-white'}`}>
        {pet.displayName}
      </p>
      <p className={`text-xs ${isLocked ? 'text-white/30' : isSelected ? 'text-primary/60' : 'text-white/60'}`}>
        {pet.description}
      </p>
    </motion.button>
  );
}

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

function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { createChild } = useChild();
  const { playSound } = useAudio();
  const [name, setName] = useState('');
  const [age, setAge] = useState(6);
  const [selectedPetId, setSelectedPetId] = useState(pets.find(p => p.isStarter)?.id ?? '');
  const [selectedWorldId, setSelectedWorldId] = useState(worlds.find(w => w.isStarter)?.id ?? '');
  const [step, setStep] = useState<'name' | 'age' | 'pet' | 'world'>('name');

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      playSound('tap');
      setStep('age');
    }
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
    createChild(name.trim(), age, selectedPetId, selectedWorldId);
    onComplete();
  };

  const handleSelectPet = (petId: string) => {
    playSound('tap');
    setSelectedPetId(petId);
  };

  const handleSelectWorld = (worldId: string) => {
    playSound('tap');
    setSelectedWorldId(worldId);
  };

  // Progress indicator
  const steps = ['name', 'age', 'pet', 'world'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary/80 p-6 flex flex-col">
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

      <div className="flex-1 flex items-center justify-center">
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
                className="text-6xl text-center mb-6"
              >
                🦷✨
              </motion.div>

              <h1 className="text-4xl font-bold text-white text-center mb-2">
                BrushQuest
              </h1>
              <p className="text-white/80 text-center mb-8">
                Your brushing adventure begins!
              </p>

              <form onSubmit={handleNameSubmit}>
                <label className="block text-white font-medium mb-2">
                  What's your name?
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl text-lg bg-white/90 focus:bg-white focus:outline-none focus:ring-2 focus:ring-white"
                  placeholder="Enter your name"
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
              <p className="text-white/80 text-center mb-8">How old are you?</p>

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
                Choose Your Pet!
              </h2>
              <p className="text-white/80 text-center mb-6">
                Pick a buddy for your brushing adventures
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
                Pick Your World!
              </h2>
              <p className="text-white/80 text-center mb-6">
                Where will your stories take place?
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
                Let's Go!
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Screens that show the bottom navigation
const SCREENS_WITH_NAV: ScreenName[] = ['home', 'pet-select', 'shop', 'story-world-select', 'settings'];

function AppContent() {
  const { child, isNewUser } = useChild();
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('home');
  const [showOnboarding, setShowOnboarding] = useState(isNewUser);

  if (showOnboarding || !child) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  const handleBrushingComplete = (_pointsEarned: number) => {
    // The completion screen is handled within BrushingScreen
  };

  const handleBrushingExit = () => {
    setCurrentScreen('home');
  };

  const showBottomNav = SCREENS_WITH_NAV.includes(currentScreen);

  return (
    <>
      <AnimatePresence mode="wait">
        {currentScreen === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HomeScreen onNavigate={setCurrentScreen} />
          </motion.div>
        )}

        {currentScreen === 'brushing' && (
          <motion.div
            key="brushing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <BrushingScreen
              onComplete={handleBrushingComplete}
              onExit={handleBrushingExit}
            />
          </motion.div>
        )}

        {currentScreen === 'pet-select' && (
          <motion.div
            key="pet-select"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PetSelectScreen onBack={() => setCurrentScreen('home')} />
          </motion.div>
        )}

        {currentScreen === 'profile-select' && (
          <motion.div
            key="profile-select"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ProfileSelectScreen onBack={() => setCurrentScreen('home')} />
          </motion.div>
        )}

        {currentScreen === 'shop' && (
          <motion.div
            key="shop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-background p-6 pb-24 flex flex-col items-center justify-center"
          >
            <p className="text-2xl mb-2">🛍️</p>
            <p className="text-xl font-medium text-text">Shop</p>
            <p className="text-text/60">Coming soon!</p>
          </motion.div>
        )}

        {currentScreen === 'story-world-select' && (
          <motion.div
            key="story-world-select"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <StoryWorldSelectScreen onBack={() => setCurrentScreen('home')} />
          </motion.div>
        )}

        {currentScreen === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-background p-6 pb-24 flex flex-col items-center justify-center"
          >
            <p className="text-2xl mb-2">⚙️</p>
            <p className="text-xl font-medium text-text">Settings</p>
            <p className="text-text/60">Coming soon!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {showBottomNav && (
        <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} />
      )}
    </>
  );
}

function App() {
  return (
    <AudioProvider>
      <ChildProvider>
        <AppContent />
      </ChildProvider>
    </AudioProvider>
  );
}

export default App;
