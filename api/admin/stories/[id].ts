import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../../lib/db.js';

// Handles story CRUD, publish operations, and segment updates
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  const { id, segment: segmentId } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid story ID' });
  }

  // ===== CHAPTER OPERATIONS (when ?chapter=<id> is provided) =====
  const { chapter: chapterId } = req.query;
  if (typeof chapterId === 'string') {
    // PUT - Update chapter narration sequences
    if (req.method === 'PUT') {
      const { recapNarrationSequence, cliffhangerNarrationSequence, teaserNarrationSequence } = req.body;
      console.log('Updating chapter narration:', chapterId, {
        recap: recapNarrationSequence?.length ?? 'not provided',
        cliffhanger: cliffhangerNarrationSequence?.length ?? 'not provided',
        teaser: teaserNarrationSequence?.length ?? 'not provided',
      });

      try {
        // Build dynamic update based on what's provided
        const updates: Record<string, unknown> = {};
        if (recapNarrationSequence !== undefined) {
          updates.recap_narration_sequence = recapNarrationSequence ? JSON.stringify(recapNarrationSequence) : null;
        }
        if (cliffhangerNarrationSequence !== undefined) {
          updates.cliffhanger_narration_sequence = cliffhangerNarrationSequence ? JSON.stringify(cliffhangerNarrationSequence) : null;
        }
        if (teaserNarrationSequence !== undefined) {
          updates.teaser_narration_sequence = teaserNarrationSequence ? JSON.stringify(teaserNarrationSequence) : null;
        }

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ error: 'No update data provided' });
        }

        // Execute update
        let chapter;
        if (recapNarrationSequence !== undefined && cliffhangerNarrationSequence === undefined && teaserNarrationSequence === undefined) {
          [chapter] = await sql`
            UPDATE chapters SET recap_narration_sequence = ${updates.recap_narration_sequence}
            WHERE id = ${chapterId} RETURNING *
          `;
        } else if (cliffhangerNarrationSequence !== undefined && recapNarrationSequence === undefined && teaserNarrationSequence === undefined) {
          [chapter] = await sql`
            UPDATE chapters SET cliffhanger_narration_sequence = ${updates.cliffhanger_narration_sequence}
            WHERE id = ${chapterId} RETURNING *
          `;
        } else if (teaserNarrationSequence !== undefined && recapNarrationSequence === undefined && cliffhangerNarrationSequence === undefined) {
          [chapter] = await sql`
            UPDATE chapters SET teaser_narration_sequence = ${updates.teaser_narration_sequence}
            WHERE id = ${chapterId} RETURNING *
          `;
        } else {
          // Multiple fields - update all provided
          [chapter] = await sql`
            UPDATE chapters SET
              recap_narration_sequence = COALESCE(${updates.recap_narration_sequence ?? null}, recap_narration_sequence),
              cliffhanger_narration_sequence = COALESCE(${updates.cliffhanger_narration_sequence ?? null}, cliffhanger_narration_sequence),
              teaser_narration_sequence = COALESCE(${updates.teaser_narration_sequence ?? null}, teaser_narration_sequence)
            WHERE id = ${chapterId} RETURNING *
          `;
        }

        console.log('Chapter updated:', chapter?.id);
        if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
        return res.status(200).json({ chapter });
      } catch (error) {
        console.error('Error updating chapter:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({ error: 'Failed to update chapter', details: message });
      }
    }

    return res.status(405).json({ error: 'Method not allowed for chapter' });
  }

  // ===== SEGMENT OPERATIONS (when ?segment=<id> is provided) =====
  if (typeof segmentId === 'string') {
    // PUT - Update segment (narration and/or image)
    if (req.method === 'PUT') {
      const { narrationSequence, imageUrl } = req.body;
      console.log('Updating segment:', segmentId, {
        narrationSequence: narrationSequence?.length ?? 'not provided',
        imageUrl: imageUrl ? 'provided' : 'not provided'
      });

      try {
        // Build dynamic update based on what's provided
        let segment;
        if (narrationSequence !== undefined && imageUrl !== undefined) {
          [segment] = await sql`
            UPDATE segments SET
              narration_sequence = ${narrationSequence ? JSON.stringify(narrationSequence) : null},
              image_url = ${imageUrl}
            WHERE id = ${segmentId} RETURNING *
          `;
        } else if (narrationSequence !== undefined) {
          [segment] = await sql`
            UPDATE segments SET
              narration_sequence = ${narrationSequence ? JSON.stringify(narrationSequence) : null}
            WHERE id = ${segmentId} RETURNING *
          `;
        } else if (imageUrl !== undefined) {
          [segment] = await sql`
            UPDATE segments SET
              image_url = ${imageUrl}
            WHERE id = ${segmentId} RETURNING *
          `;
        } else {
          return res.status(400).json({ error: 'No update data provided' });
        }

        console.log('Segment updated:', segment?.id);
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
      console.log('[API] GET story:', id);
      const [story] = await sql`SELECT * FROM stories WHERE id = ${id}`;
      console.log('[API] Story found:', story?.id, story?.title);

      if (!story) {
        console.log('[API] Story not found for ID:', id);
        return res.status(404).json({ error: 'Story not found' });
      }

      const chapters = await sql`SELECT * FROM chapters WHERE story_id = ${id} ORDER BY chapter_number`;
      console.log('[API] Chapters found:', chapters.length);

      const chaptersWithSegments = await Promise.all(
        chapters.map(async (chapter) => {
          const segments = await sql`SELECT * FROM segments WHERE chapter_id = ${chapter.id} ORDER BY segment_order`;
          return { ...chapter, segments };
        })
      );

      return res.status(200).json({ story: { ...story, chapters: chaptersWithSegments } });
    } catch (error) {
      console.error('[API] Error fetching story:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: 'Failed to fetch story', details: message });
    }
  }

  // PUT - Update story metadata
  if (req.method === 'PUT') {
    const { title, description, status, isPublished, backgroundMusicUrl } = req.body;

    try {
      const [story] = await sql`
        UPDATE stories SET
          title = COALESCE(${title}, title),
          description = COALESCE(${description}, description),
          status = COALESCE(${status}, status),
          is_published = COALESCE(${isPublished}, is_published),
          background_music_url = COALESCE(${backgroundMusicUrl}, background_music_url)
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
