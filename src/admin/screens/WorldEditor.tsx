import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Trash2,
  Sparkles,
  RefreshCw,
  BookOpen,
  CheckCircle,
  Clock,
  Loader2,
  Lightbulb,
  Eye,
  EyeOff,
  ImageIcon,
} from 'lucide-react';

interface World {
  id: string;
  name: string;
  display_name: string;
  description: string;
  theme: string | null;
  unlock_cost: number;
  is_starter: boolean;
  is_published: boolean;
  background_image_url: string | null;
}

interface Story {
  id: string;
  title: string;
  description: string;
  status: string;
  is_published: boolean;
  total_chapters: number;
  created_at: string;
}

interface StoryPitch {
  id: string;
  title: string;
  description: string;
  outline: { chapter: number; title: string; summary: string }[];
  is_used: boolean;
}

interface WorldEditorProps {
  worldId: string;
  onBack: () => void;
  onSelectStory: (storyId: string) => void;
}

export function WorldEditor({ worldId, onBack, onSelectStory }: WorldEditorProps) {
  const [world, setWorld] = useState<World | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('');
  const [unlockCost, setUnlockCost] = useState(0);
  const [isStarter, setIsStarter] = useState(false);

  // Story creation state
  const [storyIdea, setStoryIdea] = useState('');
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [generatingPitches, setGeneratingPitches] = useState(false);
  const [pitches, setPitches] = useState<StoryPitch[]>([]);
  const [selectedPitch, setSelectedPitch] = useState<StoryPitch | null>(null);
  const [generatingStory, setGeneratingStory] = useState(false);

  // Image generation state
  const [regeneratingImage, setRegeneratingImage] = useState(false);

  const fetchWorld = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`);
      if (!res.ok) throw new Error('Failed to fetch world');
      const data = await res.json();
      setWorld(data.world);
      setStories(data.stories);
      setDisplayName(data.world.display_name);
      setDescription(data.world.description);
      setTheme(data.world.theme || '');
      setUnlockCost(data.world.unlock_cost || 0);
      setIsStarter(data.world.is_starter || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load world');
    } finally {
      setLoading(false);
    }
  }, [worldId]);

  useEffect(() => {
    fetchWorld();
  }, [fetchWorld]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          description,
          theme: theme || null,
          unlockCost,
          isStarter,
        }),
      });

      if (!res.ok) throw new Error('Failed to save world');
      const data = await res.json();
      setWorld(data.world);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save world');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this world? All stories will be deleted too.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete world');
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete world');
    }
  };

  const handlePublish = async (publish: boolean) => {
    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: publish }),
      });

      if (!res.ok) throw new Error('Failed to update publish status');
      const data = await res.json();
      setWorld(data.world);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update publish status');
    }
  };

  const handleRegenerateImage = async () => {
    setRegeneratingImage(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerateImage' }),
      });

      if (!res.ok) throw new Error('Failed to regenerate world image');
      const data = await res.json();
      setWorld(data.world);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate world image');
    } finally {
      setRegeneratingImage(false);
    }
  };

  const handleGenerateOutline = async () => {
    if (!storyIdea.trim()) return;
    setGeneratingOutline(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'outline', idea: storyIdea }),
      });

      if (!res.ok) throw new Error('Failed to generate outline');
      const data = await res.json();
      setSelectedPitch(data.pitch);
      setStoryIdea('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate outline');
    } finally {
      setGeneratingOutline(false);
    }
  };

  const handleGeneratePitches = async () => {
    setGeneratingPitches(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pitches', count: 3 }),
      });

      if (!res.ok) throw new Error('Failed to generate pitches');
      const data = await res.json();
      setPitches(data.pitches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate pitches');
    } finally {
      setGeneratingPitches(false);
    }
  };

  const handleGenerateStory = async (pitch: StoryPitch) => {
    setGeneratingStory(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', pitchId: pitch.id }),
      });

      if (!res.ok) throw new Error('Failed to generate story');

      setSelectedPitch(null);
      setPitches([]);
      await fetchWorld();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate story');
    } finally {
      setGeneratingStory(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!world) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">World not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            {world.is_published ? (
              <button
                onClick={() => handlePublish(false)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <EyeOff className="w-4 h-4" />
                Unpublish
              </button>
            ) : (
              <button
                onClick={() => handlePublish(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                Publish
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Status Badge */}
        <div className="flex items-center gap-3 mb-6">
          {world.is_published ? (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full">
              <CheckCircle className="w-4 h-4" />
              Published
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-600/50 text-slate-400 rounded-full">
              <Clock className="w-4 h-4" />
              Draft
            </span>
          )}
          <span className="text-slate-500 text-sm">
            {stories.length} {stories.length === 1 ? 'story' : 'stories'}
          </span>
        </div>

        {/* World Image */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">World Image</h2>
            <button
              onClick={handleRegenerateImage}
              disabled={regeneratingImage}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors disabled:opacity-50"
            >
              {regeneratingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {regeneratingImage ? 'Generating...' : 'Regenerate Image'}
            </button>
          </div>

          <div className="flex items-center justify-center">
            {world.background_image_url ? (
              <div className="relative">
                <img
                  src={world.background_image_url}
                  alt={world.display_name}
                  className="w-48 h-48 rounded-full object-cover shadow-lg shadow-purple-500/20"
                />
                <div className="absolute inset-0 rounded-full ring-2 ring-purple-500/30" />
              </div>
            ) : (
              <div className="w-48 h-48 rounded-full bg-slate-700/50 flex flex-col items-center justify-center text-slate-500">
                <ImageIcon className="w-12 h-12 mb-2" />
                <span className="text-sm">No image yet</span>
                <span className="text-xs">Click regenerate to create one</span>
              </div>
            )}
          </div>
        </section>

        {/* World Details */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">World Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">No theme</option>
                <option value="magical-forest">Magical Forest</option>
                <option value="space">Space</option>
                <option value="underwater">Underwater</option>
                <option value="dinosaurs">Dinosaurs</option>
                <option value="pirates">Pirates</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Unlock Cost (points)</label>
                <input
                  type="number"
                  min="0"
                  value={unlockCost}
                  onChange={(e) => setUnlockCost(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-xs text-slate-500 mt-1">Set to 0 for free worlds</p>
              </div>

              <div className="flex items-end pb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isStarter}
                    onChange={(e) => setIsStarter(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700/50 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                  />
                  <div>
                    <span className="text-white font-medium">Starter World</span>
                    <p className="text-xs text-slate-500">Available to new users</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Stories List */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Stories ({stories.length})</h2>

          {stories.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No stories yet. Create one below!</p>
          ) : (
            <div className="space-y-3">
              {stories.map((story) => (
                <motion.button
                  key={story.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onSelectStory(story.id)}
                  className="w-full bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 text-left hover:border-cyan-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-medium">{story.title}</h3>
                        <p className="text-sm text-slate-400 line-clamp-1">{story.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {story.status === 'generating' ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                          <Clock className="w-3 h-3" />
                          Generating
                        </span>
                      ) : story.is_published ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Published
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-600/50 text-slate-400 text-xs rounded-full">
                          Draft
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </section>

        {/* Create Story */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Create New Story</h2>

          {/* Selected Pitch / Outline Review */}
          {selectedPitch && (
            <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-purple-300">{selectedPitch.title}</h3>
                <button
                  onClick={() => setSelectedPitch(null)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
              </div>
              <p className="text-sm text-slate-300 mb-4">{selectedPitch.description}</p>

              <div className="space-y-2 mb-4">
                {selectedPitch.outline.map((ch) => (
                  <div key={ch.chapter} className="flex gap-3 text-sm">
                    <span className="text-purple-400 font-medium w-8">Ch {ch.chapter}</span>
                    <div>
                      <span className="text-white">{ch.title}</span>
                      <span className="text-slate-400 ml-2">— {ch.summary}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleGenerateStory(selectedPitch)}
                disabled={generatingStory}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {generatingStory ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Story Content...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Approve & Generate Full Story
                  </>
                )}
              </button>
            </div>
          )}

          {!selectedPitch && (
            <>
              {/* Mode 1: User Idea */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-cyan-400" />
                  <label className="text-sm text-slate-300">Your Story Idea</label>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={storyIdea}
                    onChange={(e) => setStoryIdea(e.target.value)}
                    placeholder="e.g., A story about finding a lost star..."
                    className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    onClick={handleGenerateOutline}
                    disabled={generatingOutline || !storyIdea.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {generatingOutline ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Generate Outline
                  </button>
                </div>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600/50"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-slate-800/50 text-slate-500 text-sm">OR</span>
                </div>
              </div>

              {/* Mode 2: AI Pitches */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <label className="text-sm text-slate-300">AI Story Suggestions</label>
                  </div>
                  <button
                    onClick={handleGeneratePitches}
                    disabled={generatingPitches}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-300 hover:bg-purple-500/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {generatingPitches ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {pitches.length === 0 ? 'Generate Ideas' : 'Refresh'}
                  </button>
                </div>

                {pitches.length === 0 && !generatingPitches && (
                  <p className="text-slate-500 text-sm text-center py-6">
                    Click "Generate Ideas" to get AI story suggestions
                  </p>
                )}

                {generatingPitches && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span className="ml-2 text-slate-400">Generating story ideas...</span>
                  </div>
                )}

                {pitches.length > 0 && (
                  <div className="space-y-3">
                    {pitches.filter(p => !p.is_used).map((pitch) => (
                      <motion.button
                        key={pitch.id}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => setSelectedPitch(pitch)}
                        className="w-full bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 text-left hover:border-purple-500/50 transition-colors"
                      >
                        <h4 className="font-medium mb-1">{pitch.title}</h4>
                        <p className="text-sm text-slate-400">{pitch.description}</p>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
