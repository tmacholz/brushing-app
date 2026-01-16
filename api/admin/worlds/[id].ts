import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { getDb } from '../../../lib/db.js';
import { generateStoryPitches, generateOutlineFromIdea, generateStoryBible, generateFullStory } from '../../../lib/ai.js';
import { generateWorldImageDirect } from '../../../lib/imageGeneration.js';

// Helper to generate world image (calls the shared function directly)
async function generateWorldImage(worldId: string, worldName: string, worldDescription: string, theme?: string): Promise<string | null> {
  try {
    return await generateWorldImageDirect(worldId, worldName, worldDescription, theme);
  } catch (error) {
    console.error('Error generating world image:', error);
    return null;
  }
}

// Handles all world-specific operations and story creation
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid world ID' });
  }

  // GET - Get world with stories
  if (req.method === 'GET') {
    try {
      const [world] = await sql`SELECT * FROM worlds WHERE id = ${id}`;
      if (!world) return res.status(404).json({ error: 'World not found' });

      const stories = await sql`SELECT * FROM stories WHERE world_id = ${id} ORDER BY created_at DESC`;
      return res.status(200).json({ world, stories });
    } catch (error) {
      console.error('Error fetching world:', error);
      return res.status(500).json({ error: 'Failed to fetch world' });
    }
  }

  // PUT - Update world
  if (req.method === 'PUT') {
    const { name, displayName, description, theme, unlockCost, isStarter, isPublished, backgroundMusicUrl } = req.body;

    try {
      const [world] = await sql`
        UPDATE worlds SET
          name = COALESCE(${name}, name),
          display_name = COALESCE(${displayName}, display_name),
          description = COALESCE(${description}, description),
          theme = COALESCE(${theme}, theme),
          unlock_cost = COALESCE(${unlockCost}, unlock_cost),
          is_starter = COALESCE(${isStarter}, is_starter),
          is_published = COALESCE(${isPublished}, is_published),
          background_music_url = COALESCE(${backgroundMusicUrl}, background_music_url)
        WHERE id = ${id} RETURNING *
      `;
      if (!world) return res.status(404).json({ error: 'World not found' });
      return res.status(200).json({ world });
    } catch (error) {
      console.error('Error updating world:', error);
      return res.status(500).json({ error: 'Failed to update world' });
    }
  }

  // DELETE - Delete world
  if (req.method === 'DELETE') {
    try {
      const [world] = await sql`DELETE FROM worlds WHERE id = ${id} RETURNING id`;
      if (!world) return res.status(404).json({ error: 'World not found' });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting world:', error);
      return res.status(500).json({ error: 'Failed to delete world' });
    }
  }

  // POST - Story operations (pitches, outline, generate) and world image regeneration
  if (req.method === 'POST') {
    const { action, idea, pitchId, count = 3 } = req.body;

    try {
      const [world] = await sql`SELECT * FROM worlds WHERE id = ${id}`;
      if (!world) return res.status(404).json({ error: 'World not found' });

      // Regenerate world image
      if (action === 'regenerateImage') {
        const imageUrl = await generateWorldImage(world.id, world.display_name, world.description, world.theme || undefined);
        if (!imageUrl) {
          return res.status(500).json({ error: 'Failed to generate world image' });
        }

        const [updatedWorld] = await sql`
          UPDATE worlds SET background_image_url = ${imageUrl}, updated_at = NOW()
          WHERE id = ${id} RETURNING *
        `;

        return res.status(200).json({ world: updatedWorld, imageUrl });
      }

      // Generate story pitches
      if (action === 'pitches') {
        const pitches = await generateStoryPitches(world.display_name, world.description, Math.min(count, 5));
        const savedPitches = [];
        for (const pitch of pitches) {
          const [saved] = await sql`
            INSERT INTO story_pitches (world_id, title, description, outline)
            VALUES (${id}, ${pitch.title}, ${pitch.description}, ${JSON.stringify(pitch.outline)})
            RETURNING *
          `;
          savedPitches.push(saved);
        }
        return res.status(200).json({ pitches: savedPitches });
      }

      // Generate outline from user idea
      if (action === 'outline') {
        if (!idea) return res.status(400).json({ error: 'Missing required field: idea' });
        const pitch = await generateOutlineFromIdea(world.display_name, world.description, idea);
        const [saved] = await sql`
          INSERT INTO story_pitches (world_id, title, description, outline)
          VALUES (${id}, ${pitch.title}, ${pitch.description}, ${JSON.stringify(pitch.outline)})
          RETURNING *
        `;
        return res.status(200).json({ pitch: saved });
      }

      // Generate full story from pitch
      if (action === 'generate') {
        if (!pitchId) return res.status(400).json({ error: 'Missing required field: pitchId' });

        const [pitch] = await sql`SELECT * FROM story_pitches WHERE id = ${pitchId} AND world_id = ${id}`;
        if (!pitch) return res.status(404).json({ error: 'Pitch not found' });

        const outline = pitch.outline as { chapter: number; title: string; summary: string }[];

        // Step 1: Generate Story Bible for consistency across chapters and images
        console.log('[Story] Generating Story Bible for:', pitch.title);
        const storyBible = await generateStoryBible(
          world.display_name,
          world.description,
          pitch.title,
          pitch.description,
          outline
        );
        console.log('[Story] Story Bible created with', storyBible.keyLocations.length, 'locations and', storyBible.recurringCharacters.length, 'characters');

        // Step 2: Create story record with bible
        const [story] = await sql`
          INSERT INTO stories (world_id, title, description, total_chapters, status, story_bible)
          VALUES (${id}, ${pitch.title}, ${pitch.description}, 5, 'generating', ${JSON.stringify(storyBible)})
          RETURNING *
        `;

        // Step 3: Generate chapters using the story bible for consistency
        const chapters = await generateFullStory(world.display_name, world.description, pitch.title, pitch.description, outline, storyBible);

        for (const chapter of chapters) {
          const [savedChapter] = await sql`
            INSERT INTO chapters (story_id, chapter_number, title, recap, cliffhanger, next_chapter_teaser)
            VALUES (${story.id}, ${chapter.chapterNumber}, ${chapter.title}, ${chapter.recap}, ${chapter.cliffhanger}, ${chapter.nextChapterTeaser})
            RETURNING *
          `;

          for (const segment of chapter.segments) {
            await sql`
              INSERT INTO segments (chapter_id, segment_order, text, duration_seconds, brushing_zone, brushing_prompt, image_prompt, child_pose, pet_pose, child_position, pet_position)
              VALUES (${savedChapter.id}, ${segment.segmentOrder}, ${segment.text}, ${segment.durationSeconds}, ${segment.brushingZone}, ${segment.brushingPrompt}, ${segment.imagePrompt}, ${segment.childPose}, ${segment.petPose}, ${segment.childPosition}, ${segment.petPosition})
            `;
          }
        }

        await sql`UPDATE stories SET status = 'draft' WHERE id = ${story.id}`;
        await sql`UPDATE story_pitches SET is_used = true WHERE id = ${pitchId}`;

        // Generate background music asynchronously (fire and forget - don't block response)
        const generateMusicAsync = async () => {
          try {
            const musicPrompt = `Gentle, whimsical instrumental music for a children's story.
Theme: ${world.theme || 'magical adventure'}
Story: ${pitch.title} - ${pitch.description}
Style: Soft, enchanting, suitable for ages 4-8. No vocals or lyrics.
Mood: Wonder, gentle excitement, cozy and safe feeling.
Instruments: Light orchestral, soft piano, gentle strings, subtle chimes.`;

            console.log('[Music] Generating background music for story:', story.id);
            const musicRes = await fetch('https://api.elevenlabs.io/v1/music/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
              },
              body: JSON.stringify({
                prompt: musicPrompt,
                duration_seconds: 120,
              }),
            });

            if (musicRes.ok) {
              const audioBuffer = await musicRes.arrayBuffer();
              const blob = await put(`story-music/${story.id}.mp3`, Buffer.from(audioBuffer), {
                access: 'public',
                contentType: 'audio/mpeg',
                allowOverwrite: true,
              });
              await sql`UPDATE stories SET background_music_url = ${blob.url} WHERE id = ${story.id}`;
              console.log('[Music] Background music saved:', blob.url);
            } else {
              console.error('[Music] Failed to generate music:', await musicRes.text());
            }
          } catch (err) {
            console.error('[Music] Error generating background music:', err);
          }
        };

        // Fire and forget - don't await
        generateMusicAsync();

        // Fetch complete story
        const [fullStory] = await sql`SELECT * FROM stories WHERE id = ${story.id}`;
        const storyChapters = await sql`SELECT * FROM chapters WHERE story_id = ${story.id} ORDER BY chapter_number`;
        const chaptersWithSegments = await Promise.all(
          storyChapters.map(async (ch) => {
            const segments = await sql`SELECT * FROM segments WHERE chapter_id = ${ch.id} ORDER BY segment_order`;
            return { ...ch, segments };
          })
        );

        return res.status(201).json({ story: { ...fullStory, chapters: chaptersWithSegments } });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
      console.error('Error in story operation:', error);
      return res.status(500).json({ error: 'Operation failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
