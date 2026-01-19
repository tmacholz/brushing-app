import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../lib/db.js';
import {
  generateWorldSticker,
  generateUniversalSticker,
  saveSticker,
  getCollectibles,
} from '../../lib/collectibles.js';

// Helper to format collectible for response
function formatCollectible(c: Record<string, unknown>) {
  return {
    id: c.id,
    type: c.type,
    name: c.name,
    displayName: c.display_name,
    description: c.description,
    imageUrl: c.image_url,
    rarity: c.rarity,
    worldId: c.world_id,
    petId: c.pet_id,
    isPublished: c.is_published,
    createdAt: c.created_at,
  };
}

// Unified collectibles API:
// GET /api/admin/collectibles - List all collectibles
// GET /api/admin/collectibles?id=xxx - Get single collectible
// POST /api/admin/collectibles - Create or generate collectibles
// PUT /api/admin/collectibles?id=xxx - Update collectible
// DELETE /api/admin/collectibles?id=xxx - Delete collectible
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  const { id } = req.query;

  // ===== SINGLE COLLECTIBLE OPERATIONS (when ?id=xxx is provided) =====
  if (typeof id === 'string') {
    // GET single collectible
    if (req.method === 'GET') {
      try {
        const [collectible] = await sql`SELECT * FROM collectibles WHERE id = ${id}`;
        if (!collectible) {
          return res.status(404).json({ error: 'Collectible not found' });
        }
        return res.status(200).json({ collectible: formatCollectible(collectible) });
      } catch (error) {
        console.error('Error fetching collectible:', error);
        return res.status(500).json({ error: 'Failed to fetch collectible' });
      }
    }

    // PUT - Update collectible
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
        return res.status(200).json({ collectible: formatCollectible(collectible) });
      } catch (error) {
        console.error('Error updating collectible:', error);
        return res.status(500).json({ error: 'Failed to update collectible' });
      }
    }

    // DELETE collectible
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

  // ===== COLLECTION OPERATIONS (no id provided) =====

  // GET - List all collectibles
  if (req.method === 'GET') {
    try {
      const { type, worldId, rarity } = req.query;

      const collectibles = await getCollectibles({
        type: type as 'sticker' | 'accessory' | undefined,
        worldId: worldId as string | undefined,
        rarity: rarity as string | undefined,
      });

      return res.status(200).json({ collectibles: collectibles.map(formatCollectible) });
    } catch (error) {
      console.error('Error fetching collectibles:', error);
      return res.status(500).json({ error: 'Failed to fetch collectibles' });
    }
  }

  // POST - Create or generate collectibles
  if (req.method === 'POST') {
    const { action, worldId, worldName, type, name, displayName, description, imageUrl, rarity, petId } = req.body;

    // Generate sticker with AI
    if (action === 'generate') {
      try {
        let sticker;
        let worldDescription: string | undefined;

        // Fetch world description if worldId is provided
        if (worldId) {
          const [world] = await sql`SELECT description FROM worlds WHERE id = ${worldId}`;
          worldDescription = world?.description;
        }

        if (worldId && worldName) {
          sticker = await generateWorldSticker(worldId, worldName, worldDescription);
          sticker = { ...sticker, worldId };
        } else {
          sticker = await generateUniversalSticker();
        }

        const saved = await saveSticker({
          name: sticker.name,
          displayName: sticker.displayName,
          description: sticker.description,
          imageUrl: sticker.imageUrl,
          worldId: (sticker as { worldId?: string }).worldId || null,
          rarity: 'uncommon',
        });

        return res.status(200).json({ collectible: formatCollectible(saved) });
      } catch (error) {
        console.error('Error generating sticker:', error);
        return res.status(500).json({ error: 'Failed to generate sticker' });
      }
    }

    // Generate batch of stickers for a world
    if (action === 'generate-batch') {
      const { count = 3 } = req.body;
      try {
        const results = [];
        let worldDescription: string | undefined;

        // Fetch world description once if worldId is provided
        if (worldId) {
          const [world] = await sql`SELECT description FROM worlds WHERE id = ${worldId}`;
          worldDescription = world?.description;
        }

        for (let i = 0; i < count; i++) {
          let sticker;

          if (worldId && worldName) {
            sticker = await generateWorldSticker(worldId, worldName, worldDescription);
            sticker = { ...sticker, worldId };
          } else {
            sticker = await generateUniversalSticker();
          }

          const saved = await saveSticker({
            name: sticker.name,
            displayName: sticker.displayName,
            description: sticker.description,
            imageUrl: sticker.imageUrl,
            worldId: (sticker as { worldId?: string }).worldId || null,
            rarity: 'uncommon',
          });

          results.push(formatCollectible(saved));
        }

        return res.status(200).json({ collectibles: results });
      } catch (error) {
        console.error('Error generating batch:', error);
        return res.status(500).json({ error: 'Failed to generate stickers' });
      }
    }

    // Create collectible manually
    if (!type || !name || !displayName || !imageUrl) {
      return res.status(400).json({ error: 'Missing required fields: type, name, displayName, imageUrl' });
    }

    try {
      const [collectible] = await sql`
        INSERT INTO collectibles (type, name, display_name, description, image_url, rarity, world_id, pet_id, is_published)
        VALUES (${type}, ${name}, ${displayName}, ${description || ''}, ${imageUrl}, ${rarity || 'common'}, ${worldId || null}, ${petId || null}, true)
        RETURNING *
      `;

      return res.status(201).json({ collectible: formatCollectible(collectible) });
    } catch (error) {
      console.error('Error creating collectible:', error);
      return res.status(500).json({ error: 'Failed to create collectible' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
