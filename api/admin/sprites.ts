import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../lib/db.js';

interface CharacterSpriteRow {
  id: string;
  owner_type: string;
  owner_id: string;
  pose_key: string;
  sprite_url: string;
  generation_status: string;
  generated_at: string | null;
  created_at: string;
}

interface PoseDefinitionRow {
  id: string;
  character_type: string;
  pose_key: string;
  display_name: string;
  generation_prompt: string;
}

// GET /api/admin/sprites - List sprites for a character
// POST /api/admin/sprites - Generate sprites for a character
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();

  if (req.method === 'GET') {
    const { ownerType, ownerId } = req.query;

    if (!ownerType || !ownerId) {
      return res.status(400).json({ error: 'Missing required parameters: ownerType, ownerId' });
    }

    try {
      // Get existing sprites for this character
      const sprites = await sql<CharacterSpriteRow[]>`
        SELECT * FROM character_sprites
        WHERE owner_type = ${ownerType} AND owner_id = ${ownerId}::uuid
        ORDER BY pose_key
      `;

      // Get all active pose definitions for this character type
      const poses = await sql<PoseDefinitionRow[]>`
        SELECT * FROM pose_definitions
        WHERE character_type = ${ownerType} AND is_active = true
        ORDER BY sort_order
      `;

      // Build response with sprite status for each pose
      const spriteMap = new Map(sprites.map((s) => [s.pose_key, s]));
      const spritesWithStatus = poses.map((pose) => {
        const sprite = spriteMap.get(pose.pose_key);
        return {
          poseKey: pose.pose_key,
          displayName: pose.display_name,
          generationPrompt: pose.generation_prompt,
          spriteUrl: sprite?.sprite_url || null,
          generationStatus: sprite?.generation_status || 'not_started',
          generatedAt: sprite?.generated_at || null,
        };
      });

      return res.status(200).json({ sprites: spritesWithStatus });
    } catch (error) {
      console.error('Error fetching sprites:', error);
      return res.status(500).json({ error: 'Failed to fetch sprites' });
    }
  }

  if (req.method === 'POST') {
    const { action, ownerType, ownerId, poseKey, sourceAvatarUrl } = req.body;

    // Generate a single sprite
    if (action === 'generate') {
      if (!ownerType || !ownerId || !poseKey || !sourceAvatarUrl) {
        return res.status(400).json({
          error: 'Missing required fields: ownerType, ownerId, poseKey, sourceAvatarUrl',
        });
      }

      try {
        // Get the pose definition for the prompt
        const [pose] = await sql<PoseDefinitionRow[]>`
          SELECT * FROM pose_definitions
          WHERE character_type = ${ownerType} AND pose_key = ${poseKey} AND is_active = true
        `;

        if (!pose) {
          return res.status(404).json({ error: 'Pose definition not found' });
        }

        // Mark as generating
        await sql`
          INSERT INTO character_sprites (owner_type, owner_id, pose_key, sprite_url, generation_status)
          VALUES (${ownerType}, ${ownerId}::uuid, ${poseKey}, '', 'generating')
          ON CONFLICT (owner_type, owner_id, pose_key)
          DO UPDATE SET generation_status = 'generating'
        `;

        // Call the sprite generation API
        const generateUrl = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/generate`;
        const generateRes = await fetch(generateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'sprite',
            ownerType,
            ownerId,
            poseKey,
            sourceAvatarUrl,
            posePrompt: pose.generation_prompt,
          }),
        });

        if (!generateRes.ok) {
          const errorText = await generateRes.text();
          console.error('Sprite generation failed:', errorText);

          // Mark as failed
          await sql`
            UPDATE character_sprites
            SET generation_status = 'failed'
            WHERE owner_type = ${ownerType} AND owner_id = ${ownerId}::uuid AND pose_key = ${poseKey}
          `;

          return res.status(500).json({ error: `Sprite generation failed: ${errorText}` });
        }

        const result = await generateRes.json();

        // Update with generated sprite URL
        await sql`
          UPDATE character_sprites
          SET
            sprite_url = ${result.spriteUrl},
            generation_status = 'complete',
            generated_at = NOW()
          WHERE owner_type = ${ownerType} AND owner_id = ${ownerId}::uuid AND pose_key = ${poseKey}
        `;

        return res.status(200).json({
          sprite: {
            ownerType,
            ownerId,
            poseKey,
            spriteUrl: result.spriteUrl,
            generationStatus: 'complete',
          },
        });
      } catch (error) {
        console.error('Error generating sprite:', error);
        return res.status(500).json({ error: 'Failed to generate sprite' });
      }
    }

    // Generate all sprites for a character
    if (action === 'generateAll') {
      if (!ownerType || !ownerId || !sourceAvatarUrl) {
        return res.status(400).json({
          error: 'Missing required fields: ownerType, ownerId, sourceAvatarUrl',
        });
      }

      try {
        // Get all active pose definitions
        const poses = await sql<PoseDefinitionRow[]>`
          SELECT * FROM pose_definitions
          WHERE character_type = ${ownerType} AND is_active = true
          ORDER BY sort_order
        `;

        if (poses.length === 0) {
          return res.status(404).json({ error: 'No pose definitions found' });
        }

        const results = [];
        const generateUrl = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/generate`;

        for (const pose of poses) {
          // Mark as generating
          await sql`
            INSERT INTO character_sprites (owner_type, owner_id, pose_key, sprite_url, generation_status)
            VALUES (${ownerType}, ${ownerId}::uuid, ${pose.pose_key}, '', 'generating')
            ON CONFLICT (owner_type, owner_id, pose_key)
            DO UPDATE SET generation_status = 'generating'
          `;

          try {
            const generateRes = await fetch(generateUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'sprite',
                ownerType,
                ownerId,
                poseKey: pose.pose_key,
                sourceAvatarUrl,
                posePrompt: pose.generation_prompt,
              }),
            });

            if (generateRes.ok) {
              const result = await generateRes.json();

              await sql`
                UPDATE character_sprites
                SET
                  sprite_url = ${result.spriteUrl},
                  generation_status = 'complete',
                  generated_at = NOW()
                WHERE owner_type = ${ownerType} AND owner_id = ${ownerId}::uuid AND pose_key = ${pose.pose_key}
              `;

              results.push({
                poseKey: pose.pose_key,
                spriteUrl: result.spriteUrl,
                status: 'complete',
              });
            } else {
              await sql`
                UPDATE character_sprites
                SET generation_status = 'failed'
                WHERE owner_type = ${ownerType} AND owner_id = ${ownerId}::uuid AND pose_key = ${pose.pose_key}
              `;

              results.push({
                poseKey: pose.pose_key,
                spriteUrl: null,
                status: 'failed',
              });
            }
          } catch (err) {
            console.error(`Error generating sprite for pose ${pose.pose_key}:`, err);
            results.push({
              poseKey: pose.pose_key,
              spriteUrl: null,
              status: 'failed',
            });
          }
        }

        return res.status(200).json({ results });
      } catch (error) {
        console.error('Error generating all sprites:', error);
        return res.status(500).json({ error: 'Failed to generate sprites' });
      }
    }

    return res.status(400).json({ error: 'Invalid action. Use "generate" or "generateAll"' });
  }

  if (req.method === 'DELETE') {
    const { ownerType, ownerId, poseKey } = req.query;

    if (!ownerType || !ownerId) {
      return res.status(400).json({ error: 'Missing required parameters: ownerType, ownerId' });
    }

    try {
      if (poseKey) {
        // Delete single sprite
        await sql`
          DELETE FROM character_sprites
          WHERE owner_type = ${ownerType} AND owner_id = ${ownerId}::uuid AND pose_key = ${poseKey}
        `;
      } else {
        // Delete all sprites for character
        await sql`
          DELETE FROM character_sprites
          WHERE owner_type = ${ownerType} AND owner_id = ${ownerId}::uuid
        `;
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting sprites:', error);
      return res.status(500).json({ error: 'Failed to delete sprites' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
