import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Trash2 } from 'lucide-react';
import { useChild } from '../context/ChildContext';
import { useAudio } from '../context/AudioContext';
import { characters, getCharacterById } from '../data/characters';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { child, updateCharacter, resetChild, resetAllData, allChildren } = useChild();
  const { playSound } = useAudio();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);

  const handleBack = () => {
    playSound('tap');
    onBack();
  };

  const handleSelectCharacter = (characterId: string) => {
    if (characterId !== child?.characterId) {
      playSound('tap');
      updateCharacter(characterId);
    }
  };

  const handleDeleteProfile = () => {
    playSound('tap');
    resetChild();
    setShowDeleteConfirm(false);
    onBack();
  };

  const handleResetAll = () => {
    playSound('tap');
    resetAllData();
    setShowResetAllConfirm(false);
  };

  if (!child) return null;

  const currentCharacter = getCharacterById(child.characterId);

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
            <h1 className="text-2xl font-bold text-text">Settings</h1>
            <p className="text-sm text-text/60">Manage your profile</p>
          </div>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-6">
        {/* Character Section */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text mb-4">Story Character</h2>

          <div className="flex flex-col items-center">
            {/* Current character display */}
            {currentCharacter && (
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 mb-4 ring-4 ring-primary/20">
                <img
                  src={currentCharacter.avatarUrl}
                  alt={currentCharacter.displayName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <p className="text-text font-medium mb-4">
              Currently: {currentCharacter?.displayName || 'Not selected'}
            </p>

            {/* Character selection */}
            <div className="flex justify-center gap-4">
              {characters.map((character) => (
                <motion.button
                  key={character.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectCharacter(character.id)}
                  className={`relative p-2 rounded-xl transition-all ${
                    child.characterId === character.id
                      ? 'bg-primary/10 ring-2 ring-primary'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {child.characterId === character.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5"
                    >
                      <Check className="w-3 h-3" />
                    </motion.div>
                  )}
                  <div className="w-16 h-16 rounded-lg overflow-hidden">
                    <img
                      src={character.avatarUrl}
                      alt={character.displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className={`text-xs font-medium mt-1 text-center ${
                    child.characterId === character.id ? 'text-primary' : 'text-text/70'
                  }`}>
                    {character.displayName}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>

          <p className="text-sm text-text/60 text-center mt-4">
            Your character appears in story illustrations during your brushing adventures!
          </p>
        </section>

        {/* Profile Info Section */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text mb-4">Profile Info</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text/60">Name</span>
              <span className="font-medium text-text">{child.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text/60">Age</span>
              <span className="font-medium text-text">{child.age} years old</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text/60">Total Points</span>
              <span className="font-medium text-text">{child.points}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text/60">Brush Sessions</span>
              <span className="font-medium text-text">{child.totalBrushSessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text/60">Current Streak</span>
              <span className="font-medium text-text">{child.currentStreak} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text/60">Longest Streak</span>
              <span className="font-medium text-text">{child.longestStreak} days</span>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-red-500 mb-4">Danger Zone</h2>

          {/* Delete Profile */}
          {allChildren.length > 1 && (
            <div className="mb-4">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-200 text-red-500 rounded-xl font-medium hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete This Profile
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-text/60 text-center">
                    Are you sure? This will delete {child.name}'s profile and all progress.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteProfile}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl font-medium"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reset All Data */}
          {!showResetAllConfirm ? (
            <button
              onClick={() => setShowResetAllConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-200 text-red-500 rounded-xl font-medium hover:bg-red-50 transition-colors"
            >
              Reset All Data
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-text/60 text-center">
                Are you sure? This will delete ALL profiles and start fresh.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleResetAll}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl font-medium"
                >
                  Yes, Reset All
                </button>
                <button
                  onClick={() => setShowResetAllConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default SettingsScreen;
