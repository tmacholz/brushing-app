import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../lib/db.js';
import { generateWorld } from '../../lib/ai.js';

// Helper to generate world image
async function generateWorldImage(worldId: string, worldName: string, worldDescription: string, theme?: string): Promise<string | null> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'worldImage',
        worldId,
        worldName,
        worldDescription,
        theme,
      }),
    });

    if (!response.ok) {
      console.error('Failed to generate world image:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.imageUrl;
  } catch (error) {
    console.error('Error generating world image:', error);
    return null;
  }
}

// GET /api/admin/worlds - List all worlds
// POST /api/admin/worlds - Create world or generate with AI
export default async function handler(req: VercelRequest, res: VercelResponse) {
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

        // Auto-generate world image in the background
        generateWorldImage(world.id, worldData.displayName, worldData.description, worldData.theme).then(async (imageUrl) => {
          if (imageUrl) {
            await sql`UPDATE worlds SET background_image_url = ${imageUrl} WHERE id = ${world.id}`;
          }
        });

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

      // Auto-generate world image in the background
      generateWorldImage(world.id, displayName, description, theme || undefined).then(async (imageUrl) => {
        if (imageUrl) {
          await sql`UPDATE worlds SET background_image_url = ${imageUrl} WHERE id = ${world.id}`;
        }
      });

      return res.status(201).json({ world });
    } catch (error) {
      console.error('Error creating world:', error);
      return res.status(500).json({ error: 'Failed to create world' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
