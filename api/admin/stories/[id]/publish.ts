import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../../lib/db';

// POST /api/admin/stories/[id]/publish - Publish or unpublish a story
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getDb();
  const { id } = req.query;
  const { publish = true } = req.body;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid story ID' });
  }

  try {
    const [story] = await sql`
      UPDATE stories
      SET
        is_published = ${publish},
        status = ${publish ? 'published' : 'draft'}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    return res.status(200).json({ story });
  } catch (error) {
    console.error('Error publishing story:', error);
    return res.status(500).json({ error: 'Failed to publish story' });
  }
}
