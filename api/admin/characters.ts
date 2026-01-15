import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../lib/db.js';

interface PoseDefinitionRow {
  id: string;
  character_type: string;
  pose_key: string;
  display_name: string;
  generation_prompt: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

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

/**
 * Consolidated character overlay API endpoint
 *
 * Poses:
 *   GET    /api/admin/characters?entity=poses[&characterType=child|pet]
 *   POST   /api/admin/characters?entity=poses  (create)
 *   PUT    /api/admin/characters?entity=poses  (update)
 *   DELETE /api/admin/characters?entity=poses&id=xxx
 *
 * Sprites:
 *   GET    /api/admin/characters?entity=sprites&ownerType=x&ownerId=y
 *   POST   /api/admin/characters?entity=sprites  (action: generate | generateAll)
 *   DELETE /api/admin/characters?entity=sprites&ownerType=x&ownerId=y[&poseKey=z]
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  const { entity } = req.query;

  // ==================== POSES ====================
  if (entity === 'poses') {
    if (req.method === 'GET') {
      try {
        const { characterType } = req.query;
        let poses: PoseDefinitionRow[];

        if (characterType && (characterType === 'child' || characterType === 'pet')) {
          poses = await sql`
            SELECT * FROM pose_definitions
            WHERE character_type = ${characterType}
            ORDER BY sort_order ASC, created_at ASC
          `;
        } else {
          poses = await sql`
            SELECT * FROM pose_definitions
            ORDER BY character_type, sort_order ASC, created_at ASC
          `;
        }

        const formattedPoses = poses.map((p: PoseDefinitionRow) => ({
          id: p.id,
          characterType: p.character_type,
          poseKey: p.pose_key,
          displayName: p.display_name,
          generationPrompt: p.generation_prompt,
          sortOrder: p.sort_order,
          isActive: p.is_active,
          createdAt: p.created_at,
        }));

        return res.status(200).json({ poses: formattedPoses });
      } catch (error) {
        console.error('Error fetching poses:', error);
        return res.status(500).json({ error: 'Failed to fetch pose definitions' });
      }
    }

    if (req.method === 'POST') {
      const { characterType, poseKey, displayName, generationPrompt, sortOrder, isActive } = req.body;

      if (!characterType || !poseKey || !displayName || !generationPrompt) {
        return res.status(400).json({
          error: 'Missing required fields: characterType, poseKey, displayName, generationPrompt',
        });
      }

      if (characterType !== 'child' && characterType !== 'pet') {
        return res.status(400).json({ error: 'characterType must be "child" or "pet"' });
      }

      try {
        const [pose] = await sql`
          INSERT INTO pose_definitions (character_type, pose_key, display_name, generation_prompt, sort_order, is_active)
          VALUES (${characterType}, ${poseKey}, ${displayName}, ${generationPrompt}, ${sortOrder || 0}, ${isActive !== false})
          ON CONFLICT (character_type, pose_key)
          DO UPDATE SET
            display_name = EXCLUDED.display_name,
            generation_prompt = EXCLUDED.generation_prompt,
            sort_order = EXCLUDED.sort_order,
            is_active = EXCLUDED.is_active
          RETURNING *
        `;

        return res.status(201).json({
          pose: {
            id: pose.id,
            characterType: pose.character_type,
            poseKey: pose.pose_key,
            displayName: pose.display_name,
            generationPrompt: pose.generation_prompt,
            sortOrder: pose.sort_order,
            isActive: pose.is_active,
          },
        });
      } catch (error) {
        console.error('Error creating pose:', error);
        return res.status(500).json({ error: 'Failed to create pose definition' });
      }
    }

    if (req.method === 'PUT') {
      const { id, displayName, generationPrompt, sortOrder, isActive } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Missing required field: id' });
      }

      try {
        const [pose] = await sql`
          UPDATE pose_definitions
          SET
            display_name = COALESCE(${displayName}, display_name),
            generation_prompt = COALESCE(${generationPrompt}, generation_prompt),
            sort_order = COALESCE(${sortOrder}, sort_order),
            is_active = COALESCE(${isActive}, is_active)
          WHERE id = ${id}
          RETURNING *
        `;

        if (!pose) {
          return res.status(404).json({ error: 'Pose definition not found' });
        }

        return res.status(200).json({
          pose: {
            id: pose.id,
            characterType: pose.character_type,
            poseKey: pose.pose_key,
            displayName: pose.display_name,
            generationPrompt: pose.generation_prompt,
            sortOrder: pose.sort_order,
            isActive: pose.is_active,
          },
        });
      } catch (error) {
        console.error('Error updating pose:', error);
        return res.status(500).json({ error: 'Failed to update pose definition' });
      }
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Missing required parameter: id' });
      }

      try {
        await sql`DELETE FROM pose_definitions WHERE id = ${id}`;
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error deleting pose:', error);
        return res.status(500).json({ error: 'Failed to delete pose definition' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ==================== SPRITES ====================
  if (entity === 'sprites') {
    if (req.method === 'GET') {
      const { ownerType, ownerId } = req.query;

      if (!ownerType || !ownerId) {
        return res.status(400).json({ error: 'Missing required parameters: ownerType, ownerId' });
      }

      try {
        const sprites: CharacterSpriteRow[] = await sql`
          SELECT * FROM character_sprites
          WHERE owner_type = ${ownerType} AND owner_id = ${ownerId}
          ORDER BY pose_key
        `;

        const poses: PoseDefinitionRow[] = await sql`
          SELECT * FROM pose_definitions
          WHERE character_type = ${ownerType} AND is_active = true
          ORDER BY sort_order
        `;

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

      if (action === 'generate') {
        if (!ownerType || !ownerId || !poseKey || !sourceAvatarUrl) {
          return res.status(400).json({
            error: 'Missing required fields: ownerType, ownerId, poseKey, sourceAvatarUrl',
          });
        }

        try {
          const [pose]: PoseDefinitionRow[] = await sql`
            SELECT * FROM pose_definitions
            WHERE character_type = ${ownerType} AND pose_key = ${poseKey} AND is_active = true
          `;

          if (!pose) {
            return res.status(404).json({ error: 'Pose definition not found' });
          }

          await sql`
            INSERT INTO character_sprites (owner_type, owner_id, pose_key, sprite_url, generation_status)
            VALUES (${ownerType}, ${ownerId}, ${poseKey}, '', 'generating')
            ON CONFLICT (owner_type, owner_id, pose_key)
            DO UPDATE SET generation_status = 'generating'
          `;

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

            await sql`
              UPDATE character_sprites
              SET generation_status = 'failed'
              WHERE owner_type = ${ownerType} AND owner_id = ${ownerId} AND pose_key = ${poseKey}
            `;

            return res.status(500).json({ error: `Sprite generation failed: ${errorText}` });
          }

          const result = await generateRes.json();

          await sql`
            UPDATE character_sprites
            SET
              sprite_url = ${result.spriteUrl},
              generation_status = 'complete',
              generated_at = NOW()
            WHERE owner_type = ${ownerType} AND owner_id = ${ownerId} AND pose_key = ${poseKey}
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

      if (action === 'generateAll') {
        if (!ownerType || !ownerId || !sourceAvatarUrl) {
          return res.status(400).json({
            error: 'Missing required fields: ownerType, ownerId, sourceAvatarUrl',
          });
        }

        try {
          const poses: PoseDefinitionRow[] = await sql`
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
            await sql`
              INSERT INTO character_sprites (owner_type, owner_id, pose_key, sprite_url, generation_status)
              VALUES (${ownerType}, ${ownerId}, ${pose.pose_key}, '', 'generating')
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
                  WHERE owner_type = ${ownerType} AND owner_id = ${ownerId} AND pose_key = ${pose.pose_key}
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
                  WHERE owner_type = ${ownerType} AND owner_id = ${ownerId} AND pose_key = ${pose.pose_key}
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
          await sql`
            DELETE FROM character_sprites
            WHERE owner_type = ${ownerType} AND owner_id = ${ownerId} AND pose_key = ${poseKey}
          `;
        } else {
          await sql`
            DELETE FROM character_sprites
            WHERE owner_type = ${ownerType} AND owner_id = ${ownerId}
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

  return res.status(400).json({ error: 'Missing or invalid entity parameter. Use "poses" or "sprites"' });
}
