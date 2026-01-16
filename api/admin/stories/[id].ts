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
    // PUT - Update chapter content and/or narration sequences
    if (req.method === 'PUT') {
      const {
        title,
        recap,
        cliffhanger,
        nextChapterTeaser,
        recapNarrationSequence,
        cliffhangerNarrationSequence,
        teaserNarrationSequence
      } = req.body;
      console.log('Updating chapter:', chapterId, {
        title: title ?? 'not provided',
        recap: recap !== undefined ? 'provided' : 'not provided',
        cliffhanger: cliffhanger !== undefined ? 'provided' : 'not provided',
        nextChapterTeaser: nextChapterTeaser !== undefined ? 'provided' : 'not provided',
        recapNarration: recapNarrationSequence?.length ?? 'not provided',
        cliffhangerNarration: cliffhangerNarrationSequence?.length ?? 'not provided',
        teaserNarration: teaserNarrationSequence?.length ?? 'not provided',
      });

      try {
        // Check if any field is provided
        const hasContent = title !== undefined || recap !== undefined || cliffhanger !== undefined || nextChapterTeaser !== undefined;
        const hasNarration = recapNarrationSequence !== undefined || cliffhangerNarrationSequence !== undefined || teaserNarrationSequence !== undefined;

        if (!hasContent && !hasNarration) {
          return res.status(400).json({ error: 'No update data provided' });
        }

        // Build and execute update with all fields
        const [chapter] = await sql`
          UPDATE chapters SET
            title = COALESCE(${title ?? null}, title),
            recap = COALESCE(${recap ?? null}, recap),
            cliffhanger = COALESCE(${cliffhanger ?? null}, cliffhanger),
            next_chapter_teaser = COALESCE(${nextChapterTeaser ?? null}, next_chapter_teaser),
            recap_narration_sequence = COALESCE(${recapNarrationSequence ? JSON.stringify(recapNarrationSequence) : null}, recap_narration_sequence),
            cliffhanger_narration_sequence = COALESCE(${cliffhangerNarrationSequence ? JSON.stringify(cliffhangerNarrationSequence) : null}, cliffhanger_narration_sequence),
            teaser_narration_sequence = COALESCE(${teaserNarrationSequence ? JSON.stringify(teaserNarrationSequence) : null}, teaser_narration_sequence)
          WHERE id = ${chapterId} RETURNING *
        `;

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
    // PUT - Update segment (text, prompts, narration, and/or image)
    if (req.method === 'PUT') {
      const { text, brushingPrompt, imagePrompt, narrationSequence, imageUrl } = req.body;
      console.log('Updating segment:', segmentId, {
        text: text !== undefined ? 'provided' : 'not provided',
        brushingPrompt: brushingPrompt !== undefined ? 'provided' : 'not provided',
        imagePrompt: imagePrompt !== undefined ? 'provided' : 'not provided',
        narrationSequence: narrationSequence?.length ?? 'not provided',
        imageUrl: imageUrl ? 'provided' : 'not provided'
      });

      try {
        // Check if any field is provided
        const hasUpdate = text !== undefined || brushingPrompt !== undefined || imagePrompt !== undefined ||
          narrationSequence !== undefined || imageUrl !== undefined;

        if (!hasUpdate) {
          return res.status(400).json({ error: 'No update data provided' });
        }

        // Build and execute update with all fields
        const [segment] = await sql`
          UPDATE segments SET
            text = COALESCE(${text ?? null}, text),
            brushing_prompt = COALESCE(${brushingPrompt ?? null}, brushing_prompt),
            image_prompt = COALESCE(${imagePrompt ?? null}, image_prompt),
            narration_sequence = COALESCE(${narrationSequence ? JSON.stringify(narrationSequence) : null}, narration_sequence),
            image_url = COALESCE(${imageUrl ?? null}, image_url)
          WHERE id = ${segmentId} RETURNING *
        `;

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
    const { title, description, status, isPublished, backgroundMusicUrl, coverImageUrl } = req.body;

    try {
      const [story] = await sql`
        UPDATE stories SET
          title = COALESCE(${title}, title),
          description = COALESCE(${description}, description),
          status = COALESCE(${status}, status),
          is_published = COALESCE(${isPublished}, is_published),
          background_music_url = COALESCE(${backgroundMusicUrl}, background_music_url),
          cover_image_url = COALESCE(${coverImageUrl}, cover_image_url)
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
