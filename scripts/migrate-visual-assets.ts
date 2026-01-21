/**
 * Migration script to convert legacy Story Bible format to new visualAssets format
 *
 * This script:
 * 1. Finds all stories with story_bible that has keyLocations/recurringCharacters but not visualAssets
 * 2. Converts keyLocations to visualAssets.locations with unique IDs
 * 3. Converts recurringCharacters to visualAssets.characters with unique IDs
 * 4. Pulls objects from story_references into visualAssets.objects
 * 5. Links reference images from story_references to visualAssets entries
 * 6. Updates the story_bible in the database
 *
 * Run with: npx tsx scripts/migrate-visual-assets.ts
 */

import { neon } from '@neondatabase/serverless';
import { randomBytes } from 'crypto';

// Generate a short unique ID
function generateId(prefix: string): string {
  return `${prefix}-${randomBytes(6).toString('hex')}`;
}

interface LegacyLocation {
  name: string;
  visualDescription: string;
  mood: string;
}

interface LegacyCharacter {
  name: string;
  visualDescription: string;
  personality: string;
  role: string;
}

interface VisualAsset {
  id: string;
  name: string;
  description: string;
  mood?: string;
  personality?: string;
  role?: string;
  referenceImageUrl?: string;
  source: 'bible' | 'extracted';
}

interface StoryBible {
  // Legacy fields
  keyLocations?: LegacyLocation[];
  recurringCharacters?: LegacyCharacter[];
  // New consolidated format
  visualAssets?: {
    locations: VisualAsset[];
    characters: VisualAsset[];
    objects: VisualAsset[];
  };
  // Other fields we preserve
  [key: string]: unknown;
}

interface StoryReference {
  id: string;
  type: 'character' | 'object' | 'location';
  name: string;
  description: string;
  image_url: string | null;
}

async function migrate() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable not set');
    console.log('Set it with: export DATABASE_URL="your-connection-string"');
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);

  console.log('Starting visual assets migration...\n');

  // Fetch all stories with story_bible
  const stories = await sql`
    SELECT id, title, story_bible
    FROM stories
    WHERE story_bible IS NOT NULL
  `;

  console.log(`Found ${stories.length} stories with story_bible\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const story of stories) {
    const storyBible = story.story_bible as StoryBible;

    // Skip if already has visualAssets
    if (storyBible.visualAssets?.locations?.length ||
        storyBible.visualAssets?.characters?.length ||
        storyBible.visualAssets?.objects?.length) {
      console.log(`[SKIP] "${story.title}" - already has visualAssets`);
      skipped++;
      continue;
    }

    // Skip if no legacy data to migrate
    if (!storyBible.keyLocations?.length && !storyBible.recurringCharacters?.length) {
      console.log(`[SKIP] "${story.title}" - no legacy data to migrate`);
      skipped++;
      continue;
    }

    try {
      // Fetch story references for this story
      const refs = await sql`
        SELECT id, type, name, description, image_url
        FROM story_references
        WHERE story_id = ${story.id}
      ` as StoryReference[];

      // Helper to find matching reference image
      const findRefImage = (type: string, name: string): string | undefined => {
        const match = refs.find(r =>
          r.type === type &&
          (r.name.toLowerCase() === name.toLowerCase() ||
           r.name.toLowerCase().includes(name.toLowerCase()) ||
           name.toLowerCase().includes(r.name.toLowerCase()))
        );
        return match?.image_url || undefined;
      };

      // Convert keyLocations to visualAssets.locations
      const locations: VisualAsset[] = (storyBible.keyLocations || []).map(loc => ({
        id: generateId('loc'),
        name: loc.name,
        description: loc.visualDescription,
        mood: loc.mood,
        referenceImageUrl: findRefImage('location', loc.name),
        source: 'bible' as const,
      }));

      // Add locations from story_references not already in the list
      refs.filter(r => r.type === 'location').forEach(ref => {
        if (!locations.some(l => l.name.toLowerCase() === ref.name.toLowerCase())) {
          locations.push({
            id: generateId('loc'),
            name: ref.name,
            description: ref.description,
            referenceImageUrl: ref.image_url || undefined,
            source: 'extracted' as const,
          });
        }
      });

      // Convert recurringCharacters to visualAssets.characters
      const characters: VisualAsset[] = (storyBible.recurringCharacters || []).map(char => ({
        id: generateId('char'),
        name: char.name,
        description: char.visualDescription,
        personality: char.personality,
        role: char.role,
        referenceImageUrl: findRefImage('character', char.name),
        source: 'bible' as const,
      }));

      // Add characters from story_references not already in the list
      refs.filter(r => r.type === 'character').forEach(ref => {
        if (!characters.some(c => c.name.toLowerCase() === ref.name.toLowerCase())) {
          characters.push({
            id: generateId('char'),
            name: ref.name,
            description: ref.description,
            referenceImageUrl: ref.image_url || undefined,
            source: 'extracted' as const,
          });
        }
      });

      // Objects from story_references (legacy Story Bible had no objects)
      const objects: VisualAsset[] = refs
        .filter(r => r.type === 'object')
        .map(ref => ({
          id: generateId('obj'),
          name: ref.name,
          description: ref.description,
          referenceImageUrl: ref.image_url || undefined,
          source: 'extracted' as const,
        }));

      // Create updated story bible with visualAssets
      const updatedBible: StoryBible = {
        ...storyBible,
        visualAssets: {
          locations,
          characters,
          objects,
        },
      };

      // Update in database
      await sql`
        UPDATE stories
        SET story_bible = ${JSON.stringify(updatedBible)}
        WHERE id = ${story.id}
      `;

      console.log(`[OK] "${story.title}" - migrated ${locations.length} locations, ${characters.length} characters, ${objects.length} objects`);
      migrated++;

    } catch (err) {
      console.error(`[ERROR] "${story.title}" - ${err instanceof Error ? err.message : 'Unknown error'}`);
      errors++;
    }
  }

  console.log('\n--- Migration Complete ---');
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Errors:   ${errors}`);
}

migrate().catch(console.error);
