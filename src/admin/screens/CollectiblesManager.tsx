import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Trash2,
  Edit3,
  Filter,
  Image,
  Star,
  Check,
  X,
} from 'lucide-react';

interface Collectible {
  id: string;
  type: 'sticker' | 'accessory';
  name: string;
  displayName: string;
  description: string | null;
  imageUrl: string;
  rarity: 'common' | 'uncommon' | 'rare';
  worldId: string | null;
  petId: string | null;
  isPublished: boolean;
  createdAt: string;
}

interface World {
  id: string;
  name: string;
  display_name: string;
}

interface CollectiblesManagerProps {
  onBack: () => void;
}

export function CollectiblesManager({ onBack }: CollectiblesManagerProps) {
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingCount, setGeneratingCount] = useState(0);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'sticker' | 'accessory'>('all');
  const [worldFilter, setWorldFilter] = useState<string>('all');

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Collectible | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCollectibles = async () => {
    try {
      const res = await fetch('/api/admin/collectibles');
      if (!res.ok) throw new Error('Failed to fetch collectibles');
      const data = await res.json();
      setCollectibles(data.collectibles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collectibles');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorlds = async () => {
    try {
      const res = await fetch('/api/admin/worlds');
      if (!res.ok) return;
      const data = await res.json();
      setWorlds(data.worlds || []);
    } catch {
      // Ignore - worlds are optional for filtering
    }
  };

  useEffect(() => {
    fetchCollectibles();
    fetchWorlds();
  }, []);

  const handleGenerate = async (
    worldId: string,
    worldName: string,
    count: number,
    customPrompt?: string,
    rarity?: 'common' | 'uncommon' | 'rare'
  ) => {
    setGenerating(true);
    setGeneratingCount(count);
    setError(null);

    try {
      const res = await fetch('/api/admin/collectibles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: count > 1 ? 'generate-batch' : 'generate',
          worldId: worldId || undefined,
          worldName: worldName || 'Universal',
          count,
          customPrompt: customPrompt || undefined,
          rarity: rarity || 'uncommon',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate stickers');
      }

      await fetchCollectibles();
      setShowGenerateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate stickers');
    } finally {
      setGenerating(false);
      setGeneratingCount(0);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/collectibles?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      setCollectibles((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Collectible>) => {
    try {
      const res = await fetch(`/api/admin/collectibles?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchCollectibles();
      setEditingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleTogglePublish = async (item: Collectible) => {
    await handleUpdate(item.id, { isPublished: !item.isPublished });
  };

  // Filter collectibles
  const filteredCollectibles = collectibles.filter((c) => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (worldFilter !== 'all') {
      if (worldFilter === 'universal' && c.worldId !== null) return false;
      if (worldFilter !== 'universal' && c.worldId !== worldFilter) return false;
    }
    return true;
  });

  const getWorldName = (worldId: string | null) => {
    if (!worldId) return 'Universal';
    const world = worlds.find((w) => w.id === worldId);
    return world?.display_name || worldId;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'rare':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'uncommon':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  // Stats
  const stickerCount = collectibles.filter((c) => c.type === 'sticker').length;
  const accessoryCount = collectibles.filter((c) => c.type === 'accessory').length;
  const publishedCount = collectibles.filter((c) => c.isPublished).length;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Collectibles Manager</h1>
              <p className="text-sm text-slate-400">
                {stickerCount} stickers, {accessoryCount} accessories ({publishedCount} published)
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generating ? `Generating ${generatingCount}...` : 'Generate Stickers'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400">Filter:</span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Types</option>
            <option value="sticker">Stickers</option>
            <option value="accessory">Accessories</option>
          </select>

          <select
            value={worldFilter}
            onChange={(e) => setWorldFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Worlds</option>
            <option value="universal">Universal</option>
            {worlds.map((world) => (
              <option key={world.id} value={world.id}>
                {world.display_name}
              </option>
            ))}
          </select>

          <span className="text-sm text-slate-500">
            Showing {filteredCollectibles.length} of {collectibles.length}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        )}

        {/* Grid */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredCollectibles.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative bg-slate-800/50 border rounded-xl overflow-hidden group ${
                  item.isPublished ? 'border-green-500/30' : 'border-slate-700/50'
                }`}
              >
                {/* Image */}
                <div className="aspect-square bg-slate-700/50 relative">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-8 h-8 text-slate-500" />
                    </div>
                  )}

                  {/* Overlay actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-2 bg-red-500 hover:bg-red-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Rarity badge */}
                  <div
                    className={`absolute top-2 right-2 px-2 py-0.5 text-xs rounded-full border ${getRarityColor(
                      item.rarity
                    )}`}
                  >
                    {item.rarity}
                  </div>

                  {/* Type badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 text-xs rounded-full bg-slate-900/80 text-slate-300">
                    {item.type === 'sticker' ? '🎨' : '✨'} {item.type}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="font-medium text-sm truncate">{item.displayName}</h3>
                  <p className="text-xs text-slate-400 truncate">{getWorldName(item.worldId)}</p>

                  {/* Publish toggle */}
                  <button
                    onClick={() => handleTogglePublish(item)}
                    className={`mt-2 w-full py-1.5 text-xs rounded-lg transition-colors ${
                      item.isPublished
                        ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {item.isPublished ? (
                      <>
                        <Check className="w-3 h-3 inline mr-1" />
                        Published
                      </>
                    ) : (
                      'Publish'
                    )}
                  </button>
                </div>
              </motion.div>
            ))}

            {filteredCollectibles.length === 0 && !loading && (
              <div className="col-span-full text-center py-20 text-slate-500">
                <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No collectibles found</p>
                <p className="text-sm mt-1">Generate some stickers to get started</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Generate Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <GenerateModal
            worlds={worlds}
            onClose={() => setShowGenerateModal(false)}
            onGenerate={handleGenerate}
            generating={generating}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <EditModal
            item={editingItem}
            worlds={worlds}
            onClose={() => setEditingItem(null)}
            onSave={(updates) => handleUpdate(editingItem.id, updates)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GenerateModal({
  worlds,
  onClose,
  onGenerate,
  generating,
}: {
  worlds: World[];
  onClose: () => void;
  onGenerate: (worldId: string, worldName: string, count: number, customPrompt?: string, rarity?: 'common' | 'uncommon' | 'rare') => void;
  generating: boolean;
}) {
  const [selectedWorld, setSelectedWorld] = useState('');
  const [count, setCount] = useState(1);
  const [customPrompt, setCustomPrompt] = useState('');
  const [rarity, setRarity] = useState<'common' | 'uncommon' | 'rare'>('uncommon');

  const selectedWorldObj = worlds.find((w) => w.id === selectedWorld);
  const worldName = selectedWorldObj?.display_name || 'Universal';

  // When using custom prompt, default to 1 sticker
  const effectiveCount = customPrompt ? 1 : count;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Generate Stickers
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">World Theme</label>
            <select
              value={selectedWorld}
              onChange={(e) => setSelectedWorld(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Universal (no theme)</option>
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.display_name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Themed stickers match the world&apos;s aesthetic
            </p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Custom Prompt <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., a friendly dragon breathing bubbles, a magical toothbrush with sparkles..."
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={3}
            />
            <p className="text-xs text-slate-500 mt-1">
              Describe what you want on the sticker. Leave empty for auto-generated themes.
            </p>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Rarity</label>
            <div className="flex gap-2">
              {(['common', 'uncommon', 'rare'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRarity(r)}
                  className={`flex-1 py-2 rounded-lg capitalize transition-colors ${
                    rarity === r
                      ? r === 'rare'
                        ? 'bg-purple-500 text-white'
                        : r === 'uncommon'
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-500 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {!customPrompt && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Number of Stickers</label>
              <div className="flex gap-2">
                {[1, 3, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`flex-1 py-2 rounded-lg transition-colors ${
                      count === n
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Batch generation uses random themes from the world
              </p>
            </div>
          )}

          <div className="bg-slate-700/30 rounded-lg p-3 text-sm text-slate-400">
            <p>
              Will generate <strong className="text-white">{effectiveCount}</strong>{' '}
              <strong className={`${rarity === 'rare' ? 'text-purple-300' : rarity === 'uncommon' ? 'text-blue-300' : 'text-slate-300'}`}>{rarity}</strong>{' '}
              <strong className="text-white">{worldName}</strong> sticker
              {effectiveCount > 1 ? 's' : ''} using Gemini.
              {customPrompt && (
                <span className="block mt-1 text-cyan-300">
                  Using custom prompt: &quot;{customPrompt.slice(0, 50)}{customPrompt.length > 50 ? '...' : ''}&quot;
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={generating}
            className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onGenerate(selectedWorld, worldName, effectiveCount, customPrompt || undefined, rarity)}
            disabled={generating}
            className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function EditModal({
  item,
  worlds,
  onClose,
  onSave,
}: {
  item: Collectible;
  worlds: World[];
  onClose: () => void;
  onSave: (updates: Partial<Collectible>) => void;
}) {
  const [displayName, setDisplayName] = useState(item.displayName);
  const [description, setDescription] = useState(item.description || '');
  const [rarity, setRarity] = useState(item.rarity);
  const [worldId, setWorldId] = useState(item.worldId || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      displayName,
      description: description || null,
      rarity,
      worldId: worldId || null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md"
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image className="w-8 h-8 text-slate-500" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">Edit Collectible</h2>
            <p className="text-sm text-slate-400">{item.type}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Rarity</label>
            <div className="flex gap-2">
              {(['common', 'uncommon', 'rare'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRarity(r)}
                  className={`flex-1 py-2 rounded-lg capitalize transition-colors ${
                    rarity === r
                      ? r === 'rare'
                        ? 'bg-purple-500 text-white'
                        : r === 'uncommon'
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-500 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">World</label>
            <select
              value={worldId}
              onChange={(e) => setWorldId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Universal</option>
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.display_name}
                </option>
              ))}
            </select>
          </div>

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

export default CollectiblesManager;
