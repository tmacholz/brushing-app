import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './admin/lib/db.js';

// Static pets as fallback (in case database is not available)
const staticPets = [
  { id: 'sparkle', name: 'sparkle', displayName: 'Sparkle', description: 'A cheerful star who fell from the sky', storyPersonality: 'brave and optimistic', imageUrl: '/pets/sparkle.png', avatarUrl: 'https://lg4pns09v4lekjo7.public.blob.vercel-storage.com/pet-avatars/sparkle.png', unlockCost: 0, isStarter: true },
  { id: 'bubbles', name: 'bubbles', displayName: 'Bubbles', description: 'A giggly fish who learned to float in air', storyPersonality: 'silly and curious', imageUrl: '/pets/bubbles.png', avatarUrl: 'https://lg4pns09v4lekjo7.public.blob.vercel-storage.com/pet-avatars/bubbles.png', unlockCost: 0, isStarter: true },
  { id: 'cosmo', name: 'cosmo', displayName: 'Cosmo', description: 'A mini robot from the future', storyPersonality: 'smart and helpful', imageUrl: '/pets/cosmo.png', avatarUrl: 'https://lg4pns09v4lekjo7.public.blob.vercel-storage.com/pet-avatars/cosmo.png', unlockCost: 75, isStarter: false },
  { id: 'fern', name: 'fern', displayName: 'Fern', description: 'A tiny forest dragon', storyPersonality: 'shy but fierce', imageUrl: '/pets/fern.png', avatarUrl: 'https://lg4pns09v4lekjo7.public.blob.vercel-storage.com/pet-avatars/fern.png', unlockCost: 100, isStarter: false },
  { id: 'captain-whiskers', name: 'captain-whiskers', displayName: 'Captain Whiskers', description: 'A cat who dreams of sailing', storyPersonality: 'dramatic and bold', imageUrl: '/pets/captain-whiskers.png', avatarUrl: 'https://lg4pns09v4lekjo7.public.blob.vercel-storage.com/pet-avatars/captain-whiskers.png', unlockCost: 150, isStarter: false },
];

// GET /api/pets - Get all published pets
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = getDb();
    const dbPets = await sql`
      SELECT
        id,
        name,
        display_name as "displayName",
        description,
        story_personality as "storyPersonality",
        image_url as "imageUrl",
        avatar_url as "avatarUrl",
        unlock_cost as "unlockCost",
        is_starter as "isStarter"
      FROM pets
      WHERE is_published = true
      ORDER BY is_starter DESC, unlock_cost ASC, created_at ASC
    `;

    // If database has pets, use them; otherwise fall back to static
    const pets = dbPets.length > 0 ? dbPets : staticPets;

    return res.status(200).json({ pets });
  } catch (error) {
    console.error('Error fetching pets, using static fallback:', error);
    // Fallback to static pets if database is unavailable
    return res.status(200).json({ pets: staticPets });
  }
}
