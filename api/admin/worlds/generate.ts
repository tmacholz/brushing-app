import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateWorld } from '../../lib/ai';

// POST /api/admin/worlds/generate - Generate a random world with AI
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const world = await generateWorld();

    return res.status(200).json({ world });
  } catch (error) {
    console.error('Error generating world:', error);
    return res.status(500).json({ error: 'Failed to generate world' });
  }
}
