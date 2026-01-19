import type { VercelRequest, VercelResponse } from '@vercel/node';
import { del } from '@vercel/blob';
import { getDb } from '../../../lib/db.js';

interface ImageHistoryItem {
  url: string;
  created_at: string;
}

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
    // PUT - Update segment (text, prompts, narration, image, and/or reference tags)
    if (req.method === 'PUT') {
      const { text, brushingPrompt, imagePrompt, narrationSequence, imageUrl, selectImageFromHistory, referenceIds, storyboardExclude } = req.body;
      console.log('Updating segment:', segmentId, {
        text: text !== undefined ? 'provided' : 'not provided',
        brushingPrompt: brushingPrompt !== undefined ? 'provided' : 'not provided',
        imagePrompt: imagePrompt !== undefined ? 'provided' : 'not provided',
        narrationSequence: narrationSequence?.length ?? 'not provided',
        imageUrl: imageUrl ? 'provided' : 'not provided',
        selectImageFromHistory: selectImageFromHistory ? 'provided' : 'not provided',
        referenceIds: referenceIds !== undefined ? referenceIds.length : 'not provided',
        storyboardExclude: storyboardExclude !== undefined ? storyboardExclude.length : 'not provided'
      });

      try {
        // Check if any field is provided
        const hasUpdate = text !== undefined || brushingPrompt !== undefined || imagePrompt !== undefined ||
          narrationSequence !== undefined || imageUrl !== undefined || selectImageFromHistory !== undefined ||
          referenceIds !== undefined || storyboardExclude !== undefined;

        if (!hasUpdate) {
          return res.status(400).json({ error: 'No update data provided' });
        }

        // If selecting from history, just update image_url without modifying history
        if (selectImageFromHistory) {
          const [segment] = await sql`
            UPDATE segments SET
              image_url = ${selectImageFromHistory}
            WHERE id = ${segmentId} RETURNING *
          `;
          if (!segment) return res.status(404).json({ error: 'Segment not found' });
          return res.status(200).json({ segment });
        }

        // If new imageUrl provided, append to history
        let imageHistoryUpdate = null;
        if (imageUrl) {
          // Get current history and existing image
          const [current] = await sql`SELECT image_url, image_history FROM segments WHERE id = ${segmentId}`;
          let currentHistory: ImageHistoryItem[] = current?.image_history || [];

          // Backfill: if there's an existing image but history is empty, add it first
          if (current?.image_url && currentHistory.length === 0) {
            currentHistory = [{
              url: current.image_url,
              created_at: new Date(Date.now() - 1000).toISOString() // 1 second before new image
            }];
          }

          // Add new image to history
          const newHistoryItem: ImageHistoryItem = {
            url: imageUrl,
            created_at: new Date().toISOString()
          };
          const updatedHistory = [...currentHistory, newHistoryItem];
          imageHistoryUpdate = JSON.stringify(updatedHistory);
        }

        // Build and execute update with all fields
        const [segment] = await sql`
          UPDATE segments SET
            text = COALESCE(${text ?? null}, text),
            brushing_prompt = COALESCE(${brushingPrompt ?? null}, brushing_prompt),
            image_prompt = COALESCE(${imagePrompt ?? null}, image_prompt),
            narration_sequence = COALESCE(${narrationSequence ? JSON.stringify(narrationSequence) : null}, narration_sequence),
            image_url = COALESCE(${imageUrl ?? null}, image_url),
            image_history = COALESCE(${imageHistoryUpdate}, image_history),
            reference_ids = COALESCE(${referenceIds ?? null}, reference_ids),
            storyboard_exclude = COALESCE(${storyboardExclude ?? null}, storyboard_exclude)
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

    // DELETE - Delete an image from segment history
    if (req.method === 'DELETE') {
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: 'imageUrl is required' });
      }

      try {
        // Get current segment
        const [current] = await sql`SELECT image_url, image_history FROM segments WHERE id = ${segmentId}`;
        if (!current) return res.status(404).json({ error: 'Segment not found' });

        const currentHistory: ImageHistoryItem[] = current.image_history || [];

        // Remove image from history
        const updatedHistory = currentHistory.filter(item => item.url !== imageUrl);

        // If deleting the current image, set to most recent in history or null
        let newCurrentImage = current.image_url;
        if (current.image_url === imageUrl) {
          newCurrentImage = updatedHistory.length > 0
            ? updatedHistory[updatedHistory.length - 1].url
            : null;
        }

        // Update database
        const [segment] = await sql`
          UPDATE segments SET
            image_url = ${newCurrentImage},
            image_history = ${JSON.stringify(updatedHistory)}
          WHERE id = ${segmentId} RETURNING *
        `;

        // Delete from blob storage
        try {
          await del(imageUrl);
          console.log('Deleted blob:', imageUrl);
        } catch (blobError) {
          console.warn('Failed to delete blob (may not exist):', blobError);
        }

        return res.status(200).json({ segment });
      } catch (error) {
        console.error('Error deleting image:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({ error: 'Failed to delete image', details: message });
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

  // ===== REFERENCE OPERATIONS (when ?reference=<id> is provided) =====
  const { reference: referenceId } = req.query;
  if (typeof referenceId === 'string') {
    // PUT - Update reference (name, description, image_url)
    if (req.method === 'PUT') {
      const { name, description, imageUrl } = req.body;
      console.log('Updating reference:', referenceId, {
        name: name !== undefined ? 'provided' : 'not provided',
        description: description !== undefined ? 'provided' : 'not provided',
        imageUrl: imageUrl !== undefined ? 'provided' : 'not provided',
      });

      try {
        const hasUpdate = name !== undefined || description !== undefined || imageUrl !== undefined;
        if (!hasUpdate) {
          return res.status(400).json({ error: 'No update data provided' });
        }

        const [reference] = await sql`
          UPDATE story_references SET
            name = COALESCE(${name ?? null}, name),
            description = COALESCE(${description ?? null}, description),
            image_url = COALESCE(${imageUrl ?? null}, image_url)
          WHERE id = ${referenceId} AND story_id = ${id} RETURNING *
        `;

        console.log('Reference updated:', reference?.id);
        if (!reference) return res.status(404).json({ error: 'Reference not found' });
        return res.status(200).json({ reference });
      } catch (error) {
        console.error('Error updating reference:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({ error: 'Failed to update reference', details: message });
      }
    }

    // DELETE - Delete a reference
    if (req.method === 'DELETE') {
      try {
        const [reference] = await sql`
          DELETE FROM story_references WHERE id = ${referenceId} AND story_id = ${id} RETURNING id
        `;
        if (!reference) return res.status(404).json({ error: 'Reference not found' });
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error deleting reference:', error);
        return res.status(500).json({ error: 'Failed to delete reference' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed for reference' });
  }

  // ===== STORY OPERATIONS =====

  // GET - Get full story with chapters, segments, and references
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

      // Fetch story references
      const references = await sql`SELECT * FROM story_references WHERE story_id = ${id} ORDER BY sort_order`;
      console.log('[API] References found:', references.length);

      return res.status(200).json({ story: { ...story, chapters: chaptersWithSegments, references } });
    } catch (error) {
      console.error('[API] Error fetching story:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: 'Failed to fetch story', details: message });
    }
  }

  // PUT - Update story metadata
  if (req.method === 'PUT') {
    const { title, description, status, isPublished, backgroundMusicUrl, coverImageUrl, storyBible } = req.body;

    try {
      const [story] = await sql`
        UPDATE stories SET
          title = COALESCE(${title}, title),
          description = COALESCE(${description}, description),
          status = COALESCE(${status}, status),
          is_published = COALESCE(${isPublished}, is_published),
          background_music_url = COALESCE(${backgroundMusicUrl}, background_music_url),
          cover_image_url = COALESCE(${coverImageUrl}, cover_image_url),
          story_bible = COALESCE(${storyBible ? JSON.stringify(storyBible) : null}, story_bible)
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

  // POST - Publish/unpublish or add reference
  if (req.method === 'POST') {
    const { action, publish = true, type, name, description } = req.body;

    // Add new reference
    if (action === 'addReference') {
      if (!type || !name || !description) {
        return res.status(400).json({ error: 'Missing required fields: type, name, description' });
      }
      if (!['character', 'object', 'location'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type. Must be: character, object, or location' });
      }

      try {
        // Get the next sort_order
        const [maxOrder] = await sql`
          SELECT COALESCE(MAX(sort_order), -1) as max_order FROM story_references WHERE story_id = ${id}
        `;
        const sortOrder = (maxOrder?.max_order ?? -1) + 1;

        const [reference] = await sql`
          INSERT INTO story_references (story_id, type, name, description, sort_order)
          VALUES (${id}, ${type}, ${name}, ${description}, ${sortOrder})
          RETURNING *
        `;
        return res.status(201).json({ reference });
      } catch (error) {
        console.error('Error adding reference:', error);
        return res.status(500).json({ error: 'Failed to add reference' });
      }
    }

    // Re-extract references from story
    if (action === 'extractReferences') {
      try {
        // Import the extraction and tagging functions
        const { extractStoryReferences, suggestSegmentReferenceTags } = await import('../../../lib/ai.js');

        // Get story with bible
        const [story] = await sql`SELECT * FROM stories WHERE id = ${id}`;
        if (!story) return res.status(404).json({ error: 'Story not found' });

        // Get all chapters with segments (including segment IDs for tagging)
        const chapters = await sql`SELECT * FROM chapters WHERE story_id = ${id} ORDER BY chapter_number`;
        const allSegments: { id: string; segment_order: number; text: string; image_prompt: string | null; chapter_id: string }[] = [];
        const chaptersWithSegments = await Promise.all(
          chapters.map(async (ch) => {
            const segments = await sql`SELECT * FROM segments WHERE chapter_id = ${ch.id} ORDER BY segment_order`;
            allSegments.push(...segments.map(s => ({
              id: s.id,
              segment_order: s.segment_order,
              text: s.text,
              image_prompt: s.image_prompt,
              chapter_id: ch.id
            })));
            return {
              chapterNumber: ch.chapter_number,
              title: ch.title,
              recap: ch.recap,
              cliffhanger: ch.cliffhanger,
              nextChapterTeaser: ch.next_chapter_teaser,
              segments: segments.map(s => ({
                segmentOrder: s.segment_order,
                text: s.text,
                imagePrompt: s.image_prompt,
                durationSeconds: s.duration_seconds,
                brushingZone: s.brushing_zone,
                brushingPrompt: s.brushing_prompt,
                childPose: s.child_pose,
                petPose: s.pet_pose,
                childPosition: s.child_position,
                petPosition: s.pet_position,
              })),
            };
          })
        );

        // Extract references
        const references = await extractStoryReferences(
          story.title,
          story.description,
          chaptersWithSegments,
          story.story_bible || undefined
        );

        // Delete existing references and insert new ones
        await sql`DELETE FROM story_references WHERE story_id = ${id}`;

        const savedRefs = [];
        for (let i = 0; i < references.length; i++) {
          const ref = references[i];
          const [saved] = await sql`
            INSERT INTO story_references (story_id, type, name, description, sort_order)
            VALUES (${id}, ${ref.type}, ${ref.name}, ${ref.description}, ${i})
            RETURNING *
          `;
          savedRefs.push(saved);
        }

        // Now suggest reference tags for each segment
        if (savedRefs.length > 0) {
          console.log('[extractReferences] Suggesting reference tags for segments...');
          const segmentsForTagging = allSegments.map(s => ({
            id: s.id,
            segmentOrder: s.segment_order,
            text: s.text,
            imagePrompt: s.image_prompt
          }));
          const refsForTagging = savedRefs.map(r => ({
            id: r.id,
            name: r.name,
            type: r.type as 'character' | 'object' | 'location',
            description: r.description
          }));

          const tagSuggestions = await suggestSegmentReferenceTags(segmentsForTagging, refsForTagging);

          // Update segments with suggested reference tags
          for (const suggestion of tagSuggestions) {
            if (suggestion.referenceIds.length > 0) {
              await sql`
                UPDATE segments
                SET reference_ids = ${suggestion.referenceIds}
                WHERE id = ${suggestion.segmentId}
              `;
            }
          }
          console.log('[extractReferences] Updated segment reference tags');
        }

        return res.status(200).json({ references: savedRefs });
      } catch (error) {
        console.error('Error extracting references:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({ error: 'Failed to extract references', details: message });
      }
    }

    // Generate storyboard for visual planning
    if (action === 'generateStoryboard') {
      try {
        const { generateStoryboard } = await import('../../../lib/ai.js');

        // Get story with bible
        const [story] = await sql`SELECT * FROM stories WHERE id = ${id}`;
        if (!story) return res.status(404).json({ error: 'Story not found' });

        if (!story.story_bible) {
          return res.status(400).json({ error: 'Story Bible required. Generate or add a Story Bible first.' });
        }

        // Get all chapters with segments
        const chapters = await sql`SELECT * FROM chapters WHERE story_id = ${id} ORDER BY chapter_number`;
        const chaptersWithSegments = await Promise.all(
          chapters.map(async (ch) => {
            const segments = await sql`SELECT id, segment_order, text, image_prompt FROM segments WHERE chapter_id = ${ch.id} ORDER BY segment_order`;
            return {
              chapterNumber: ch.chapter_number,
              title: ch.title,
              segments: segments.map(s => ({
                id: s.id,
                segmentOrder: s.segment_order,
                text: s.text,
                imagePrompt: s.image_prompt,
              })),
            };
          })
        );

        console.log('[generateStoryboard] Generating storyboard for', chaptersWithSegments.length, 'chapters');

        // Generate storyboard
        const storyboard = await generateStoryboard({
          storyTitle: story.title,
          storyDescription: story.description,
          storyBible: story.story_bible,
          chapters: chaptersWithSegments,
        });

        console.log('[generateStoryboard] Generated', storyboard.length, 'segment entries');

        // Update segments with storyboard data
        let updatedCount = 0;
        for (const entry of storyboard) {
          const result = await sql`
            UPDATE segments SET
              storyboard_location = ${entry.location},
              storyboard_characters = ${entry.characters},
              storyboard_shot_type = ${entry.shotType},
              storyboard_camera_angle = ${entry.cameraAngle},
              storyboard_focus = ${entry.visualFocus},
              storyboard_continuity = ${entry.continuityNote}
            WHERE id = ${entry.segmentId}
          `;
          if (result.count > 0) updatedCount++;
        }

        console.log('[generateStoryboard] Updated', updatedCount, 'segments');

        // Auto-tag references based on storyboard characters and locations
        const references = await sql`SELECT id, name, type FROM story_references WHERE story_id = ${id}`;
        if (references.length > 0) {
          console.log('[generateStoryboard] Auto-tagging references based on storyboard');
          for (const entry of storyboard) {
            const matchingRefIds: string[] = [];

            // Match characters
            for (const charName of entry.characters || []) {
              const matchingRef = references.find(r =>
                r.type === 'character' &&
                r.name.toLowerCase().includes(charName.toLowerCase())
              );
              if (matchingRef) matchingRefIds.push(matchingRef.id);
            }

            // Match location
            if (entry.location) {
              const matchingRef = references.find(r =>
                r.type === 'location' &&
                r.name.toLowerCase().includes(entry.location!.toLowerCase())
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
        }

        return res.status(200).json({
          success: true,
          storyboard,
          updatedSegments: updatedCount
        });
      } catch (error) {
        console.error('Error generating storyboard:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({ error: 'Failed to generate storyboard', details: message });
      }
    }

    // Default: Publish/unpublish
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
