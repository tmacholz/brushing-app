import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../../../lib/db';
import { generateStoryPitches } from '../../../../lib/ai';

// POST /api/admin/worlds/[id]/stories/pitches - Generate story pitch suggestions
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getDb();
  const { id } = req.query;
  const { count = 3 } = req.body;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid world ID' });
  }

  try {
    // Get the world
    const [world] = await sql`
      SELECT * FROM worlds WHERE id = ${id}
    `;

    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }

    // Generate pitches
    const pitches = await generateStoryPitches(
      world.display_name,
      world.description,
      Math.min(count, 5)
    );

    // Save pitches to database
    const savedPitches = [];
    for (const pitch of pitches) {
      const [saved] = await sql`
        INSERT INTO story_pitches (world_id, title, description, outline)
        VALUES (${id}, ${pitch.title}, ${pitch.description}, ${JSON.stringify(pitch.outline)})
        RETURNING *
      `;
      savedPitches.push(saved);
    }

    return res.status(200).json({ pitches: savedPitches });
  } catch (error) {
    console.error('Error generating pitches:', error);
    return res.status(500).json({ error: 'Failed to generate story pitches' });
  }
}
