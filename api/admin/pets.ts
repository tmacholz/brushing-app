import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../lib/db.js';
import { generatePetSuggestions } from '../../lib/ai.js';

// GET /api/admin/pets - List all pets and pending suggestions
// POST /api/admin/pets - Create pet manually or generate suggestions
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();

  if (req.method === 'GET') {
    const { audio } = req.query;

    // Get all pet audio URLs
    if (audio === 'true') {
      try {
        const rows = await sql`SELECT pet_id, audio_url FROM pet_name_audio`;
        const petAudio: Record<string, string> = {};
        rows.forEach((row) => {
          petAudio[row.pet_id] = row.audio_url;
        });
        return res.status(200).json({ petAudio });
      } catch (error) {
        console.error('Error fetching pet audio:', error);
        return res.status(500).json({ error: 'Failed to fetch pet audio' });
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

  if (req.method === 'POST') {
    const { action, name, displayName, description, storyPersonality, unlockCost, isStarter, count, petId, audioUrl } = req.body;

    // Save pet audio URL
    if (action === 'saveAudio') {
      if (!petId || !audioUrl) {
        return res.status(400).json({ error: 'Missing petId or audioUrl' });
      }
      try {
        await sql`
          INSERT INTO pet_name_audio (pet_id, audio_url)
          VALUES (${petId}, ${audioUrl})
          ON CONFLICT (pet_id)
          DO UPDATE SET audio_url = EXCLUDED.audio_url, created_at = NOW()
        `;
        return res.status(200).json({ success: true, petId, audioUrl });
      } catch (error) {
        console.error('Error saving pet audio:', error);
        return res.status(500).json({ error: 'Failed to save pet audio' });
      }
    }

    // Generate pet suggestions with AI
    if (action === 'generate') {
      try {
        // Get existing pets to ensure uniqueness
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

        // Save suggestions to database
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
