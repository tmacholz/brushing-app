import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Lock, Sparkles, Loader2 } from 'lucide-react';
import { useChild } from '../context/ChildContext';
import { useContent } from '../context/ContentContext';
import { useAudio } from '../context/AudioContext';
import type { Collectible } from '../types';

interface CollectionScreenProps {
  onBack: () => void;
}

type TabType = 'stickers' | 'accessories';

export function CollectionScreen({ onBack }: CollectionScreenProps) {
  const { child } = useChild();
  const { worlds } = useContent();
  const { playSound } = useAudio();
  const [activeTab, setActiveTab] = useState<TabType>('stickers');
  const [allCollectibles, setAllCollectibles] = useState<Collectible[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Collectible | null>(null);

  // Fetch published collectibles on mount
  useEffect(() => {
    async function fetchCollectibles() {
      try {
        const response = await fetch('/api/admin/collectibles?isPublished=true');
        if (response.ok) {
          const data = await response.json();
          setAllCollectibles(data.collectibles || []);
        }
      } catch (error) {
        console.error('Error fetching collectibles:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCollectibles();
  }, []);

  if (!child) return null;

  const collectedStickers = new Set(child.collectedStickers);
  const collectedAccessories = new Set(child.collectedAccessories);

  // Filter collectibles by type
  const stickers = allCollectibles.filter(c => c.type === 'sticker');
  const accessories = allCollectibles.filter(c => c.type === 'accessory');

  // Group stickers by world
  const stickersByWorld = stickers.reduce((acc, sticker) => {
    const worldId = sticker.worldId || 'universal';
    if (!acc[worldId]) acc[worldId] = [];
    acc[worldId].push(sticker);
    return acc;
  }, {} as Record<string, Collectible[]>);

  // Get world display name
  const getWorldName = (worldId: string) => {
    if (worldId === 'universal') return 'Universal';
    const world = worlds.find(w => w.id === worldId);
    return world?.displayName || worldId;
  };

  // Count collected items
  const collectedStickerCount = stickers.filter(s => collectedStickers.has(s.id)).length;
  const collectedAccessoryCount = accessories.filter(a => collectedAccessories.has(a.id)).length;

  const handleTabChange = (tab: TabType) => {
    playSound('tap');
    setActiveTab(tab);
  };

  const handleItemClick = (item: Collectible) => {
    const isCollected = item.type === 'sticker'
      ? collectedStickers.has(item.id)
      : collectedAccessories.has(item.id);

    if (isCollected) {
      playSound('tap');
      setSelectedItem(item);
    }
  };

  const handleCloseModal = () => {
    playSound('tap');
    setSelectedItem(null);
  };

  const renderCollectibleCard = (item: Collectible) => {
    const isCollected = item.type === 'sticker'
      ? collectedStickers.has(item.id)
      : collectedAccessories.has(item.id);

    return (
      <motion.button
        key={item.id}
        whileHover={isCollected ? { scale: 1.05 } : {}}
        whileTap={isCollected ? { scale: 0.95 } : {}}
        onClick={() => handleItemClick(item)}
        className={`relative aspect-square rounded-2xl overflow-hidden ${
          isCollected
            ? 'bg-white shadow-lg cursor-pointer'
            : 'bg-gray-200 cursor-default'
        }`}
      >
        {isCollected ? (
          <>
            <img
              src={item.imageUrl}
              alt={item.displayName}
              className="w-full h-full object-cover"
            />
            {/* Rarity indicator */}
            {item.rarity === 'rare' && (
              <div className="absolute top-1 right-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Sparkles className="w-3 h-3" />
              </div>
            )}
            {item.rarity === 'uncommon' && (
              <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </motion.button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">My Collection</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Tabs */}
        <div className="flex px-4 pb-2 gap-2">
          <button
            onClick={() => handleTabChange('stickers')}
            className={`flex-1 py-2 px-4 rounded-full font-medium transition-all ${
              activeTab === 'stickers'
                ? 'bg-pink-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Stickers ({collectedStickerCount}/{stickers.length})
          </button>
          <button
            onClick={() => handleTabChange('accessories')}
            className={`flex-1 py-2 px-4 rounded-full font-medium transition-all ${
              activeTab === 'accessories'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            Accessories ({collectedAccessoryCount}/{accessories.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500 mb-2" />
            <p className="text-gray-500">Loading collection...</p>
          </div>
        ) : activeTab === 'stickers' ? (
          stickers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-6xl mb-4">🎨</p>
              <p className="text-gray-600">No stickers available yet!</p>
              <p className="text-gray-400 text-sm mt-2">
                Complete brushing sessions to earn stickers
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(stickersByWorld).map(([worldId, worldStickers]) => (
                <div key={worldId}>
                  <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    {worldId === 'universal' ? '🌟' : '🌍'} {getWorldName(worldId)}
                    <span className="text-sm font-normal text-gray-400">
                      ({worldStickers.filter(s => collectedStickers.has(s.id)).length}/{worldStickers.length})
                    </span>
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    {worldStickers.map(renderCollectibleCard)}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          accessories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-6xl mb-4">✨</p>
              <p className="text-gray-600">No accessories available yet!</p>
              <p className="text-gray-400 text-sm mt-2">
                Rare accessories will appear here when earned
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {accessories.map(renderCollectibleCard)}
            </div>
          )
        )}
      </div>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-pink-100 to-purple-100">
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.displayName}
                  className="w-full h-full object-contain p-4"
                />
                {selectedItem.rarity !== 'common' && (
                  <div className={`absolute top-3 right-3 ${
                    selectedItem.rarity === 'rare' ? 'bg-purple-500' : 'bg-blue-500'
                  } text-white text-xs px-2 py-1 rounded-full flex items-center gap-1`}>
                    <Sparkles className="w-3 h-3" />
                    {selectedItem.rarity === 'rare' ? 'Rare' : 'Uncommon'}
                  </div>
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-1">
                {selectedItem.displayName}
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                {selectedItem.description}
              </p>

              {selectedItem.worldId && (
                <p className="text-gray-400 text-xs mb-4">
                  From: {getWorldName(selectedItem.worldId)}
                </p>
              )}

              <button
                onClick={handleCloseModal}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3 rounded-xl"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CollectionScreen;
