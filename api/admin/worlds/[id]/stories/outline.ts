import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../../../lib/db';
import { generateOutlineFromIdea } from '../../../../lib/ai';

// POST /api/admin/worlds/[id]/stories/outline - Generate outline from user idea
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getDb();
  const { id } = req.query;
  const { idea } = req.body;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid world ID' });
  }

  if (!idea || typeof idea !== 'string') {
    return res.status(400).json({ error: 'Missing required field: idea' });
  }

  try {
    // Get the world
    const [world] = await sql`
      SELECT * FROM worlds WHERE id = ${id}
    `;

    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }

    // Generate outline from idea
    const pitch = await generateOutlineFromIdea(
      world.display_name,
      world.description,
      idea
    );

    // Save as a pitch
    const [saved] = await sql`
      INSERT INTO story_pitches (world_id, title, description, outline)
      VALUES (${id}, ${pitch.title}, ${pitch.description}, ${JSON.stringify(pitch.outline)})
      RETURNING *
    `;

    return res.status(200).json({ pitch: saved });
  } catch (error) {
    console.error('Error generating outline:', error);
    return res.status(500).json({ error: 'Failed to generate story outline' });
  }
}
