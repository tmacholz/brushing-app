import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../../lib/db.js';

// GET /api/admin/collectibles/[id] - Get single collectible
// PUT /api/admin/collectibles/[id] - Update collectible
// DELETE /api/admin/collectibles/[id] - Delete collectible
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing collectible ID' });
  }

  if (req.method === 'GET') {
    try {
      const [collectible] = await sql`SELECT * FROM collectibles WHERE id = ${id}`;

      if (!collectible) {
        return res.status(404).json({ error: 'Collectible not found' });
      }

      return res.status(200).json({
        collectible: {
          id: collectible.id,
          type: collectible.type,
          name: collectible.name,
          displayName: collectible.display_name,
          description: collectible.description,
          imageUrl: collectible.image_url,
          rarity: collectible.rarity,
          worldId: collectible.world_id,
          petId: collectible.pet_id,
          isPublished: collectible.is_published,
          createdAt: collectible.created_at,
        },
      });
    } catch (error) {
      console.error('Error fetching collectible:', error);
      return res.status(500).json({ error: 'Failed to fetch collectible' });
    }
  }

  if (req.method === 'PUT') {
    const { displayName, description, rarity, worldId, petId, isPublished } = req.body;

    try {
      const [collectible] = await sql`
        UPDATE collectibles
        SET
          display_name = COALESCE(${displayName}, display_name),
          description = COALESCE(${description}, description),
          rarity = COALESCE(${rarity}, rarity),
          world_id = ${worldId ?? null},
          pet_id = ${petId ?? null},
          is_published = COALESCE(${isPublished}, is_published)
        WHERE id = ${id}
        RETURNING *
      `;

      if (!collectible) {
        return res.status(404).json({ error: 'Collectible not found' });
      }

      return res.status(200).json({
        collectible: {
          id: collectible.id,
          type: collectible.type,
          name: collectible.name,
          displayName: collectible.display_name,
          description: collectible.description,
          imageUrl: collectible.image_url,
          rarity: collectible.rarity,
          worldId: collectible.world_id,
          petId: collectible.pet_id,
          isPublished: collectible.is_published,
          createdAt: collectible.created_at,
        },
      });
    } catch (error) {
      console.error('Error updating collectible:', error);
      return res.status(500).json({ error: 'Failed to update collectible' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const [deleted] = await sql`DELETE FROM collectibles WHERE id = ${id} RETURNING id`;

      if (!deleted) {
        return res.status(404).json({ error: 'Collectible not found' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting collectible:', error);
      return res.status(500).json({ error: 'Failed to delete collectible' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
