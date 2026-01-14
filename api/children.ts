import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { getDb } from '../lib/db.js';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = '0z8S749Xe6jLCD34QXl1';

// Helper to convert snake_case DB row to camelCase
function toChild(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    characterId: row.character_id,
    activePetId: row.active_pet_id,
    activeBrushId: row.active_brush_id,
    activeWorldId: row.active_world_id,
    points: row.points,
    totalBrushSessions: row.total_brush_sessions,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    unlockedPets: row.unlocked_pets,
    unlockedBrushes: row.unlocked_brushes,
    unlockedWorlds: row.unlocked_worlds,
    currentStoryArc: row.current_story_arc,
    completedStoryArcs: row.completed_story_arcs,
    lastBrushDate: row.last_brush_date,
    nameAudioUrl: row.name_audio_url,
    createdAt: row.created_at,
  };
}

// Generate TTS audio for a name
async function generateNameAudio(name: string, childId: string): Promise<string | null> {
  if (!ELEVENLABS_API_KEY) {
    console.warn('[Children API] ELEVENLABS_API_KEY not configured, skipping audio generation');
    return null;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn('[Children API] BLOB_READ_WRITE_TOKEN not configured, skipping audio generation');
    return null;
  }

  try {
    console.log('[Children API] Generating name audio for:', name);

    const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${DEFAULT_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: name,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Children API] ElevenLabs API error:', error);
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    const storagePath = `name-audio/children/${childId}.mp3`;

    const blob = await put(storagePath, Buffer.from(audioBuffer), {
      access: 'public',
      contentType: 'audio/mpeg',
      allowOverwrite: true,
    });

    console.log('[Children API] Audio uploaded:', blob.url);
    return blob.url;
  } catch (error) {
    console.error('[Children API] Error generating name audio:', error);
    return null;
  }
}

// GET /api/children - List all children
// POST /api/children - Create a new child (with name audio generation)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();

  // GET - List all children
  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT * FROM children ORDER BY created_at DESC
      `;
      const children = rows.map(toChild);
      return res.status(200).json({ children });
    } catch (error) {
      console.error('[Children API] Error fetching children:', error);
      return res.status(500).json({ error: 'Failed to fetch children' });
    }
  }

  // POST - Create a new child
  if (req.method === 'POST') {
    const {
      name,
      age,
      characterId = 'boy',
      activePetId = 'sparkle',
      activeBrushId = 'star-swirl',
      activeWorldId = 'magical-forest',
      // Support for migration - allow passing existing data
      id,
      points = 0,
      totalBrushSessions = 0,
      currentStreak = 0,
      longestStreak = 0,
      unlockedPets = ['sparkle', 'bubbles'],
      unlockedBrushes = ['star-swirl'],
      unlockedWorlds = ['magical-forest', 'space-station'],
      currentStoryArc = null,
      completedStoryArcs = [],
      lastBrushDate = null,
      nameAudioUrl = null,
    } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.length > 50) {
      return res.status(400).json({ error: 'Name is required and must be 50 characters or less' });
    }

    if (!age || typeof age !== 'number' || age < 4 || age > 10) {
      return res.status(400).json({ error: 'Age is required and must be between 4 and 10' });
    }

    try {
      // Insert the child
      const [row] = await sql`
        INSERT INTO children (
          ${id ? sql`id,` : sql``}
          name, age, character_id,
          active_pet_id, active_brush_id, active_world_id,
          points, total_brush_sessions, current_streak, longest_streak,
          unlocked_pets, unlocked_brushes, unlocked_worlds,
          current_story_arc, completed_story_arcs,
          last_brush_date, name_audio_url
        ) VALUES (
          ${id ? sql`${id},` : sql``}
          ${name}, ${age}, ${characterId},
          ${activePetId}, ${activeBrushId}, ${activeWorldId},
          ${points}, ${totalBrushSessions}, ${currentStreak}, ${longestStreak},
          ${unlockedPets}, ${unlockedBrushes}, ${unlockedWorlds},
          ${currentStoryArc ? JSON.stringify(currentStoryArc) : null}, ${completedStoryArcs},
          ${lastBrushDate}, ${nameAudioUrl}
        )
        RETURNING *
      `;

      const child = toChild(row);

      // Generate name audio if not provided (for new profiles, not migrations)
      if (!nameAudioUrl) {
        const audioUrl = await generateNameAudio(name, child.id as string);
        if (audioUrl) {
          await sql`
            UPDATE children SET name_audio_url = ${audioUrl} WHERE id = ${child.id}
          `;
          child.nameAudioUrl = audioUrl;
        }
      }

      console.log('[Children API] Created child:', child.id, child.name);
      return res.status(201).json({ child });
    } catch (error) {
      console.error('[Children API] Error creating child:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: 'Failed to create child', details: message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
