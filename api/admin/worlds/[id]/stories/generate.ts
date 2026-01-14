import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../../../lib/db';
import { generateFullStory } from '../../../../lib/ai';

// POST /api/admin/worlds/[id]/stories/generate - Generate full story content from pitch
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getDb();
  const { id } = req.query;
  const { pitchId } = req.body;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid world ID' });
  }

  if (!pitchId) {
    return res.status(400).json({ error: 'Missing required field: pitchId' });
  }

  try {
    // Get the world
    const [world] = await sql`
      SELECT * FROM worlds WHERE id = ${id}
    `;

    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }

    // Get the pitch
    const [pitch] = await sql`
      SELECT * FROM story_pitches WHERE id = ${pitchId} AND world_id = ${id}
    `;

    if (!pitch) {
      return res.status(404).json({ error: 'Pitch not found' });
    }

    // Create the story record
    const [story] = await sql`
      INSERT INTO stories (world_id, title, description, total_chapters, status)
      VALUES (${id}, ${pitch.title}, ${pitch.description}, 5, 'generating')
      RETURNING *
    `;

    // Generate full story content
    const outline = pitch.outline as { chapter: number; title: string; summary: string }[];
    const chapters = await generateFullStory(
      world.display_name,
      world.description,
      pitch.title,
      pitch.description,
      outline
    );

    // Save chapters and segments
    for (const chapter of chapters) {
      const [savedChapter] = await sql`
        INSERT INTO chapters (story_id, chapter_number, title, recap, cliffhanger, next_chapter_teaser)
        VALUES (${story.id}, ${chapter.chapterNumber}, ${chapter.title}, ${chapter.recap}, ${chapter.cliffhanger}, ${chapter.nextChapterTeaser})
        RETURNING *
      `;

      for (const segment of chapter.segments) {
        await sql`
          INSERT INTO segments (chapter_id, segment_order, text, duration_seconds, brushing_zone, brushing_prompt, image_prompt)
          VALUES (${savedChapter.id}, ${segment.segmentOrder}, ${segment.text}, ${segment.durationSeconds}, ${segment.brushingZone}, ${segment.brushingPrompt}, ${segment.imagePrompt})
        `;
      }
    }

    // Update story status and mark pitch as used
    await sql`UPDATE stories SET status = 'draft' WHERE id = ${story.id}`;
    await sql`UPDATE story_pitches SET is_used = true WHERE id = ${pitchId}`;

    // Fetch the complete story with chapters and segments
    const fullStory = await getFullStory(sql, story.id);

    return res.status(201).json({ story: fullStory });
  } catch (error) {
    console.error('Error generating story:', error);
    return res.status(500).json({ error: 'Failed to generate story' });
  }
}

async function getFullStory(sql: ReturnType<typeof getDb>, storyId: string) {
  const [story] = await sql`SELECT * FROM stories WHERE id = ${storyId}`;

  const chapters = await sql`
    SELECT * FROM chapters WHERE story_id = ${storyId} ORDER BY chapter_number
  `;

  const chaptersWithSegments = await Promise.all(
    chapters.map(async (chapter) => {
      const segments = await sql`
        SELECT * FROM segments WHERE chapter_id = ${chapter.id} ORDER BY segment_order
      `;
      return { ...chapter, segments };
    })
  );

  return { ...story, chapters: chaptersWithSegments };
}
