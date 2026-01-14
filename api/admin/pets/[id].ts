import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../../lib/db.js';

// GET /api/admin/pets/[id] - Get pet details
// PUT /api/admin/pets/[id] - Update pet
// DELETE /api/admin/pets/[id] - Delete pet
// POST /api/admin/pets/[id] - Approve or reject suggestion
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid pet ID' });
  }

  if (req.method === 'GET') {
    try {
      const [pet] = await sql`SELECT * FROM pets WHERE id = ${id}`;
      if (!pet) {
        return res.status(404).json({ error: 'Pet not found' });
      }
      return res.status(200).json({ pet });
    } catch (error) {
      console.error('Error fetching pet:', error);
      return res.status(500).json({ error: 'Failed to fetch pet' });
    }
  }

  if (req.method === 'PUT') {
    const { displayName, description, storyPersonality, unlockCost, isStarter, isPublished, imageUrl, avatarUrl } = req.body;

    try {
      const [pet] = await sql`
        UPDATE pets SET
          display_name = COALESCE(${displayName}, display_name),
          description = COALESCE(${description}, description),
          story_personality = COALESCE(${storyPersonality}, story_personality),
          unlock_cost = COALESCE(${unlockCost}, unlock_cost),
          is_starter = COALESCE(${isStarter}, is_starter),
          is_published = COALESCE(${isPublished}, is_published),
          image_url = COALESCE(${imageUrl}, image_url),
          avatar_url = COALESCE(${avatarUrl}, avatar_url)
        WHERE id = ${id}
        RETURNING *
      `;

      if (!pet) {
        return res.status(404).json({ error: 'Pet not found' });
      }

      return res.status(200).json({ pet });
    } catch (error) {
      console.error('Error updating pet:', error);
      return res.status(500).json({ error: 'Failed to update pet' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await sql`DELETE FROM pets WHERE id = ${id} RETURNING id`;
      if (result.length === 0) {
        return res.status(404).json({ error: 'Pet not found' });
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting pet:', error);
      return res.status(500).json({ error: 'Failed to delete pet' });
    }
  }

  if (req.method === 'POST') {
    const { action } = req.body;

    // Approve suggestion - creates a new pet from the suggestion
    if (action === 'approve') {
      try {
        // Get the suggestion
        const [suggestion] = await sql`SELECT * FROM pet_suggestions WHERE id = ${id}`;
        if (!suggestion) {
          return res.status(404).json({ error: 'Suggestion not found' });
        }

        // Create the pet from suggestion
        const [pet] = await sql`
          INSERT INTO pets (name, display_name, description, story_personality, unlock_cost, is_starter)
          VALUES (${suggestion.name}, ${suggestion.display_name}, ${suggestion.description}, ${suggestion.story_personality}, ${suggestion.unlock_cost}, ${suggestion.is_starter})
          RETURNING *
        `;

        // Mark suggestion as approved
        await sql`UPDATE pet_suggestions SET is_approved = true WHERE id = ${id}`;

        return res.status(201).json({ pet });
      } catch (error) {
        console.error('Error approving suggestion:', error);
        return res.status(500).json({ error: 'Failed to approve suggestion' });
      }
    }

    // Reject suggestion - deletes the suggestion
    if (action === 'reject') {
      try {
        const result = await sql`DELETE FROM pet_suggestions WHERE id = ${id} RETURNING id`;
        if (result.length === 0) {
          return res.status(404).json({ error: 'Suggestion not found' });
        }
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error rejecting suggestion:', error);
        return res.status(500).json({ error: 'Failed to reject suggestion' });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
