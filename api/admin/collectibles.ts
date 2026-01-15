import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../lib/db.js';
import {
  generateWorldSticker,
  generateUniversalSticker,
  saveSticker,
  getCollectibles,
} from '../../lib/collectibles.js';

// GET /api/admin/collectibles - List all collectibles
// POST /api/admin/collectibles - Create or generate collectibles
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();

  if (req.method === 'GET') {
    try {
      const { type, worldId, rarity } = req.query;

      const collectibles = await getCollectibles({
        type: type as 'sticker' | 'accessory' | undefined,
        worldId: worldId as string | undefined,
        rarity: rarity as string | undefined,
      });

      // Convert snake_case to camelCase for frontend
      const formatted = collectibles.map(c => ({
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
      }));

      return res.status(200).json({ collectibles: formatted });
    } catch (error) {
      console.error('Error fetching collectibles:', error);
      return res.status(500).json({ error: 'Failed to fetch collectibles' });
    }
  }

  if (req.method === 'POST') {
    const { action, worldId, worldName, type, name, displayName, description, imageUrl, rarity, petId } = req.body;

    // Generate sticker with AI
    if (action === 'generate') {
      try {
        let sticker;

        if (worldId && worldName) {
          sticker = await generateWorldSticker(worldId, worldName);
          sticker = { ...sticker, worldId };
        } else {
          sticker = await generateUniversalSticker();
        }

        // Save to database
        const saved = await saveSticker({
          name: sticker.name,
          displayName: sticker.displayName,
          description: sticker.description,
          imageUrl: sticker.imageUrl,
          worldId: (sticker as { worldId?: string }).worldId || null,
          rarity: 'uncommon',
        });

        return res.status(200).json({
          collectible: {
            id: saved.id,
            type: saved.type,
            name: saved.name,
            displayName: saved.display_name,
            description: saved.description,
            imageUrl: saved.image_url,
            rarity: saved.rarity,
            worldId: saved.world_id,
            isPublished: saved.is_published,
            createdAt: saved.created_at,
          },
        });
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

        for (let i = 0; i < count; i++) {
          let sticker;

          if (worldId && worldName) {
            sticker = await generateWorldSticker(worldId, worldName);
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

          results.push({
            id: saved.id,
            type: saved.type,
            name: saved.name,
            displayName: saved.display_name,
            description: saved.description,
            imageUrl: saved.image_url,
            rarity: saved.rarity,
            worldId: saved.world_id,
          });
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

      return res.status(201).json({
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
      console.error('Error creating collectible:', error);
      return res.status(500).json({ error: 'Failed to create collectible' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
