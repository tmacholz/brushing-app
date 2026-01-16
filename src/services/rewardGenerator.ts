import type { ChestReward, Collectible } from '../types';

// Reward probability distribution
const REWARD_WEIGHTS = {
  points: 60,      // 60% chance for bonus points
  sticker: 35,     // 35% chance for a sticker
  accessory: 5,    // 5% chance for an accessory (rare!)
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
 * Select reward type based on weights
 */
function selectRewardType(): 'points' | 'sticker' | 'accessory' {
  const types = [
    { type: 'points' as const, weight: REWARD_WEIGHTS.points },
    { type: 'sticker' as const, weight: REWARD_WEIGHTS.sticker },
    { type: 'accessory' as const, weight: REWARD_WEIGHTS.accessory },
  ];

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
 * Fetch available collectibles from the API
 */
async function fetchCollectibles(type: 'sticker' | 'accessory', worldId?: string): Promise<Collectible[]> {
  try {
    const params = new URLSearchParams({ type });
    if (worldId) params.append('worldId', worldId);

    const response = await fetch(`/api/admin/collectibles?${params}`);
    if (!response.ok) return [];

    const data = await response.json();
    return data.collectibles || [];
  } catch (error) {
    console.error('Error fetching collectibles:', error);
    return [];
  }
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
  const rewardType = selectRewardType();

  if (rewardType === 'points') {
    return generatePointReward();
  }

  // Try to get a collectible
  const collectibles = await fetchCollectibles(rewardType, worldId);

  if (collectibles.length === 0) {
    // Fallback to points if no collectibles available
    return generatePointReward();
  }

  const selected = selectCollectible(collectibles, worldId);

  if (!selected) {
    return generatePointReward();
  }

  // Check if the child already has this collectible
  const alreadyCollected =
    rewardType === 'sticker'
      ? collectedStickers.includes(selected.id)
      : collectedAccessories.includes(selected.id);

  return {
    type: rewardType,
    collectible: selected,
    isNew: !alreadyCollected,
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
