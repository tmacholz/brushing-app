import type { ChestReward, Collectible } from '../types';

// Base reward probability weights (adjusted dynamically based on availability)
const BASE_REWARD_WEIGHTS = {
  points: 60,      // Base chance for bonus points
  sticker: 35,     // Base chance for a sticker (if available)
  accessory: 5,    // Base chance for an accessory (rare!)
};

// Point amounts with their relative weights
const POINT_REWARDS = [
  { amount: 5, weight: 50 },   // Most common
  { amount: 10, weight: 35 },  // Uncommon
  { amount: 15, weight: 10 },  // Rare
  { amount: 25, weight: 5 },   // Very rare
];

/**
 * Weighted random selection helper
 */
function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }

  return items[items.length - 1];
}

/**
 * Select reward type based on weights, considering availability
 */
function selectRewardType(stickersAvailable: boolean, accessoriesAvailable: boolean): 'points' | 'sticker' | 'accessory' {
  const types: { type: 'points' | 'sticker' | 'accessory'; weight: number }[] = [
    { type: 'points', weight: BASE_REWARD_WEIGHTS.points },
  ];

  // Only include sticker if there are uncollected stickers
  if (stickersAvailable) {
    types.push({ type: 'sticker', weight: BASE_REWARD_WEIGHTS.sticker });
  }

  // Only include accessory if there are uncollected accessories
  if (accessoriesAvailable) {
    types.push({ type: 'accessory', weight: BASE_REWARD_WEIGHTS.accessory });
  }

  return weightedRandom(types).type;
}

/**
 * Generate a random point reward
 */
function generatePointReward(): ChestReward {
  const selected = weightedRandom(POINT_REWARDS);
  return {
    type: 'points',
    amount: selected.amount,
  };
}

/**
 * Fetch available collectibles from the API, filtering out already-collected ones
 */
async function fetchCollectibles(
  type: 'sticker' | 'accessory',
  worldId?: string,
  alreadyCollectedIds: string[] = []
): Promise<Collectible[]> {
  try {
    const params = new URLSearchParams({ type });
    if (worldId) params.append('worldId', worldId);

    const response = await fetch(`/api/admin/collectibles?${params}`);
    if (!response.ok) return [];

    const data = await response.json();
    const allCollectibles: Collectible[] = data.collectibles || [];

    // Filter out already-collected items to ensure uniqueness
    return allCollectibles.filter(c => !alreadyCollectedIds.includes(c.id));
  } catch (error) {
    console.error('Error fetching collectibles:', error);
    return [];
  }
}

/**
 * Check how many uncollected stickers are available
 * Used by the wheel to determine if sticker segments should be shown
 */
export async function getAvailableStickersCount(
  worldId?: string,
  collectedStickers: string[] = []
): Promise<number> {
  const available = await fetchCollectibles('sticker', worldId, collectedStickers);
  return available.length;
}

/**
 * Check how many uncollected accessories are available
 */
export async function getAvailableAccessoriesCount(
  collectedAccessories: string[] = []
): Promise<number> {
  const available = await fetchCollectibles('accessory', undefined, collectedAccessories);
  return available.length;
}

/**
 * Select a collectible with rarity weighting
 * Prefers world-specific items but falls back to universal
 */
function selectCollectible(collectibles: Collectible[], worldId?: string): Collectible | null {
  if (collectibles.length === 0) return null;

  // Separate world-specific and universal collectibles
  const worldSpecific = collectibles.filter(c => c.worldId === worldId);
  const universal = collectibles.filter(c => !c.worldId);

  // Prefer world-specific (70%) if available
  let pool: Collectible[];
  if (worldSpecific.length > 0 && Math.random() < 0.7) {
    pool = worldSpecific;
  } else if (universal.length > 0) {
    pool = universal;
  } else {
    pool = collectibles;
  }

  // Weight by rarity (common items more likely)
  const weighted: Collectible[] = [];
  for (const c of pool) {
    const weight = c.rarity === 'common' ? 5 : c.rarity === 'uncommon' ? 3 : 1;
    for (let i = 0; i < weight; i++) {
      weighted.push(c);
    }
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}

/**
 * Generate a mystery chest reward
 * Stickers and accessories are always unique - once collected, they won't appear again.
 *
 * @param worldId - Current world ID (for themed rewards)
 * @param collectedStickers - IDs of stickers the child already has
 * @param collectedAccessories - IDs of accessories the child already has
 */
export async function generateChestReward(
  worldId?: string,
  collectedStickers: string[] = [],
  collectedAccessories: string[] = []
): Promise<ChestReward> {
  // First, check what collectibles are actually available (not yet collected)
  const [availableStickers, availableAccessories] = await Promise.all([
    fetchCollectibles('sticker', worldId, collectedStickers),
    fetchCollectibles('accessory', undefined, collectedAccessories),
  ]);

  const stickersAvailable = availableStickers.length > 0;
  const accessoriesAvailable = availableAccessories.length > 0;

  // Select reward type based on what's actually available
  const rewardType = selectRewardType(stickersAvailable, accessoriesAvailable);

  if (rewardType === 'points') {
    return generatePointReward();
  }

  // Get the appropriate pool of available collectibles
  const collectibles = rewardType === 'sticker' ? availableStickers : availableAccessories;

  if (collectibles.length === 0) {
    // This shouldn't happen since we check availability first, but fallback just in case
    return generatePointReward();
  }

  const selected = selectCollectible(collectibles, worldId);

  if (!selected) {
    return generatePointReward();
  }

  // All selected collectibles are guaranteed to be new since we filtered out collected ones
  return {
    type: rewardType,
    collectible: selected,
    isNew: true,
  };
}

/**
 * Reward type availability info for building dynamic wheel segments
 */
export interface RewardAvailability {
  stickersAvailable: boolean;
  stickerCount: number;
  accessoriesAvailable: boolean;
  accessoryCount: number;
}

/**
 * Check what reward types are available for the wheel
 */
export async function getRewardAvailability(
  worldId?: string,
  collectedStickers: string[] = [],
  collectedAccessories: string[] = []
): Promise<RewardAvailability> {
  const [stickers, accessories] = await Promise.all([
    fetchCollectibles('sticker', worldId, collectedStickers),
    fetchCollectibles('accessory', undefined, collectedAccessories),
  ]);

  return {
    stickersAvailable: stickers.length > 0,
    stickerCount: stickers.length,
    accessoriesAvailable: accessories.length > 0,
    accessoryCount: accessories.length,
  };
}

/**
 * Generate a reward of a specific type (used when wheel lands on a specific segment)
 */
export async function generateSpecificReward(
  rewardType: 'points' | 'sticker' | 'accessory',
  pointAmount?: number,
  worldId?: string,
  collectedStickers: string[] = [],
  collectedAccessories: string[] = []
): Promise<ChestReward> {
  if (rewardType === 'points') {
    // If a specific point amount is requested, use it; otherwise generate random
    if (pointAmount !== undefined) {
      return { type: 'points', amount: pointAmount };
    }
    return generatePointReward();
  }

  const alreadyCollected = rewardType === 'sticker' ? collectedStickers : collectedAccessories;
  const collectibles = await fetchCollectibles(
    rewardType,
    rewardType === 'sticker' ? worldId : undefined,
    alreadyCollected
  );

  if (collectibles.length === 0) {
    // Fallback to points if no collectibles available
    return generatePointReward();
  }

  const selected = selectCollectible(collectibles, worldId);

  if (!selected) {
    return generatePointReward();
  }

  return {
    type: rewardType,
    collectible: selected,
    isNew: true,
  };
}

/**
 * Get display info for a reward (for UI)
 */
export function getRewardDisplayInfo(reward: ChestReward): {
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
} {
  switch (reward.type) {
    case 'points':
      return {
        title: `+${reward.amount} Points!`,
        subtitle: 'Bonus points added!',
        emoji: '⭐',
        color: 'from-yellow-400 to-amber-500',
      };
    case 'sticker':
      return {
        title: reward.isNew ? 'New Sticker!' : 'Sticker',
        subtitle: reward.collectible.displayName,
        emoji: '🎨',
        color: reward.isNew ? 'from-pink-400 to-purple-500' : 'from-gray-400 to-gray-500',
      };
    case 'accessory':
      return {
        title: reward.isNew ? 'Rare Find!' : 'Accessory',
        subtitle: reward.collectible.displayName,
        emoji: '✨',
        color: 'from-purple-400 to-indigo-600',
      };
  }
}
