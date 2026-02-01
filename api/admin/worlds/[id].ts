import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { getDb } from '../../../lib/db.js';
import { generateStoryPitches, generateOutlineFromIdea, generateStoryBible, generateFullStory, extractStoryReferences, generateStoryboard, type ExistingStory, type StoryboardReference } from '../../../lib/ai.js';
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
        // Get existing stories in this world to avoid similar pitches
        const existingStoriesRaw = await sql`SELECT title, description FROM stories WHERE world_id = ${id}`;
        const existingStories: ExistingStory[] = existingStoriesRaw.map(s => ({
          title: s.title,
          description: s.description
        }));

        const pitches = await generateStoryPitches(world.display_name, world.description, Math.min(count, 5), existingStories);
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

        // Get existing stories in this world for context
        const existingStoriesRaw = await sql`SELECT title, description FROM stories WHERE world_id = ${id}`;
        const existingStories: ExistingStory[] = existingStoriesRaw.map(s => ({
          title: s.title,
          description: s.description
        }));

        const pitch = await generateOutlineFromIdea(world.display_name, world.description, idea, existingStories);
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
        const { storyBible, references: bibleReferences } = await generateStoryBible(
          world.display_name,
          world.description,
          pitch.title,
          pitch.description,
          outline
        );
        console.log('[Story] Story Bible created with', bibleReferences.filter(r => r.type === 'location').length, 'locations and', bibleReferences.filter(r => r.type === 'character').length, 'characters');

        // Step 2: Create story record with bible
        const [story] = await sql`
          INSERT INTO stories (world_id, title, description, total_chapters, status, story_bible)
          VALUES (${id}, ${pitch.title}, ${pitch.description}, 5, 'generating', ${JSON.stringify(storyBible)})
          RETURNING *
        `;

        // Step 2b: Save bible references to story_references table
        for (let i = 0; i < bibleReferences.length; i++) {
          const ref = bibleReferences[i];
          await sql`
            INSERT INTO story_references (story_id, type, name, description, mood, personality, role, source, sort_order)
            VALUES (${story.id}, ${ref.type}, ${ref.name}, ${ref.description}, ${ref.mood ?? null}, ${ref.personality ?? null}, ${ref.role ?? null}, ${ref.source ?? 'bible'}, ${i})
          `;
        }
        console.log('[Story] Saved', bibleReferences.length, 'bible references to story_references table');

        // Step 3: Generate chapters using the story bible for consistency
        const chapters = await generateFullStory(world.display_name, world.description, pitch.title, pitch.description, outline, storyBible, bibleReferences);

        for (const chapter of chapters) {
          const [savedChapter] = await sql`
            INSERT INTO chapters (story_id, chapter_number, title, recap, cliffhanger, next_chapter_teaser)
            VALUES (${story.id}, ${chapter.chapterNumber}, ${chapter.title}, ${chapter.recap}, ${chapter.cliffhanger}, ${chapter.nextChapterTeaser})
            RETURNING *
          `;

          for (const segment of chapter.segments) {
            await sql`
              INSERT INTO segments (chapter_id, segment_order, text, duration_seconds, brushing_zone, brushing_prompt, child_pose, pet_pose)
              VALUES (${savedChapter.id}, ${segment.segmentOrder}, ${segment.text}, ${segment.durationSeconds}, ${segment.brushingZone}, ${segment.brushingPrompt}, ${segment.childPose}, ${segment.petPose})
            `;
          }
        }

        await sql`UPDATE stories SET status = 'draft' WHERE id = ${story.id}`;
        await sql`UPDATE story_pitches SET is_used = true WHERE id = ${pitchId}`;

        // Step 4: Extract additional visual references and save directly to story_references
        console.log('[Story] Extracting visual references for:', pitch.title);
        try {
          const extractedRefs = await extractStoryReferences(pitch.title, pitch.description, chapters, storyBible, bibleReferences);
          console.log('[Story] Extracted', extractedRefs.length, 'visual references');

          // Get existing references to avoid duplicates
          const existingRefs = await sql`SELECT name, type FROM story_references WHERE story_id = ${story.id}`;
          const existingNames = new Set(existingRefs.map(r => r.name.toLowerCase()));

          // Get next sort_order
          const [maxOrder] = await sql`SELECT COALESCE(MAX(sort_order), -1) as max_order FROM story_references WHERE story_id = ${story.id}`;
          let sortOrder = (maxOrder?.max_order ?? -1) + 1;

          // Save new extracted references (skip duplicates by name)
          let addedCount = 0;
          for (const ref of extractedRefs) {
            const normalize = (s: string) => s.toLowerCase().replace(/^the\s+/, '');
            const isDuplicate = existingRefs.some(e =>
              e.type === ref.type && (
                normalize(e.name) === normalize(ref.name) ||
                normalize(e.name).includes(normalize(ref.name)) ||
                normalize(ref.name).includes(normalize(e.name))
              )
            );
            if (!isDuplicate) {
              await sql`
                INSERT INTO story_references (story_id, type, name, description, source, sort_order)
                VALUES (${story.id}, ${ref.type}, ${ref.name}, ${ref.description}, ${'extracted'}, ${sortOrder++})
              `;
              addedCount++;
            }
          }
          console.log('[Story] Added', addedCount, 'new extracted references to database');
        } catch (refError) {
          // Don't fail the whole story if reference extraction fails
          console.error('[Story] Reference extraction failed (non-fatal):', refError);
        }

        // Step 5: Generate storyboard for visual planning
        console.log('[Story] Generating storyboard for:', pitch.title);
        try {
          // Fetch chapters with segments (including segment IDs)
          const savedChapters = await sql`SELECT * FROM chapters WHERE story_id = ${story.id} ORDER BY chapter_number`;
          const chaptersForStoryboard = await Promise.all(
            savedChapters.map(async (ch) => {
              const segs = await sql`SELECT id, segment_order, text FROM segments WHERE chapter_id = ${ch.id} ORDER BY segment_order`;
              return {
                chapterNumber: ch.chapter_number,
                title: ch.title,
                segments: segs.map(s => ({
                  id: s.id,
                  segmentOrder: s.segment_order,
                  text: s.text,
                  imagePrompt: null,
                })),
              };
            })
          );

          // Fetch saved story_references with UUIDs to pass to storyboard
          const savedRefs = await sql`SELECT id, type, name, description, mood, personality, role FROM story_references WHERE story_id = ${story.id} ORDER BY sort_order`;
          const storyboardRefs: StoryboardReference[] = savedRefs.map(r => ({
            id: r.id,
            type: r.type,
            name: r.name,
            description: r.description,
            mood: r.mood || undefined,
            personality: r.personality || undefined,
            role: r.role || undefined,
          }));

          const storyboard = await generateStoryboard({
            storyTitle: pitch.title,
            storyDescription: pitch.description,
            storyBible,
            references: storyboardRefs,
            chapters: chaptersForStoryboard,
          });
          console.log('[Story] Generated storyboard with', storyboard.length, 'segment entries');

          // Update segments with storyboard data (including ID-based references)
          for (const entry of storyboard) {
            await sql`
              UPDATE segments SET
                storyboard_location = ${entry.location},
                storyboard_characters = ${entry.characters},
                storyboard_shot_type = ${entry.shotType},
                storyboard_camera_angle = ${entry.cameraAngle},
                storyboard_focus = ${entry.visualFocus},
                storyboard_continuity = ${entry.continuityNote},
                storyboard_location_id = ${entry.locationId},
                storyboard_character_ids = ${entry.characterIds}
              WHERE id = ${entry.segmentId}
            `;
          }
          console.log('[Story] Storyboard data saved to segments');

          // Step 6: Auto-tag references based on storyboard characters and locations
          const savedReferences = await sql`SELECT id, name, type FROM story_references WHERE story_id = ${story.id}`;
          if (savedReferences.length > 0) {
            console.log('[Story] Auto-tagging references based on storyboard...');
            for (const entry of storyboard) {
              const matchingRefIds: string[] = [];

              // Match characters from storyboard to character references
              for (const charName of entry.characters || []) {
                const matchingRef = savedReferences.find(r =>
                  r.type === 'character' &&
                  (r.name.toLowerCase().includes(charName.toLowerCase()) ||
                   charName.toLowerCase().includes(r.name.toLowerCase()))
                );
                if (matchingRef) matchingRefIds.push(matchingRef.id);
              }

              // Match location from storyboard to location references
              if (entry.location) {
                const matchingRef = savedReferences.find(r =>
                  r.type === 'location' &&
                  (r.name.toLowerCase().includes(entry.location!.toLowerCase()) ||
                   entry.location!.toLowerCase().includes(r.name.toLowerCase()))
                );
                if (matchingRef) matchingRefIds.push(matchingRef.id);
              }

              if (matchingRefIds.length > 0) {
                await sql`
                  UPDATE segments SET reference_ids = ${matchingRefIds}
                  WHERE id = ${entry.segmentId}
                `;
              }
            }
            console.log('[Story] Reference tags applied to segments');
          }
        } catch (storyboardError) {
          // Don't fail the whole story if storyboard generation fails
          console.error('[Story] Storyboard generation failed (non-fatal):', storyboardError);
        }

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
