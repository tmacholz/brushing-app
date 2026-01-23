import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../lib/db.js';

// Get all existing music from worlds (for reuse/selection)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getDb();

  try {
    // Get all worlds with music
    const worldsWithMusic = await sql`
      SELECT id, display_name, background_music_url, theme
      FROM worlds
      WHERE background_music_url IS NOT NULL
      ORDER BY display_name
    `;

    const musicLibrary = worldsWithMusic.map((world) => ({
      id: world.id,
      name: world.display_name,
      url: world.background_music_url,
      theme: world.theme,
      source: 'world' as const,
    }));

    return res.status(200).json({ music: musicLibrary });
  } catch (error) {
    console.error('Error fetching music library:', error);
    return res.status(500).json({ error: 'Failed to fetch music library' });
  }
}
