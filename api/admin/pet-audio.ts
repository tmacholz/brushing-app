import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './lib/db.js';

// Manages pet name audio URLs in the database
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();

  // GET - Get all pet audio URLs
  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT pet_id, audio_url FROM pet_name_audio`;

      const petAudio: Record<string, string> = {};
      rows.forEach((row) => {
        petAudio[row.pet_id] = row.audio_url;
      });

      return res.status(200).json({ petAudio });
    } catch (error) {
      console.error('Error fetching pet audio:', error);
      return res.status(500).json({ error: 'Failed to fetch pet audio' });
    }
  }

  // POST - Save pet audio URL
  if (req.method === 'POST') {
    const { petId, audioUrl } = req.body;

    if (!petId || !audioUrl) {
      return res.status(400).json({ error: 'Missing petId or audioUrl' });
    }

    try {
      // Upsert - insert or update if exists
      await sql`
        INSERT INTO pet_name_audio (pet_id, audio_url)
        VALUES (${petId}, ${audioUrl})
        ON CONFLICT (pet_id)
        DO UPDATE SET audio_url = EXCLUDED.audio_url, created_at = NOW()
      `;

      return res.status(200).json({ success: true, petId, audioUrl });
    } catch (error) {
      console.error('Error saving pet audio:', error);
      return res.status(500).json({ error: 'Failed to save pet audio' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
