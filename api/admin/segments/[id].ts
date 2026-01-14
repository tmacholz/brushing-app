import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../lib/db.js';

// Handles segment updates (primarily for audio data)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid segment ID' });
  }

  // PUT - Update segment (audio URL, splice points, etc.)
  if (req.method === 'PUT') {
    const { baseAudioUrl, splicePoints } = req.body;

    try {
      const [segment] = await sql`
        UPDATE segments SET
          base_audio_url = COALESCE(${baseAudioUrl}, base_audio_url),
          splice_points = COALESCE(${JSON.stringify(splicePoints)}, splice_points)
        WHERE id = ${id} RETURNING *
      `;
      if (!segment) return res.status(404).json({ error: 'Segment not found' });
      return res.status(200).json({ segment });
    } catch (error) {
      console.error('Error updating segment:', error);
      return res.status(500).json({ error: 'Failed to update segment' });
    }
  }

  // GET - Get single segment
  if (req.method === 'GET') {
    try {
      const [segment] = await sql`SELECT * FROM segments WHERE id = ${id}`;
      if (!segment) return res.status(404).json({ error: 'Segment not found' });
      return res.status(200).json({ segment });
    } catch (error) {
      console.error('Error fetching segment:', error);
      return res.status(500).json({ error: 'Failed to fetch segment' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
