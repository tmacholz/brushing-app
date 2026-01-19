import { put } from '@vercel/blob';
import { getDb } from './db.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent';

// Sticker style - more graphic/icon style than story illustrations
const STICKER_STYLE = `Cute collectible sticker design, flat illustration style with bold outlines,
vibrant saturated colors, kawaii aesthetic, slightly glossy appearance,
simple background or transparent, suitable for children ages 4-8,
no text in image, circular or badge-shaped composition,
playful and rewarding feel, like a prize or achievement badge.`;

// World theme to sticker ideas mapping
const worldStickerThemes: Record<string, { icon: string; colors: string }[]> = {
  'magical-forest': [
    { icon: 'a golden magical leaf with sparkles', colors: 'gold, emerald green, soft yellow' },
    { icon: 'a cute fairy with tiny wings', colors: 'pink, lavender, silver sparkles' },
    { icon: 'an enchanted acorn with a glowing center', colors: 'brown, amber, golden glow' },
    { icon: 'a friendly owl face', colors: 'brown, cream, golden eyes' },
    { icon: 'a magical mushroom with spots', colors: 'red, white, soft green' },
  ],
  'space-station': [
    { icon: 'a shooting star with a trail', colors: 'yellow, orange, deep blue' },
    { icon: 'a crescent moon with a cute face', colors: 'silver, pale yellow, deep purple' },
    { icon: 'a friendly rocket ship', colors: 'red, silver, orange flames' },
    { icon: 'a ringed planet', colors: 'purple, pink rings, stars' },
    { icon: 'a smiling alien face', colors: 'green, big black eyes, silver' },
  ],
  'underwater-kingdom': [
    { icon: 'a shimmering pearl in a shell', colors: 'white, pink, iridescent' },
    { icon: 'a beautiful spiral seashell', colors: 'coral pink, cream, peach' },
    { icon: 'a golden treasure coin', colors: 'gold, amber, shiny' },
    { icon: 'a cute clownfish', colors: 'orange, white, black stripes' },
    { icon: 'a friendly octopus', colors: 'purple, pink, big eyes' },
  ],
  'dinosaur-valley': [
    { icon: 'a dinosaur footprint', colors: 'brown, tan, earth tones' },
    { icon: 'a prehistoric fossil', colors: 'beige, amber, stone gray' },
    { icon: 'an erupting volcano badge', colors: 'red, orange, black' },
    { icon: 'a cute baby dinosaur egg', colors: 'cream, spots, cracking shell' },
    { icon: 'a friendly T-Rex face', colors: 'green, big teeth, happy eyes' },
  ],
  'pirate-cove': [
    { icon: 'a gold doubloon coin', colors: 'gold, amber, pirate skull' },
    { icon: 'a compass rose', colors: 'brass, red arrow, aged paper' },
    { icon: 'a rolled treasure map', colors: 'tan, red X marks, aged' },
    { icon: 'a pirate flag with cute skull', colors: 'black, white, red bandana' },
    { icon: 'a treasure chest overflowing', colors: 'brown, gold, jewels' },
  ],
};

// Universal stickers (not tied to a world)
const universalStickers = [
  { icon: 'a sparkling star badge', colors: 'gold, yellow, white sparkles' },
  { icon: 'a rainbow heart', colors: 'all rainbow colors, pink center' },
  { icon: 'a trophy cup', colors: 'gold, silver base, stars' },
  { icon: 'a thumbs up badge', colors: 'blue, white, yellow burst' },
  { icon: 'a smiley tooth', colors: 'white, pink gums, sparkle' },
];

async function generateStickerImage(
  prompt: string,
  storageKey: string
): Promise<{ url: string; isDataUrl: boolean }> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const fullPrompt = `${STICKER_STYLE}

Create a collectible sticker featuring: ${prompt}

REQUIREMENTS:
- Circular or badge-shaped design
- Bold clean outlines
- Vibrant kawaii style
- Slightly glossy/shiny appearance
- No text or words
- Simple clean background
- Should look like a prize/reward sticker`;

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  const responseParts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find(
    (part: { inlineData?: { mimeType: string; data: string } }) => part.inlineData
  );

  if (!imagePart?.inlineData) {
    throw new Error('No image generated');
  }

  const { mimeType, data: base64Data } = imagePart.inlineData;

  // Try to upload to Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const blob = await put(storageKey, imageBuffer, {
        access: 'public',
        contentType: mimeType || 'image/png',
        allowOverwrite: true,
      });
      return { url: blob.url, isDataUrl: false };
    } catch (blobError) {
      console.error('Blob upload failed, falling back to data URL:', blobError);
    }
  }

  return { url: `data:${mimeType || 'image/png'};base64,${base64Data}`, isDataUrl: true };
}

/**
 * Generate a sticker for a specific world theme
 * Uses the world's description to create themed stickers
 */
export async function generateWorldSticker(
  worldId: string,
  worldName: string,
  worldDescription?: string
): Promise<{
  name: string;
  displayName: string;
  description: string;
  imageUrl: string;
}> {
  // First, try to use hardcoded themes for known worlds
  const themes = worldStickerThemes[worldId];

  if (themes) {
    // Use hardcoded theme for known worlds
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const prompt = `${theme.icon}. Use these colors: ${theme.colors}`;
    const timestamp = Date.now();
    const stickerId = `${worldId}-sticker-${timestamp}`;

    const result = await generateStickerImage(prompt, `stickers/${stickerId}.png`);

    const iconName = theme.icon
      .replace(/^a /i, '')
      .replace(/^an /i, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      name: stickerId,
      displayName: iconName,
      description: `A special sticker from ${worldName}`,
      imageUrl: result.url,
    };
  }

  // For custom worlds, generate a themed sticker based on the world description
  const timestamp = Date.now();
  const stickerId = `${worldId.substring(0, 8)}-sticker-${timestamp}`;

  // Create a prompt based on the world's description
  const worldContext = worldDescription
    ? `This sticker is for a world called "${worldName}" which is described as: ${worldDescription}`
    : `This sticker is for a world called "${worldName}"`;

  const themedPrompt = `A cute collectible item or symbol that would fit in ${worldName}.
${worldContext}

Create something iconic and recognizable that a child would love to collect.
Use vibrant colors that match the world's theme.
Make it feel magical and special.`;

  const result = await generateStickerImage(themedPrompt, `stickers/${stickerId}.png`);

  // Generate a display name based on the world
  const displayName = `${worldName} Treasure`;

  return {
    name: stickerId,
    displayName,
    description: `A special sticker from ${worldName}`,
    imageUrl: result.url,
  };
}

/**
 * Generate a universal sticker (not tied to a world)
 */
export async function generateUniversalSticker(): Promise<{
  name: string;
  displayName: string;
  description: string;
  imageUrl: string;
}> {
  const theme = universalStickers[Math.floor(Math.random() * universalStickers.length)];

  const prompt = `${theme.icon}. Use these colors: ${theme.colors}`;
  const timestamp = Date.now();
  const stickerId = `universal-sticker-${timestamp}`;

  const result = await generateStickerImage(prompt, `stickers/${stickerId}.png`);

  const iconName = theme.icon
    .replace(/^a /i, '')
    .replace(/^an /i, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    name: stickerId,
    displayName: iconName,
    description: 'A special reward sticker!',
    imageUrl: result.url,
  };
}

/**
 * Save a generated sticker to the database
 */
export async function saveSticker(sticker: {
  name: string;
  displayName: string;
  description: string;
  imageUrl: string;
  worldId?: string | null;
  rarity?: 'common' | 'uncommon' | 'rare';
}) {
  const sql = getDb();

  const [saved] = await sql`
    INSERT INTO collectibles (type, name, display_name, description, image_url, world_id, rarity, is_published)
    VALUES ('sticker', ${sticker.name}, ${sticker.displayName}, ${sticker.description}, ${sticker.imageUrl}, ${sticker.worldId || null}, ${sticker.rarity || 'uncommon'}, true)
    RETURNING *
  `;

  return saved;
}

/**
 * Get all collectibles, optionally filtered
 */
export async function getCollectibles(filters?: {
  type?: 'sticker' | 'accessory';
  worldId?: string;
  rarity?: string;
  isPublished?: boolean;
}) {
  const sql = getDb();

  let query = sql`SELECT * FROM collectibles WHERE 1=1`;

  // Build dynamic query based on filters
  if (filters?.type) {
    query = sql`SELECT * FROM collectibles WHERE type = ${filters.type}`;
  }
  if (filters?.worldId) {
    query = sql`SELECT * FROM collectibles WHERE world_id = ${filters.worldId}`;
  }
  if (filters?.isPublished !== undefined) {
    query = sql`SELECT * FROM collectibles WHERE is_published = ${filters.isPublished}`;
  }

  // For now, get all and filter in JS (simpler than dynamic query building)
  const all = await sql`SELECT * FROM collectibles ORDER BY created_at DESC`;

  return all.filter(c => {
    if (filters?.type && c.type !== filters.type) return false;
    if (filters?.worldId && c.world_id !== filters.worldId) return false;
    if (filters?.rarity && c.rarity !== filters.rarity) return false;
    if (filters?.isPublished !== undefined && c.is_published !== filters.isPublished) return false;
    return true;
  });
}

/**
 * Get a random collectible for the mystery chest
 */
export async function getRandomCollectible(worldId?: string): Promise<{
  id: string;
  type: string;
  name: string;
  display_name: string;
  description: string;
  image_url: string;
  rarity: string;
  world_id: string | null;
} | null> {
  const sql = getDb();

  // Get published collectibles, preferring ones from the current world
  const collectibles = await sql`
    SELECT * FROM collectibles
    WHERE is_published = true
    ORDER BY
      CASE WHEN world_id = ${worldId || ''} THEN 0 ELSE 1 END,
      RANDOM()
    LIMIT 10
  `;

  if (collectibles.length === 0) return null;

  // Weight by rarity
  const weighted: typeof collectibles = [];
  for (const c of collectibles) {
    const weight = c.rarity === 'common' ? 5 : c.rarity === 'uncommon' ? 3 : 1;
    for (let i = 0; i < weight; i++) {
      weighted.push(c);
    }
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}
