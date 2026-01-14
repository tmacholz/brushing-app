import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../lib/db';

// GET /api/admin/worlds - List all worlds
// POST /api/admin/worlds - Create a new world
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();

  if (req.method === 'GET') {
    try {
      const worlds = await sql`
        SELECT
          w.*,
          COUNT(s.id)::int as story_count
        FROM worlds w
        LEFT JOIN stories s ON s.world_id = w.id
        GROUP BY w.id
        ORDER BY w.created_at DESC
      `;

      return res.status(200).json({ worlds });
    } catch (error) {
      console.error('Error fetching worlds:', error);
      return res.status(500).json({ error: 'Failed to fetch worlds' });
    }
  }

  if (req.method === 'POST') {
    const { name, displayName, description, theme, unlockCost, isStarter } = req.body;

    if (!name || !displayName || !description) {
      return res.status(400).json({ error: 'Missing required fields: name, displayName, description' });
    }

    try {
      const [world] = await sql`
        INSERT INTO worlds (name, display_name, description, theme, unlock_cost, is_starter)
        VALUES (${name}, ${displayName}, ${description}, ${theme || null}, ${unlockCost || 0}, ${isStarter || false})
        RETURNING *
      `;

      return res.status(201).json({ world });
    } catch (error) {
      console.error('Error creating world:', error);
      return res.status(500).json({ error: 'Failed to create world' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
