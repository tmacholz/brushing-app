import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Cat,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Wand2,
  RefreshCw,
  Image,
  Trash2,
} from 'lucide-react';

// Character types available for children
const CHARACTER_TYPES = [
  { id: 'boy', displayName: 'Boy', icon: '👦' },
  { id: 'girl', displayName: 'Girl', icon: '👧' },
] as const;

interface Pet {
  id: string;
  name: string;
  display_name: string;
  avatar_url: string | null;
}

interface SpriteStatus {
  poseKey: string;
  displayName: string;
  generationPrompt: string;
  spriteUrl: string | null;
  generationStatus: string;
  generatedAt: string | null;
}

interface SpriteManagerProps {
  onBack: () => void;
}

export function SpriteManager({ onBack }: SpriteManagerProps) {
  const [activeTab, setActiveTab] = useState<'characters' | 'pets'>('characters');
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected character type or pet for sprite management
  const [selectedCharacterType, setSelectedCharacterType] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [sprites, setSprites] = useState<SpriteStatus[]>([]);
  const [loadingSprites, setLoadingSprites] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingPose, setGeneratingPose] = useState<string | null>(null);

  // Fetch pets
  const fetchData = useCallback(async () => {
    try {
      const petsRes = await fetch('/api/admin/pets');
      if (petsRes.ok) {
        const petsData = await petsRes.json();
        setPets(petsData.pets || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch sprites for selected character type or pet
  const fetchSprites = useCallback(async (ownerType: 'child' | 'pet', ownerId: string) => {
    setLoadingSprites(true);
    try {
      const res = await fetch(
        `/api/admin/characters?entity=sprites&ownerType=${ownerType}&ownerId=${ownerId}`
      );
      if (!res.ok) throw new Error('Failed to fetch sprites');
      const data = await res.json();
      setSprites(data.sprites || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sprites');
    } finally {
      setLoadingSprites(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCharacterType) {
      fetchSprites('child', selectedCharacterType);
    } else if (selectedPet) {
      fetchSprites('pet', selectedPet.id);
    } else {
      setSprites([]);
    }
  }, [selectedCharacterType, selectedPet, fetchSprites]);

  // Get the source avatar URL for sprite generation
  const getSourceAvatarUrl = (): string | null => {
    if (selectedCharacterType) {
      // Character templates stored in public folder or Vercel Blob
      // For now, use a placeholder - you'll need to upload these images
      return `/characters/${selectedCharacterType}-avatar.png`;
    } else if (selectedPet?.avatar_url) {
      return selectedPet.avatar_url;
    }
    return null;
  };

  // Generate single sprite
  const handleGenerateSprite = async (poseKey: string) => {
    const ownerType = selectedCharacterType ? 'child' : 'pet';
    const ownerId = selectedCharacterType || selectedPet?.id;
    const sourceAvatarUrl = getSourceAvatarUrl();

    if (!ownerId || !sourceAvatarUrl) {
      setError('Cannot generate sprite: missing source avatar. Please upload character avatar first.');
      return;
    }

    setGeneratingPose(poseKey);
    try {
      const res = await fetch('/api/admin/characters?entity=sprites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          ownerType,
          ownerId,
          poseKey,
          sourceAvatarUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate sprite');
      }

      await fetchSprites(ownerType, ownerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate sprite');
    } finally {
      setGeneratingPose(null);
    }
  };

  // Generate all sprites
  const handleGenerateAll = async () => {
    const ownerType = selectedCharacterType ? 'child' : 'pet';
    const ownerId = selectedCharacterType || selectedPet?.id;
    const sourceAvatarUrl = getSourceAvatarUrl();

    if (!ownerId || !sourceAvatarUrl) {
      setError('Cannot generate sprites: missing source avatar. Please upload character avatar first.');
      return;
    }

    setGeneratingAll(true);
    try {
      const res = await fetch('/api/admin/characters?entity=sprites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateAll',
          ownerType,
          ownerId,
          sourceAvatarUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate sprites');
      }

      await fetchSprites(ownerType, ownerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate sprites');
    } finally {
      setGeneratingAll(false);
    }
  };

  // Delete all sprites
  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete all sprites for this character?')) return;

    const ownerType = selectedCharacterType ? 'child' : 'pet';
    const ownerId = selectedCharacterType || selectedPet?.id;
    if (!ownerId) return;

    try {
      const res = await fetch(
        `/api/admin/characters?entity=sprites&ownerType=${ownerType}&ownerId=${ownerId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) throw new Error('Failed to delete sprites');

      await fetchSprites(ownerType, ownerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sprites');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'generating':
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const selectedName = selectedCharacterType
    ? CHARACTER_TYPES.find(c => c.id === selectedCharacterType)?.displayName
    : selectedPet?.display_name;

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => {
              if (selectedCharacterType || selectedPet) {
                setSelectedCharacterType(null);
                setSelectedPet(null);
              } else {
                onBack();
              }
            }}
            className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {selectedName ? `Sprites: ${selectedName}` : 'Sprite Manager'}
            </h1>
            <p className="text-slate-400 text-sm">
              {selectedName
                ? 'Generate and manage character sprites'
                : 'Select a character type or pet to manage their sprites'}
            </p>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6"
          >
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-300 text-sm underline mt-1"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {/* Character/Pet Selection or Sprite Management */}
        {!selectedCharacterType && !selectedPet ? (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('characters')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'characters'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                Character Types ({CHARACTER_TYPES.length})
              </button>
              <button
                onClick={() => setActiveTab('pets')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'pets'
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Cat className="w-4 h-4" />
                Pets ({pets.length})
              </button>
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {activeTab === 'characters' &&
                CHARACTER_TYPES.map((character) => (
                  <motion.button
                    key={character.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedCharacterType(character.id)}
                    className="bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 rounded-xl p-6 text-left transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center text-3xl">
                        {character.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-white text-lg">{character.displayName}</h3>
                        <p className="text-sm text-slate-400">Character sprites</p>
                      </div>
                    </div>
                  </motion.button>
                ))}

              {activeTab === 'pets' &&
                pets.map((pet) => (
                  <motion.button
                    key={pet.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedPet(pet)}
                    className="bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/50 rounded-xl p-4 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {pet.avatar_url ? (
                        <img
                          src={pet.avatar_url}
                          alt={pet.display_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <Cat className="w-6 h-6 text-purple-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-white">{pet.display_name}</h3>
                        <p className="text-sm text-slate-400">{pet.name}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}

              {activeTab === 'pets' && pets.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-500">
                  <Cat className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No pets found</p>
                </div>
              )}
            </div>

            {/* Info box about character sprites */}
            {activeTab === 'characters' && (
              <div className="mt-6 p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                <p className="text-sm text-slate-400">
                  <strong className="text-slate-300">Note:</strong> Character sprites are shared across all children
                  who select that character type. Generate sprites once per character type, and they'll be used
                  for all children with that selection.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Sprite Management */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {selectedCharacterType && (
                  <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center text-3xl border-2 border-cyan-500">
                    {CHARACTER_TYPES.find(c => c.id === selectedCharacterType)?.icon}
                  </div>
                )}
                {selectedPet?.avatar_url && (
                  <img
                    src={selectedPet.avatar_url}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover border-2 border-purple-500"
                  />
                )}
                {selectedPet && !selectedPet.avatar_url && (
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center border-2 border-purple-500">
                    <Cat className="w-8 h-8 text-purple-400" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAll}
                  disabled={sprites.every((s) => s.generationStatus === 'not_started')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All
                </button>
                <button
                  onClick={handleGenerateAll}
                  disabled={generatingAll}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  {generatingAll ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  Generate All Sprites
                </button>
              </div>
            </div>

            {loadingSprites ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : sprites.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No pose definitions found. Create poses first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {sprites.map((sprite) => (
                  <motion.div
                    key={sprite.poseKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden"
                  >
                    {/* Sprite Preview */}
                    <div className="aspect-square bg-slate-900/50 flex items-center justify-center relative">
                      {sprite.spriteUrl ? (
                        <img
                          src={sprite.spriteUrl}
                          alt={sprite.displayName}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Image className="w-16 h-16 text-slate-700" />
                      )}
                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        {getStatusIcon(sprite.generationStatus)}
                      </div>
                    </div>

                    {/* Pose Info */}
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white">{sprite.displayName}</h3>
                        <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">
                          {sprite.poseKey}
                        </span>
                      </div>

                      <button
                        onClick={() => handleGenerateSprite(sprite.poseKey)}
                        disabled={generatingPose === sprite.poseKey || generatingAll}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                      >
                        {generatingPose === sprite.poseKey ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : sprite.spriteUrl ? (
                          <RefreshCw className="w-4 h-4" />
                        ) : (
                          <Wand2 className="w-4 h-4" />
                        )}
                        {sprite.spriteUrl ? 'Regenerate' : 'Generate'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SpriteManager;
