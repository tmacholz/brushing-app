import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles, LogOut, Globe, BookOpen, Loader2 } from 'lucide-react';

interface World {
  id: string;
  name: string;
  display_name: string;
  description: string;
  theme: string | null;
  is_published: boolean;
  story_count: number;
  created_at: string;
}

interface AdminDashboardProps {
  onSelectWorld: (worldId: string) => void;
  onLogout: () => void;
}

export function AdminDashboard({ onSelectWorld, onLogout }: AdminDashboardProps) {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchWorlds = async () => {
    try {
      const res = await fetch('/api/admin/worlds');
      if (!res.ok) throw new Error('Failed to fetch worlds');
      const data = await res.json();
      setWorlds(data.worlds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load worlds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorlds();
  }, []);

  const handleGenerateWorld = async () => {
    setGenerating(true);
    try {
      // Generate world with AI
      const res = await fetch('/api/admin/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      if (!res.ok) throw new Error('Failed to generate world');
      const data = await res.json();

      // Save the generated world
      const saveRes = await fetch('/api/admin/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.world),
      });

      if (!saveRes.ok) throw new Error('Failed to save world');

      await fetchWorlds();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate world');
    } finally {
      setGenerating(false);
    }
  };

  const getThemeEmoji = (theme: string | null): string => {
    switch (theme) {
      case 'magical-forest': return '🌲';
      case 'space': return '🚀';
      case 'underwater': return '🐚';
      case 'dinosaurs': return '🦕';
      case 'pirates': return '🏴‍☠️';
      default: return '🌍';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">BrushQuest Admin</h1>
              <p className="text-sm text-slate-400">Content Management</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Actions */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Worlds</h2>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateWorld}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded-lg transition-colors disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generating ? 'Generating...' : 'Generate with AI'}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create World
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        )}

        {/* Worlds Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {worlds.map((world) => (
              <motion.button
                key={world.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectWorld(world.id)}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-left hover:border-cyan-500/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center text-2xl">
                    {getThemeEmoji(world.theme)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{world.display_name}</h3>
                      {world.is_published && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                          Published
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2 mt-1">
                      {world.description}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{world.story_count} {world.story_count === 1 ? 'story' : 'stories'}</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}

            {worlds.length === 0 && !loading && (
              <div className="col-span-full text-center py-20 text-slate-500">
                <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No worlds yet</p>
                <p className="text-sm mt-1">Create or generate your first world to get started</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create World Modal */}
      {showCreateModal && (
        <CreateWorldModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchWorlds();
          }}
        />
      )}
    </div>
  );
}

function CreateWorldModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/worlds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.toLowerCase().replace(/\s+/g, '-'),
          displayName,
          description,
          theme: theme || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to create world');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create world');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-4">Create World</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setName(e.target.value.toLowerCase().replace(/\s+/g, '-'));
              }}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g., Enchanted Castle"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              rows={3}
              placeholder="A short description of this world..."
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Theme (optional)</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Select a theme...</option>
              <option value="magical-forest">Magical Forest</option>
              <option value="space">Space</option>
              <option value="underwater">Underwater</option>
              <option value="dinosaurs">Dinosaurs</option>
              <option value="pirates">Pirates</option>
            </select>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

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
