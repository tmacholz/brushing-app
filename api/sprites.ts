import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

interface CharacterSpriteRow {
  id: string;
  owner_type: string;
  owner_id: string;
  pose_key: string;
  sprite_url: string;
  generation_status: string;
  generated_at: string | null;
}

/**
 * API endpoint for fetching character sprites
 * GET /api/sprites?ownerType=child&ownerId=123
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ownerType, ownerId } = req.query;

    if (!ownerType || !ownerId) {
      return res.status(400).json({ error: 'Missing required parameters: ownerType, ownerId' });
    }

    // Validate ownerType
    if (ownerType !== 'child' && ownerType !== 'pet') {
      return res.status(400).json({ error: 'ownerType must be "child" or "pet"' });
    }

    // Fetch sprites from database
    const result = await sql<CharacterSpriteRow>`
      SELECT
        id,
        owner_type,
        owner_id,
        pose_key,
        sprite_url,
        generation_status,
        generated_at
      FROM character_sprites
      WHERE owner_type = ${ownerType} AND owner_id = ${ownerId}::uuid
      ORDER BY pose_key
    `;

    // Transform to camelCase
    const sprites = result.rows.map((row) => ({
      id: row.id,
      ownerType: row.owner_type,
      ownerId: row.owner_id,
      poseKey: row.pose_key,
      spriteUrl: row.sprite_url,
      generationStatus: row.generation_status,
      generatedAt: row.generated_at,
    }));

    return res.status(200).json({ sprites });
  } catch (error) {
    console.error('Failed to fetch sprites:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch sprites',
    });
  }
}
