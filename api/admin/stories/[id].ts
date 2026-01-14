import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../../lib/db.js';

// Handles story CRUD, publish operations, and segment updates
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  const { id, segment: segmentId } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid story ID' });
  }

  // ===== SEGMENT OPERATIONS (when ?segment=<id> is provided) =====
  if (typeof segmentId === 'string') {
    // PUT - Update segment
    if (req.method === 'PUT') {
      const { narrationSequence } = req.body;
      console.log('Updating segment:', segmentId, { narrationSequence: narrationSequence?.length ?? 0, 'items' });
      try {
        const [segment] = await sql`
          UPDATE segments SET
            narration_sequence = ${narrationSequence ? JSON.stringify(narrationSequence) : null}
          WHERE id = ${segmentId} RETURNING *
        `;
        console.log('Segment updated:', segment?.id, 'narration_sequence items:', segment?.narration_sequence?.length ?? 0);
        if (!segment) return res.status(404).json({ error: 'Segment not found' });
        return res.status(200).json({ segment });
      } catch (error) {
        console.error('Error updating segment:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({ error: 'Failed to update segment', details: message });
      }
    }

    // GET - Get single segment
    if (req.method === 'GET') {
      try {
        const [segment] = await sql`SELECT * FROM segments WHERE id = ${segmentId}`;
        if (!segment) return res.status(404).json({ error: 'Segment not found' });
        return res.status(200).json({ segment });
      } catch (error) {
        console.error('Error fetching segment:', error);
        return res.status(500).json({ error: 'Failed to fetch segment' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed for segment' });
  }

  // ===== STORY OPERATIONS =====

  // GET - Get full story with chapters and segments
  if (req.method === 'GET') {
    try {
      const [story] = await sql`SELECT * FROM stories WHERE id = ${id}`;
      if (!story) return res.status(404).json({ error: 'Story not found' });

      const chapters = await sql`SELECT * FROM chapters WHERE story_id = ${id} ORDER BY chapter_number`;
      const chaptersWithSegments = await Promise.all(
        chapters.map(async (chapter) => {
          const segments = await sql`SELECT * FROM segments WHERE chapter_id = ${chapter.id} ORDER BY segment_order`;
          return { ...chapter, segments };
        })
      );

      return res.status(200).json({ story: { ...story, chapters: chaptersWithSegments } });
    } catch (error) {
      console.error('Error fetching story:', error);
      return res.status(500).json({ error: 'Failed to fetch story' });
    }
  }

  // PUT - Update story metadata
  if (req.method === 'PUT') {
    const { title, description, status, isPublished } = req.body;

    try {
      const [story] = await sql`
        UPDATE stories SET
          title = COALESCE(${title}, title),
          description = COALESCE(${description}, description),
          status = COALESCE(${status}, status),
          is_published = COALESCE(${isPublished}, is_published)
        WHERE id = ${id} RETURNING *
      `;
      if (!story) return res.status(404).json({ error: 'Story not found' });
      return res.status(200).json({ story });
    } catch (error) {
      console.error('Error updating story:', error);
      return res.status(500).json({ error: 'Failed to update story' });
    }
  }

  // DELETE - Delete story
  if (req.method === 'DELETE') {
    try {
      const [story] = await sql`DELETE FROM stories WHERE id = ${id} RETURNING id`;
      if (!story) return res.status(404).json({ error: 'Story not found' });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting story:', error);
      return res.status(500).json({ error: 'Failed to delete story' });
    }
  }

  // POST - Publish/unpublish
  if (req.method === 'POST') {
    const { publish = true } = req.body;

    try {
      const [story] = await sql`
        UPDATE stories SET
          is_published = ${publish},
          status = ${publish ? 'published' : 'draft'}
        WHERE id = ${id} RETURNING *
      `;
      if (!story) return res.status(404).json({ error: 'Story not found' });
      return res.status(200).json({ story });
    } catch (error) {
      console.error('Error publishing story:', error);
      return res.status(500).json({ error: 'Failed to publish story' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
