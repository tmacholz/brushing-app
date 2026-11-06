import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../lib/db.js';
import { generateWorld } from '../../lib/ai.js';
import { generateWorldImageDirect } from '../../lib/imageGeneration.js';
import { requireAuth } from '../../lib/auth.js';

// Helper to generate world image (calls the shared function directly)
async function generateWorldImage(worldId: string, worldName: string, worldDescription: string, theme?: string): Promise<string | null> {
  try {
    return await generateWorldImageDirect(worldId, worldName, worldDescription, theme);
  } catch (error) {
    console.error('Error generating world image:', error);
    return null;
  }
}

// World image generation can take a while; give the function time to finish
// instead of dropping the work when the response is sent.
export const maxDuration = 60;

// GET /api/admin/worlds - List all worlds
// POST /api/admin/worlds - Create world or generate with AI
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && !requireAuth(req, res, 'admin')) return;
  const sql = getDb();

  if (req.method === 'GET') {
    try {
      const worlds = await sql`
        SELECT w.*, COUNT(s.id)::int as story_count
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
    const { action, name, displayName, description, theme, unlockCost, isStarter } = req.body;

    // Generate world with AI
    if (action === 'generate') {
      try {
        const worldData = await generateWorld();

        // Insert the world first
        const [world] = await sql`
          INSERT INTO worlds (name, display_name, description, theme, unlock_cost, is_starter)
          VALUES (${worldData.name}, ${worldData.displayName}, ${worldData.description}, ${worldData.theme || null}, ${0}, ${false})
          RETURNING *
        `;

        // Generate the world image before responding: a serverless function is
        // frozen once it returns, so fire-and-forget work was usually lost.
        const imageUrl = await generateWorldImage(world.id, worldData.displayName, worldData.description, worldData.theme);
        if (imageUrl) {
          await sql`UPDATE worlds SET background_image_url = ${imageUrl} WHERE id = ${world.id}`;
          world.background_image_url = imageUrl;
        }

        return res.status(200).json({ world });
      } catch (error) {
        console.error('Error generating world:', error);
        return res.status(500).json({ error: 'Failed to generate world' });
      }
    }

    // Create world manually
    if (!name || !displayName || !description) {
      return res.status(400).json({ error: 'Missing required fields: name, displayName, description' });
    }

    try {
      const [world] = await sql`
        INSERT INTO worlds (name, display_name, description, theme, unlock_cost, is_starter)
        VALUES (${name}, ${displayName}, ${description}, ${theme || null}, ${unlockCost || 0}, ${isStarter || false})
        RETURNING *
      `;

      const imageUrl = await generateWorldImage(world.id, displayName, description, theme || undefined);
      if (imageUrl) {
        await sql`UPDATE worlds SET background_image_url = ${imageUrl} WHERE id = ${world.id}`;
        world.background_image_url = imageUrl;
      }

      return res.status(201).json({ world });
    } catch (error) {
      console.error('Error creating world:', error);
      return res.status(500).json({ error: 'Failed to create world' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
