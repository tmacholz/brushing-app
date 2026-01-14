import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../../lib/db';

// GET /api/admin/worlds/[id] - Get single world with stories
// PUT /api/admin/worlds/[id] - Update world
// DELETE /api/admin/worlds/[id] - Delete world
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid world ID' });
  }

  if (req.method === 'GET') {
    try {
      const [world] = await sql`
        SELECT * FROM worlds WHERE id = ${id}
      `;

      if (!world) {
        return res.status(404).json({ error: 'World not found' });
      }

      const stories = await sql`
        SELECT * FROM stories WHERE world_id = ${id} ORDER BY created_at DESC
      `;

      return res.status(200).json({ world, stories });
    } catch (error) {
      console.error('Error fetching world:', error);
      return res.status(500).json({ error: 'Failed to fetch world' });
    }
  }

  if (req.method === 'PUT') {
    const { name, displayName, description, theme, unlockCost, isStarter, isPublished } = req.body;

    try {
      const [world] = await sql`
        UPDATE worlds
        SET
          name = COALESCE(${name}, name),
          display_name = COALESCE(${displayName}, display_name),
          description = COALESCE(${description}, description),
          theme = COALESCE(${theme}, theme),
          unlock_cost = COALESCE(${unlockCost}, unlock_cost),
          is_starter = COALESCE(${isStarter}, is_starter),
          is_published = COALESCE(${isPublished}, is_published)
        WHERE id = ${id}
        RETURNING *
      `;

      if (!world) {
        return res.status(404).json({ error: 'World not found' });
      }

      return res.status(200).json({ world });
    } catch (error) {
      console.error('Error updating world:', error);
      return res.status(500).json({ error: 'Failed to update world' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const [world] = await sql`
        DELETE FROM worlds WHERE id = ${id} RETURNING id
      `;

      if (!world) {
        return res.status(404).json({ error: 'World not found' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting world:', error);
      return res.status(500).json({ error: 'Failed to delete world' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
