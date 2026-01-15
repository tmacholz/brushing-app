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

// GET /api/admin/poses - List all pose definitions
// POST /api/admin/poses - Create a new pose definition
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();

  if (req.method === 'GET') {
    try {
      const { characterType } = req.query;

      let poses: PoseDefinitionRow[];
      if (characterType && (characterType === 'child' || characterType === 'pet')) {
        poses = await sql<PoseDefinitionRow[]>`
          SELECT * FROM pose_definitions
          WHERE character_type = ${characterType}
          ORDER BY sort_order ASC, created_at ASC
        `;
      } else {
        poses = await sql<PoseDefinitionRow[]>`
          SELECT * FROM pose_definitions
          ORDER BY character_type, sort_order ASC, created_at ASC
        `;
      }

      // Transform to camelCase
      const formattedPoses = poses.map((p) => ({
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
