import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../lib/db.js';
import { generatePetSuggestions } from '../../lib/ai.js';

// Unified pets API:
// GET /api/admin/pets - List all pets and pending suggestions
// GET /api/admin/pets?id=xxx - Get single pet
// POST /api/admin/pets - Create pet manually or generate suggestions
// POST /api/admin/pets?id=xxx - Approve or reject suggestion
// PUT /api/admin/pets?id=xxx - Update pet
// DELETE /api/admin/pets?id=xxx - Delete pet
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  const { id } = req.query;

  // ===== SINGLE PET OPERATIONS (when ?id=xxx is provided) =====
  if (typeof id === 'string') {
    // GET single pet
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

    // PUT - Update pet
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

    // DELETE pet
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

    // POST with id - Approve or reject suggestion
    if (req.method === 'POST') {
      const { action } = req.body;

      if (action === 'approve') {
        try {
          const [suggestion] = await sql`SELECT * FROM pet_suggestions WHERE id = ${id}`;
          if (!suggestion) {
            return res.status(404).json({ error: 'Suggestion not found' });
          }
          const [pet] = await sql`
            INSERT INTO pets (name, display_name, description, story_personality, unlock_cost, is_starter)
            VALUES (${suggestion.name}, ${suggestion.display_name}, ${suggestion.description}, ${suggestion.story_personality}, ${suggestion.unlock_cost}, ${suggestion.is_starter})
            RETURNING *
          `;
          await sql`UPDATE pet_suggestions SET is_approved = true WHERE id = ${id}`;
          return res.status(201).json({ pet });
        } catch (error) {
          console.error('Error approving suggestion:', error);
          return res.status(500).json({ error: 'Failed to approve suggestion' });
        }
      }

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

  // ===== COLLECTION OPERATIONS (no id provided) =====

  // GET - List all pets
  if (req.method === 'GET') {
    const { audio } = req.query;

    // Get all pet audio URLs (both regular and possessive forms)
    if (audio === 'true') {
      try {
        const rows = await sql`SELECT pet_id, audio_url, possessive_audio_url FROM pet_name_audio`;
        const petAudio: Record<string, string> = {};
        const petAudioPossessive: Record<string, string> = {};
        rows.forEach((row) => {
          petAudio[row.pet_id] = row.audio_url;
          if (row.possessive_audio_url) {
            petAudioPossessive[row.pet_id] = row.possessive_audio_url;
          }
        });
        return res.status(200).json({ petAudio, petAudioPossessive });
      } catch (error) {
        console.error('Error fetching pet audio (table may not exist):', error);
        return res.status(200).json({ petAudio: {}, petAudioPossessive: {} });
      }
    }

    // Default: Get all pets and suggestions
    try {
      const [pets, suggestions] = await Promise.all([
        sql`
          SELECT * FROM pets
          ORDER BY is_starter DESC, unlock_cost ASC, created_at DESC
        `,
        sql`
          SELECT * FROM pet_suggestions
          WHERE is_approved = false
          ORDER BY created_at DESC
        `
      ]);
      return res.status(200).json({ pets, suggestions });
    } catch (error) {
      console.error('Error fetching pets:', error);
      return res.status(500).json({ error: 'Failed to fetch pets' });
    }
  }

  // POST - Create pet or generate suggestions
  if (req.method === 'POST') {
    const { action, name, displayName, description, storyPersonality, unlockCost, isStarter, count, petId, audioUrl, possessiveAudioUrl } = req.body;

    // Save pet audio URLs (both regular and possessive forms)
    if (action === 'saveAudio') {
      if (!petId || !audioUrl) {
        return res.status(400).json({ error: 'Missing petId or audioUrl' });
      }
      try {
        await sql`
          INSERT INTO pet_name_audio (pet_id, audio_url, possessive_audio_url)
          VALUES (${petId}, ${audioUrl}, ${possessiveAudioUrl})
          ON CONFLICT (pet_id)
          DO UPDATE SET
            audio_url = EXCLUDED.audio_url,
            possessive_audio_url = COALESCE(EXCLUDED.possessive_audio_url, pet_name_audio.possessive_audio_url),
            created_at = NOW()
        `;
        return res.status(200).json({ success: true, petId, audioUrl, possessiveAudioUrl });
      } catch (error) {
        console.error('Error saving pet audio:', error);
        return res.status(500).json({ error: 'Failed to save pet audio' });
      }
    }

    // Generate pet suggestions with AI
    if (action === 'generate') {
      try {
        const existingPets = await sql`
          SELECT name, display_name as "displayName", description, story_personality as "storyPersonality"
          FROM pets
        `;
        const existingFromStatic = [
          { name: 'sparkle', displayName: 'Sparkle', description: 'A cheerful star who fell from the sky', storyPersonality: 'brave and optimistic' },
          { name: 'bubbles', displayName: 'Bubbles', description: 'A giggly fish who learned to float in air', storyPersonality: 'silly and curious' },
          { name: 'cosmo', displayName: 'Cosmo', description: 'A mini robot from the future', storyPersonality: 'smart and helpful' },
          { name: 'fern', displayName: 'Fern', description: 'A tiny forest dragon', storyPersonality: 'shy but fierce' },
          { name: 'captain-whiskers', displayName: 'Captain Whiskers', description: 'A cat who dreams of sailing', storyPersonality: 'dramatic and bold' },
        ];

        const allExistingPets = [...existingFromStatic, ...existingPets as typeof existingFromStatic];
        const suggestions = await generatePetSuggestions(allExistingPets, count || 3);

        const savedSuggestions = [];
        for (const suggestion of suggestions) {
          const [saved] = await sql`
            INSERT INTO pet_suggestions (name, display_name, description, story_personality, unlock_cost, is_starter)
            VALUES (${suggestion.name}, ${suggestion.displayName}, ${suggestion.description}, ${suggestion.storyPersonality}, ${suggestion.unlockCost}, ${suggestion.isStarter})
            RETURNING *
          `;
          savedSuggestions.push(saved);
        }

        return res.status(200).json({ suggestions: savedSuggestions });
      } catch (error) {
        console.error('Error generating pet suggestions:', error);
        return res.status(500).json({ error: 'Failed to generate pet suggestions' });
      }
    }

    // Create pet manually
    if (!name || !displayName || !description || !storyPersonality) {
      return res.status(400).json({ error: 'Missing required fields: name, displayName, description, storyPersonality' });
    }

    try {
      const [pet] = await sql`
        INSERT INTO pets (name, display_name, description, story_personality, unlock_cost, is_starter)
        VALUES (${name}, ${displayName}, ${description}, ${storyPersonality}, ${unlockCost || 0}, ${isStarter || false})
        RETURNING *
      `;
      return res.status(201).json({ pet });
    } catch (error) {
      console.error('Error creating pet:', error);
      return res.status(500).json({ error: 'Failed to create pet' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
