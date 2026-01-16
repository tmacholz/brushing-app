import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../lib/db.js';

// GET /api/content - Get all published worlds and stories for the frontend
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = getDb();

  try {
    // Get all published worlds
    const worlds = await sql`
      SELECT
        id,
        name,
        display_name,
        description,
        theme,
        background_image_url,
        background_music_url,
        unlock_cost,
        is_starter
      FROM worlds
      WHERE is_published = true
      ORDER BY is_starter DESC, unlock_cost ASC, created_at ASC
    `;

    // Get all published stories with their chapters and segments
    const stories = await sql`
      SELECT
        s.id,
        s.world_id,
        s.title,
        s.description,
        s.cover_image_url,
        s.background_music_url,
        s.total_chapters
      FROM stories s
      WHERE s.is_published = true
      ORDER BY s.created_at ASC
    `;

    // For each story, get chapters and segments
    const storiesWithContent = await Promise.all(
      stories.map(async (story) => {
        const chapters = await sql`
          SELECT
            id,
            chapter_number,
            title,
            recap,
            cliffhanger,
            next_chapter_teaser,
            recap_narration_sequence,
            cliffhanger_narration_sequence,
            teaser_narration_sequence
          FROM chapters
          WHERE story_id = ${story.id}
          ORDER BY chapter_number
        `;

        const chaptersWithSegments = await Promise.all(
          chapters.map(async (chapter) => {
            const segments = await sql`
              SELECT
                id,
                segment_order,
                text,
                duration_seconds,
                brushing_zone,
                brushing_prompt,
                image_prompt,
                image_url,
                narration_sequence,
                child_pose,
                pet_pose,
                child_position,
                pet_position
              FROM segments
              WHERE chapter_id = ${chapter.id}
              ORDER BY segment_order
            `;

            return {
              id: chapter.id,
              chapterNumber: chapter.chapter_number,
              title: chapter.title,
              recap: chapter.recap,
              cliffhanger: chapter.cliffhanger,
              nextChapterTeaser: chapter.next_chapter_teaser,
              isRead: false,
              readAt: null,
              recapNarrationSequence: chapter.recap_narration_sequence,
              cliffhangerNarrationSequence: chapter.cliffhanger_narration_sequence,
              teaserNarrationSequence: chapter.teaser_narration_sequence,
              segments: segments.map((seg) => ({
                id: seg.id,
                text: seg.text,
                durationSeconds: seg.duration_seconds,
                brushingZone: seg.brushing_zone,
                brushingPrompt: seg.brushing_prompt,
                imagePrompt: seg.image_prompt,
                imageUrl: seg.image_url,
                narrationSequence: seg.narration_sequence,
                childPose: seg.child_pose || null,
                petPose: seg.pet_pose || null,
                childPosition: seg.child_position || 'center',
                petPosition: seg.pet_position || 'right',
              })),
            };
          })
        );

        return {
          id: story.id,
          worldId: story.world_id,
          title: story.title,
          description: story.description,
          coverImageUrl: story.cover_image_url || '',
          backgroundMusicUrl: story.background_music_url || null,
          totalChapters: story.total_chapters,
          chapters: chaptersWithSegments,
        };
      })
    );

    // Format worlds for frontend
    const formattedWorlds = worlds.map((w) => ({
      id: w.id,
      name: w.name,
      displayName: w.display_name,
      description: w.description,
      theme: w.theme || 'magical-forest',
      backgroundImageUrl: w.background_image_url || `/worlds/${w.theme || 'magical-forest'}.png`,
      backgroundMusicUrl: w.background_music_url || null,
      unlockCost: w.unlock_cost,
      isStarter: w.is_starter,
    }));

    // Group stories by world
    const storyTemplates: Record<string, typeof storiesWithContent> = {};
    for (const story of storiesWithContent) {
      const world = worlds.find((w) => w.id === story.worldId);
      if (world) {
        if (!storyTemplates[world.name]) {
          storyTemplates[world.name] = [];
        }
        storyTemplates[world.name].push(story);
      }
    }

    return res.status(200).json({
      worlds: formattedWorlds,
      storyTemplates,
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return res.status(500).json({ error: 'Failed to fetch content' });
  }
}
