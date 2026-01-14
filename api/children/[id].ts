import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../lib/db.js';

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

// GET /api/children/[id] - Get a single child
// PUT /api/children/[id] - Update a child
// DELETE /api/children/[id] - Delete a child
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid child ID' });
  }

  // GET - Get a single child
  if (req.method === 'GET') {
    try {
      const [row] = await sql`SELECT * FROM children WHERE id = ${id}`;
      if (!row) {
        return res.status(404).json({ error: 'Child not found' });
      }
      return res.status(200).json({ child: toChild(row) });
    } catch (error) {
      console.error('[Children API] Error fetching child:', error);
      return res.status(500).json({ error: 'Failed to fetch child' });
    }
  }

  // PUT - Update a child
  if (req.method === 'PUT') {
    const {
      name,
      age,
      characterId,
      activePetId,
      activeBrushId,
      activeWorldId,
      points,
      totalBrushSessions,
      currentStreak,
      longestStreak,
      unlockedPets,
      unlockedBrushes,
      unlockedWorlds,
      currentStoryArc,
      completedStoryArcs,
      lastBrushDate,
      nameAudioUrl,
    } = req.body;

    try {
      const [row] = await sql`
        UPDATE children SET
          name = COALESCE(${name}, name),
          age = COALESCE(${age}, age),
          character_id = COALESCE(${characterId}, character_id),
          active_pet_id = COALESCE(${activePetId}, active_pet_id),
          active_brush_id = COALESCE(${activeBrushId}, active_brush_id),
          active_world_id = COALESCE(${activeWorldId}, active_world_id),
          points = COALESCE(${points}, points),
          total_brush_sessions = COALESCE(${totalBrushSessions}, total_brush_sessions),
          current_streak = COALESCE(${currentStreak}, current_streak),
          longest_streak = COALESCE(${longestStreak}, longest_streak),
          unlocked_pets = COALESCE(${unlockedPets}, unlocked_pets),
          unlocked_brushes = COALESCE(${unlockedBrushes}, unlocked_brushes),
          unlocked_worlds = COALESCE(${unlockedWorlds}, unlocked_worlds),
          current_story_arc = ${currentStoryArc !== undefined ? (currentStoryArc ? JSON.stringify(currentStoryArc) : null) : sql`current_story_arc`},
          completed_story_arcs = COALESCE(${completedStoryArcs}, completed_story_arcs),
          last_brush_date = ${lastBrushDate !== undefined ? lastBrushDate : sql`last_brush_date`},
          name_audio_url = COALESCE(${nameAudioUrl}, name_audio_url)
        WHERE id = ${id}
        RETURNING *
      `;

      if (!row) {
        return res.status(404).json({ error: 'Child not found' });
      }

      return res.status(200).json({ child: toChild(row) });
    } catch (error) {
      console.error('[Children API] Error updating child:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: 'Failed to update child', details: message });
    }
  }

  // DELETE - Delete a child
  if (req.method === 'DELETE') {
    try {
      const [row] = await sql`DELETE FROM children WHERE id = ${id} RETURNING id`;
      if (!row) {
        return res.status(404).json({ error: 'Child not found' });
      }
      return res.status(200).json({ success: true, id });
    } catch (error) {
      console.error('[Children API] Error deleting child:', error);
      return res.status(500).json({ error: 'Failed to delete child' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
