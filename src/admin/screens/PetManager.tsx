import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Sparkles,
  ArrowLeft,
  Loader2,
  Check,
  X,
  Edit3,
  Trash2,
  Star,
  Lock,
  ImagePlus,
} from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  display_name: string;
  description: string;
  story_personality: string;
  image_url: string | null;
  avatar_url: string | null;
  unlock_cost: number;
  is_starter: boolean;
  is_published: boolean;
  created_at: string;
}

interface PetSuggestion {
  id: string;
  name: string;
  display_name: string;
  description: string;
  story_personality: string;
  unlock_cost: number;
  is_starter: boolean;
  created_at: string;
}

interface PetManagerProps {
  onBack: () => void;
}

export function PetManager({ onBack }: PetManagerProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [suggestions, setSuggestions] = useState<PetSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchPets = async () => {
    try {
      const res = await fetch('/api/admin/pets');
      if (!res.ok) throw new Error('Failed to fetch pets');
      const data = await res.json();
      setPets(data.pets);
      setSuggestions(data.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, []);

  const handleGenerateSuggestions = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', count: 3 }),
      });
      if (!res.ok) throw new Error('Failed to generate suggestions');
      await fetchPets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveSuggestion = async (suggestionId: string) => {
    setApprovingId(suggestionId);
    try {
      const res = await fetch(`/api/admin/pets?id=${suggestionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      if (!res.ok) throw new Error('Failed to approve suggestion');
      await fetchPets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve suggestion');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    setRejectingId(suggestionId);
    try {
      const res = await fetch(`/api/admin/pets?id=${suggestionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      if (!res.ok) throw new Error('Failed to reject suggestion');
      await fetchPets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject suggestion');
    } finally {
      setRejectingId(null);
    }
  };

  const handleDeletePet = async (petId: string) => {
    if (!confirm('Are you sure you want to delete this pet?')) return;

    try {
      const res = await fetch(`/api/admin/pets?id=${petId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete pet');
      await fetchPets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pet');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Pet Management</h1>
              <p className="text-sm text-slate-400">Create and manage companion pets</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Actions */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Pets</h2>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateSuggestions}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded-lg transition-colors disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generating ? 'Generating...' : 'Generate Ideas'}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Pet
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        )}

        {!loading && (
          <>
            {/* Pending Suggestions */}
            {suggestions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  AI Suggestions ({suggestions.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestions.map((suggestion) => (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-purple-200">
                            {suggestion.display_name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            {suggestion.is_starter ? (
                              <span className="flex items-center gap-1 text-xs text-yellow-400">
                                <Star className="w-3 h-3" />
                                Starter
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Lock className="w-3 h-3" />
                                {suggestion.unlock_cost} pts
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{suggestion.description}</p>
                      <p className="text-xs text-slate-400 mb-4">
                        Personality: {suggestion.story_personality}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveSuggestion(suggestion.id)}
                          disabled={approvingId === suggestion.id}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/20 text-green-300 hover:bg-green-500/30 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {approvingId === suggestion.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectSuggestion(suggestion.id)}
                          disabled={rejectingId === suggestion.id}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {rejectingId === suggestion.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          Reject
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Pets */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Managed Pets ({pets.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pets.map((pet) => (
                  <motion.div
                    key={pet.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {pet.avatar_url ? (
                          <img
                            src={pet.avatar_url}
                            alt={pet.display_name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center text-2xl">
                            🐾
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold">{pet.display_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {pet.is_starter ? (
                              <span className="flex items-center gap-1 text-xs text-yellow-400">
                                <Star className="w-3 h-3" />
                                Starter
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Lock className="w-3 h-3" />
                                {pet.unlock_cost} pts
                              </span>
                            )}
                            {pet.is_published && (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                Published
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{pet.description}</p>
                    <p className="text-xs text-slate-400 mb-4">
                      Personality: {pet.story_personality}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingPet(pet)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/50 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePet(pet.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}

                {pets.length === 0 && (
                  <div className="col-span-full text-center py-20 text-slate-500">
                    <div className="text-4xl mb-4">🐾</div>
                    <p className="text-lg">No pets yet</p>
                    <p className="text-sm mt-1">
                      Create pets manually or generate ideas with AI
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Create Pet Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreatePetModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              fetchPets();
            }}
          />
        )}
      </AnimatePresence>

      {/* Edit Pet Modal */}
      <AnimatePresence>
        {editingPet && (
          <EditPetModal
            pet={editingPet}
            onClose={() => setEditingPet(null)}
            onSaved={() => {
              setEditingPet(null);
              fetchPets();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreatePetModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [storyPersonality, setStoryPersonality] = useState('');
  const [unlockCost, setUnlockCost] = useState('0');
  const [isStarter, setIsStarter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: displayName.toLowerCase().replace(/\s+/g, '-'),
          displayName,
          description,
          storyPersonality,
          unlockCost: parseInt(unlockCost) || 0,
          isStarter,
        }),
      });

      if (!res.ok) throw new Error('Failed to create pet');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pet');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-4">Create Pet</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g., Sparkle"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              rows={2}
              placeholder="A short, magical description..."
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Story Personality
            </label>
            <input
              type="text"
              value={storyPersonality}
              onChange={(e) => setStoryPersonality(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g., brave and curious"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Unlock Cost</label>
              <input
                type="number"
                value={unlockCost}
                onChange={(e) => setUnlockCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                min="0"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isStarter}
                  onChange={(e) => {
                    setIsStarter(e.target.checked);
                    if (e.target.checked) setUnlockCost('0');
                  }}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700/50 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-300">Starter Pet</span>
              </label>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function EditPetModal({
  pet,
  onClose,
  onSaved,
}: {
  pet: Pet;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(pet.display_name);
  const [description, setDescription] = useState(pet.description);
  const [storyPersonality, setStoryPersonality] = useState(pet.story_personality);
  const [unlockCost, setUnlockCost] = useState(pet.unlock_cost.toString());
  const [isStarter, setIsStarter] = useState(pet.is_starter);
  const [isPublished, setIsPublished] = useState(pet.is_published);
  const [avatarUrl, setAvatarUrl] = useState(pet.avatar_url);
  const [saving, setSaving] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    setGeneratingImage(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pet',
          petId: pet.id,
          petName: displayName,
          petDescription: description,
          petPersonality: storyPersonality,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const data = await res.json();
      setAvatarUrl(data.avatarUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/pets?id=${pet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          description,
          storyPersonality,
          unlockCost: parseInt(unlockCost) || 0,
          isStarter,
          isPublished,
          avatarUrl,
        }),
      });

      if (!res.ok) throw new Error('Failed to update pet');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pet');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-4">Edit Pet</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Preview & Generation */}
          <div className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-700/50 flex items-center justify-center flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl">🐾</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-400 mb-2">
                {avatarUrl ? 'Current avatar' : 'No avatar image'}
              </p>
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={generatingImage || !displayName || !description}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {generatingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-4 h-4" />
                    Generate Image
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              rows={2}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Story Personality
            </label>
            <input
              type="text"
              value={storyPersonality}
              onChange={(e) => setStoryPersonality(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Unlock Cost</label>
              <input
                type="number"
                value={unlockCost}
                onChange={(e) => setUnlockCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                min="0"
              />
            </div>
            <div className="flex flex-col gap-2 justify-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isStarter}
                  onChange={(e) => {
                    setIsStarter(e.target.checked);
                    if (e.target.checked) setUnlockCost('0');
                  }}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700/50 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-300">Starter Pet</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700/50 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-300">Published</span>
              </label>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
