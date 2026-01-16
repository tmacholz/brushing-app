const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

// Track last call time for rate limiting
let lastCallTime = 0;
const MIN_CALL_INTERVAL_MS = 1500; // Minimum 1.5 seconds between calls

async function callGemini(prompt: string, maxRetries: number = 5): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Enforce minimum interval between calls
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < MIN_CALL_INTERVAL_MS) {
    const waitTime = MIN_CALL_INTERVAL_MS - timeSinceLastCall;
    console.log(`[Gemini] Waiting ${waitTime}ms before next call (rate limiting)`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff with jitter: 3s, 6s, 12s, 24s...
      const baseDelay = Math.pow(2, attempt) * 1500;
      const jitter = Math.random() * 1000; // Add up to 1s jitter
      const delay = baseDelay + jitter;
      console.log(`[Gemini] Rate limited, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    lastCallTime = Date.now();
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 8192 },
      }),
    });

    if (response.status === 429) {
      // Try to get retry-after header
      const retryAfter = response.headers.get('retry-after');
      if (retryAfter) {
        console.log(`[Gemini] Rate limited, retry-after header: ${retryAfter}s`);
      }
      lastError = new Error('Rate limited by Gemini API');
      continue; // Retry
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const data = await response.json();
    console.log('[Gemini] Response structure:', JSON.stringify(data, null, 2).slice(0, 500));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      // Log full response for debugging
      console.error('[Gemini] No text found. Full response:', JSON.stringify(data, null, 2));
      const blockReason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason;
      throw new Error(`No text in Gemini response. Reason: ${blockReason || 'unknown'}`);
    }

    return text;
  }

  throw lastError || new Error('Gemini API failed after retries');
}

function extractJson<T>(text: string): T {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }
  return JSON.parse(jsonMatch[1].trim()) as T;
}

export interface GeneratedWorld {
  name: string;
  displayName: string;
  description: string;
  theme: string;
}

export async function generateWorld(): Promise<GeneratedWorld> {
  const prompt = `Generate a unique, imaginative world setting for a children's toothbrushing story app (ages 4-8).
The world should be magical, engaging, and appropriate for children.
Respond with ONLY a JSON object:
{"name": "kebab-case-name", "displayName": "Human Readable Name", "description": "A short 1-sentence description", "theme": "one-word-theme"}
Be creative! Don't use common themes.`;

  const text = await callGemini(prompt);
  return extractJson<GeneratedWorld>(text);
}

export interface StoryPitch {
  title: string;
  description: string;
  outline: { chapter: number; title: string; summary: string }[];
}

// Story Bible - comprehensive reference for consistent storytelling and visuals
export interface StoryBible {
  // Narrative elements
  tone: string; // e.g., "whimsical and heartwarming with gentle humor"
  themes: string[]; // e.g., ["friendship", "bravery", "helping others"]
  narrativeStyle: string; // e.g., "Third person, warm narrator voice, simple sentences"

  // Character behavior in THIS story
  childRole: string; // How [CHILD] acts in this story, e.g., "curious explorer who asks questions"
  petRole: string; // How [PET] acts, e.g., "loyal sidekick who provides comic relief"
  characterDynamic: string; // How they interact, e.g., "[CHILD] leads, [PET] encourages and helps"

  // World and visual consistency
  keyLocations: {
    name: string;
    visualDescription: string; // Detailed visual for image generation
    mood: string;
  }[];

  // Supporting characters (NPCs)
  recurringCharacters: {
    name: string;
    visualDescription: string;
    personality: string;
    role: string; // e.g., "wise mentor", "comic relief", "needs help"
  }[];

  // Visual style guide
  colorPalette: string; // e.g., "warm golden yellows, soft greens, magical purples"
  lightingStyle: string; // e.g., "soft dappled sunlight filtering through leaves"
  artDirection: string; // Additional visual notes

  // Story-specific elements
  magicSystem: string | null; // If applicable, how magic works
  stakes: string; // What's at risk, e.g., "The forest animals will lose their home"
  resolution: string; // How it ends (for consistent buildup)
}

export async function generateStoryBible(
  worldName: string,
  worldDescription: string,
  storyTitle: string,
  storyDescription: string,
  outline: { chapter: number; title: string; summary: string }[]
): Promise<StoryBible> {
  const outlineText = outline.map(ch => `  Chapter ${ch.chapter}: "${ch.title}" - ${ch.summary}`).join('\n');

  const prompt = `Create a comprehensive "Story Bible" for a children's story (ages 4-8) in a toothbrushing app.

STORY DETAILS:
World: ${worldName} - ${worldDescription}
Title: "${storyTitle}"
Description: ${storyDescription}

CHAPTER OUTLINE:
${outlineText}

The main characters are [CHILD] (the player's child, personalized at runtime) and [PET] (their magical companion, also personalized).

Create a Story Bible that will ensure CONSISTENCY across all 5 chapters for both the NARRATIVE and VISUAL elements. This bible will be referenced when writing each chapter AND when generating images.

Respond with ONLY this JSON structure:
{
  "tone": "Describe the overall emotional tone (1 sentence)",
  "themes": ["theme1", "theme2", "theme3"],
  "narrativeStyle": "Describe the writing style and narrator voice",

  "childRole": "How [CHILD] behaves and grows in THIS specific story",
  "petRole": "How [PET] behaves and helps in THIS specific story",
  "characterDynamic": "How [CHILD] and [PET] interact and support each other",

  "keyLocations": [
    {
      "name": "Location Name",
      "visualDescription": "Detailed visual description for image generation - colors, lighting, key features, atmosphere",
      "mood": "emotional quality of this place"
    }
  ],

  "recurringCharacters": [
    {
      "name": "Character Name",
      "visualDescription": "Detailed visual appearance for consistent image generation",
      "personality": "2-3 word personality",
      "role": "their role in the story"
    }
  ],

  "colorPalette": "The dominant colors that should appear throughout the story's images",
  "lightingStyle": "Consistent lighting approach for all scenes",
  "artDirection": "Any additional visual style notes for consistency",

  "magicSystem": "How magic/fantasy elements work in this story (or null if not applicable)",
  "stakes": "What's at risk - why does this adventure matter?",
  "resolution": "Brief description of how the story resolves (for proper buildup)"
}

Be specific and detailed - this bible will be the source of truth for the entire story!`;

  const text = await callGemini(prompt);
  return extractJson<StoryBible>(text);
}

export interface ExistingStory {
  title: string;
  description: string;
}

export async function generateStoryPitches(
  worldName: string,
  worldDescription: string,
  count: number = 3,
  existingStories: ExistingStory[] = []
): Promise<StoryPitch[]> {
  const existingStoriesSection = existingStories.length > 0
    ? `\nEXISTING STORIES IN THIS WORLD (generate stories that are DIFFERENT from these - avoid similar plots, themes, conflicts, and settings):
${existingStories.map((s, i) => `${i + 1}. "${s.title}" - ${s.description}`).join('\n')}

IMPORTANT: Each new story must have a DISTINCT premise, different conflict type, and explore different aspects of the world. Avoid rehashing similar adventures.`
    : '';

  const prompt = `Generate ${count} unique story ideas for a children's toothbrushing app (ages 4-8).
World: ${worldName} - ${worldDescription}
Each story: 5-chapter adventure with [CHILD] and [PET] as main characters.
${existingStoriesSection}
Respond with ONLY a JSON array:
[{"title": "Story Title", "description": "1-2 sentence hook", "outline": [{"chapter": 1, "title": "Ch Title", "summary": "Brief summary"}, ...for all 5 chapters]}]`;

  const text = await callGemini(prompt);
  return extractJson<StoryPitch[]>(text);
}

export async function generateOutlineFromIdea(
  worldName: string,
  worldDescription: string,
  userIdea: string,
  existingStories: ExistingStory[] = []
): Promise<StoryPitch> {
  const existingStoriesSection = existingStories.length > 0
    ? `\nEXISTING STORIES IN THIS WORLD (ensure this new story is DIFFERENT from these):
${existingStories.map((s, i) => `${i + 1}. "${s.title}" - ${s.description}`).join('\n')}
`
    : '';

  const prompt = `Create a 5-chapter story outline based on this idea for a children's toothbrushing app (ages 4-8).
World: ${worldName} - ${worldDescription}
User's idea: "${userIdea}"
Features [CHILD] and [PET] as main characters.
${existingStoriesSection}
Respond with ONLY a JSON object:
{"title": "Story Title", "description": "1-2 sentence hook", "outline": [{"chapter": 1, "title": "Ch Title", "summary": "Brief summary"}, ...for all 5 chapters]}`;

  const text = await callGemini(prompt);
  return extractJson<StoryPitch>(text);
}

const BRUSHING_ZONES = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'tongue'] as const;
const BRUSHING_PROMPTS: Record<string, string[]> = {
  'top-left': ['Brush your top left teeth while we continue!', 'Scrub those top left teeth nice and clean!'],
  'top-right': ['Now brush your top right teeth!', 'Switch to the top right - keep brushing!'],
  'bottom-left': ['Move to your bottom left teeth!', 'Bottom left now - keep going!'],
  'bottom-right': ['Almost done! Brush your bottom right teeth!', 'Bottom right teeth - nearly there!'],
  'tongue': ["Don't forget your tongue!", 'Give your tongue a good brush!'],
};

function getRandomBrushingPrompt(zone: string): string {
  const prompts = BRUSHING_PROMPTS[zone] || BRUSHING_PROMPTS['top-left'];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

// Valid poses for character overlay system
const CHILD_POSES = ['happy', 'excited', 'surprised', 'worried', 'walking'] as const;
const PET_POSES = ['happy', 'excited', 'alert', 'worried', 'following'] as const;
const POSITIONS = ['left', 'center', 'right', 'off-screen'] as const;

export interface GeneratedChapter {
  chapterNumber: number;
  title: string;
  recap: string | null;
  cliffhanger: string;
  nextChapterTeaser: string;
  segments: {
    segmentOrder: number;
    text: string;
    durationSeconds: number;
    brushingZone: string | null;
    brushingPrompt: string | null;
    imagePrompt: string;
    // Character overlay system fields
    childPose: string | null;
    petPose: string | null;
    childPosition: string;
    petPosition: string;
  }[];
}

export async function generateFullStory(
  worldName: string,
  worldDescription: string,
  storyTitle: string,
  storyDescription: string,
  outline: { chapter: number; title: string; summary: string }[],
  storyBible?: StoryBible
): Promise<GeneratedChapter[]> {
  const chapters: GeneratedChapter[] = [];

  // Build story bible reference section if provided
  const bibleSection = storyBible ? `
STORY BIBLE (maintain consistency with these elements throughout):
- Tone: ${storyBible.tone}
- Themes: ${storyBible.themes.join(', ')}
- Narrative Style: ${storyBible.narrativeStyle}
- [CHILD]'s Role: ${storyBible.childRole}
- [PET]'s Role: ${storyBible.petRole}
- Character Dynamic: ${storyBible.characterDynamic}
- Stakes: ${storyBible.stakes}
- Resolution Direction: ${storyBible.resolution}

KEY LOCATIONS (use these visual descriptions for image prompts):
${storyBible.keyLocations.map(loc => `- ${loc.name}: ${loc.visualDescription} (mood: ${loc.mood})`).join('\n')}

RECURRING CHARACTERS (maintain consistent appearances):
${storyBible.recurringCharacters.map(char => `- ${char.name}: ${char.visualDescription} (${char.personality}, role: ${char.role})`).join('\n')}

VISUAL STYLE (apply to all image prompts):
- Color Palette: ${storyBible.colorPalette}
- Lighting: ${storyBible.lightingStyle}
- Art Direction: ${storyBible.artDirection}
${storyBible.magicSystem ? `- Magic System: ${storyBible.magicSystem}` : ''}
` : '';

  for (let i = 0; i < outline.length; i++) {
    const chapterOutline = outline[i];
    const isFirstChapter = i === 0;
    const isLastChapter = i === outline.length - 1;
    const previousChapter = i > 0 ? chapters[i - 1] : null;

    // Build previous chapters summary for context
    const previousChaptersSummary = chapters.length > 0
      ? `\nPREVIOUS CHAPTERS SUMMARY:\n${chapters.map(ch => `- Chapter ${ch.chapterNumber} "${ch.title}": ${ch.segments.map(s => s.text).join(' ').slice(0, 150)}...`).join('\n')}`
      : '';

    const prompt = `Write Chapter ${chapterOutline.chapter} of a children's story for a toothbrushing app (ages 4-8).
Story: "${storyTitle}" - ${storyDescription}
World: ${worldName} - ${worldDescription}
Chapter ${chapterOutline.chapter}: "${chapterOutline.title}" - ${chapterOutline.summary}
${bibleSection}${previousChaptersSummary}
${previousChapter ? `Previous chapter ended with: "${previousChapter.cliffhanger}"` : ''}

Write exactly 5 segments (each ~15 seconds to read, 2-3 sentences, 40-60 words).
Use [CHILD] and [PET] as placeholders in the story text.
${isFirstChapter ? 'Start with excitement!' : 'Begin with brief recap.'}
${isLastChapter ? 'End with happy conclusion that resolves the story stakes.' : `End with an exciting cliffhanger that:
- Poses a QUESTION about what will happen next (e.g., "Will [CHILD] and [PET] reach the cave in time?" or "What could be making that strange sound?")
- Does NOT introduce new characters, actions, or events (no "Suddenly, a mysterious figure appeared...")
- Creates suspense by leaving an existing situation unresolved
- Makes the reader wonder about the outcome of the current scene`}

IMPORTANT - CHARACTER OVERLAY SYSTEM:
For each segment, provide:
- "imagePrompt": A BACKGROUND-ONLY scene description. Do NOT include [CHILD] or [PET] in the image prompt. Other NPCs/recurring characters CAN appear - use their visual descriptions from the Story Bible. Include the color palette and lighting style from the bible. Focus on environment, setting, atmosphere.
- "childPose": The child's expression/pose. Options: "happy", "excited", "surprised", "worried", "walking", or null if child not in scene.
- "petPose": The pet's expression/pose. Options: "happy", "excited", "alert", "worried", "following", or null if pet not in scene.
- "childPosition": Where the child appears. Options: "left", "center", "right", or "off-screen".
- "petPosition": Where the pet appears. Options: "left", "center", "right", or "off-screen".

Choose poses that match the emotional content of each segment. Avoid putting both characters in the same position.

Respond with ONLY JSON:
{"chapterNumber": ${chapterOutline.chapter}, "title": "${chapterOutline.title}", "recap": ${isFirstChapter ? 'null' : '"Brief recap"'}, "segments": [{"segmentOrder": 1, "text": "Story text...", "imagePrompt": "BACKGROUND ONLY scene description with Story Bible visual style", "childPose": "happy", "petPose": "happy", "childPosition": "center", "petPosition": "right"}, ...5 segments], "cliffhanger": "${isLastChapter ? '' : 'A question about what happens next (not a new event)'}", "nextChapterTeaser": "${isLastChapter ? 'The End!' : 'Teaser...'}"}`;

    const text = await callGemini(prompt);
    const chapterData = extractJson<{
      chapterNumber: number;
      title: string;
      recap: string | null;
      segments: {
        segmentOrder: number;
        text: string;
        imagePrompt: string;
        childPose?: string | null;
        petPose?: string | null;
        childPosition?: string;
        petPosition?: string;
      }[];
      cliffhanger: string;
      nextChapterTeaser: string;
    }>(text);

    const enhancedSegments = chapterData.segments.map((segment, idx) => {
      const zone = BRUSHING_ZONES[idx % BRUSHING_ZONES.length];
      const hasBrushingPrompt = idx === 1 || idx === 3 || idx === 4;

      // Validate and default pose/position values
      const childPose = segment.childPose && CHILD_POSES.includes(segment.childPose as typeof CHILD_POSES[number])
        ? segment.childPose
        : 'happy';
      const petPose = segment.petPose && PET_POSES.includes(segment.petPose as typeof PET_POSES[number])
        ? segment.petPose
        : 'happy';
      const childPosition = segment.childPosition && POSITIONS.includes(segment.childPosition as typeof POSITIONS[number])
        ? segment.childPosition
        : 'center';
      const petPosition = segment.petPosition && POSITIONS.includes(segment.petPosition as typeof POSITIONS[number])
        ? segment.petPosition
        : 'right';

      return {
        ...segment,
        durationSeconds: 15,
        brushingZone: hasBrushingPrompt ? zone : null,
        brushingPrompt: hasBrushingPrompt ? getRandomBrushingPrompt(zone) : null,
        childPose,
        petPose,
        childPosition,
        petPosition,
      };
    });

    chapters.push({ ...chapterData, segments: enhancedSegments });
  }

  return chapters;
}

// =====================================================
// Story Reference Extraction
// =====================================================

export interface ExtractedReference {
  type: 'character' | 'object' | 'location';
  name: string;
  description: string; // Detailed visual description for image generation
}

export async function extractStoryReferences(
  storyTitle: string,
  storyDescription: string,
  chapters: GeneratedChapter[],
  storyBible?: StoryBible
): Promise<ExtractedReference[]> {
  // Compile all story text and image prompts for analysis
  const allSegmentTexts = chapters.flatMap(ch =>
    ch.segments.map(s => s.text)
  ).join('\n');

  const allImagePrompts = chapters.flatMap(ch =>
    ch.segments.map(s => s.imagePrompt)
  ).join('\n');

  const allCliffhangers = chapters
    .filter(ch => ch.cliffhanger)
    .map(ch => ch.cliffhanger)
    .join('\n');

  // Include Story Bible info for richer extraction
  const bibleContext = storyBible ? `
STORY BIBLE CONTEXT:
Key Locations: ${storyBible.keyLocations.map(l => `${l.name} - ${l.visualDescription}`).join('; ')}
Recurring Characters: ${storyBible.recurringCharacters.map(c => `${c.name} - ${c.visualDescription}`).join('; ')}
Color Palette: ${storyBible.colorPalette}
Lighting Style: ${storyBible.lightingStyle}
` : '';

  const prompt = `Analyze this children's story and extract visual elements that need CONSISTENT reference images for illustration.

STORY: "${storyTitle}" - ${storyDescription}
${bibleContext}
STORY TEXT:
${allSegmentTexts}

IMAGE PROMPTS ALREADY IN THE STORY:
${allImagePrompts}

CLIFFHANGERS:
${allCliffhangers}

Extract the KEY VISUAL ELEMENTS that appear multiple times or are important to the story. Focus on elements that need to look consistent across different scenes.

DO NOT INCLUDE:
- [CHILD] or [PET] - these are the main characters handled separately
- Generic background elements (sky, grass, trees unless they're special)
- Single-use throwaway objects

DO INCLUDE (up to 8 total, prioritize most important):
1. CHARACTERS: NPCs, creatures, allies, or antagonists that appear in the story (e.g., "the wise owl", "the grumpy troll", "Queen Coral")
2. OBJECTS: Important recurring items (e.g., "the magical toothbrush", "the glowing crystal", "the treasure map")
3. LOCATIONS: Specific places that appear multiple times (e.g., "the crystal cavern entrance", "the ancient bridge", "the meadow clearing")

For CHARACTERS, provide descriptions suitable for generating a CHARACTER REFERENCE SHEET (showing the character from multiple angles).

Respond with ONLY a JSON array (max 8 items, sorted by importance):
[
  {
    "type": "character",
    "name": "the wise owl",
    "description": "A large elderly owl with silver-grey feathers, wearing tiny round spectacles perched on its beak. Deep amber eyes that twinkle with wisdom. Slightly ruffled feathers suggesting age. Dignified posture. Soft, fluffy appearance suitable for children's illustration."
  },
  {
    "type": "location",
    "name": "the crystal cavern",
    "description": "A magical underground cave with walls covered in glowing purple and blue crystals. Soft bioluminescent light emanates from the crystals. Smooth stone floor with scattered smaller gems. Stalactites hang from the ceiling. Ethereal, mystical atmosphere with gentle sparkles in the air."
  },
  {
    "type": "object",
    "name": "the enchanted toothbrush",
    "description": "A magical toothbrush with a handle made of swirling rainbow-colored crystal. Soft golden bristles that emit a gentle glow. Small stars and sparkles float around it when activated. Child-sized, friendly appearance."
  }
]

If the story has fewer meaningful visual elements, return fewer items. Quality over quantity.`;

  const text = await callGemini(prompt);
  const references = extractJson<ExtractedReference[]>(text);

  // Validate and limit to 8 references
  return references
    .filter(ref =>
      ['character', 'object', 'location'].includes(ref.type) &&
      ref.name &&
      ref.description
    )
    .slice(0, 8);
}

export interface GeneratedPet {
  name: string;
  displayName: string;
  description: string;
  storyPersonality: string;
  unlockCost: number;
  isStarter: boolean;
}

export async function generatePetSuggestions(
  existingPets: { name: string; displayName: string; description: string; storyPersonality: string }[],
  count: number = 3
): Promise<GeneratedPet[]> {
  const existingPetsList = existingPets.length > 0
    ? `\nExisting pets (make sure new pets are DISTINCT and DIFFERENT from these):\n${existingPets.map(p => `- ${p.displayName}: ${p.description} (personality: ${p.storyPersonality})`).join('\n')}`
    : '';

  const prompt = `Generate ${count} unique, creative pet companion ideas for a children's toothbrushing story app (ages 4-8).

Each pet should be:
- A magical, fantastical, or whimsical creature that would appeal to children
- Have a distinct personality that would be fun in adventure stories
- Be visually interesting and memorable
- Different from typical pets (dogs, cats, etc. are too common - be creative!)
${existingPetsList}

For each pet, provide:
- name: A kebab-case unique identifier (e.g., "sparkle-dragon", "cloud-bunny")
- displayName: A friendly name kids would say (e.g., "Sparkle", "Cloudy")
- description: A short, magical 1-sentence description
- storyPersonality: 2-3 words describing how they act in stories (e.g., "brave and curious", "silly but wise")
- unlockCost: Points needed to unlock (0 for starter pets, 50-150 for unlockable ones)
- isStarter: true if this should be a free starter pet, false otherwise

Make ${count > 2 ? 'one pet a starter (unlockCost: 0, isStarter: true) and the rest' : 'them'} unlockable with varying costs.

Respond with ONLY a JSON array:
[{"name": "kebab-case-name", "displayName": "Display Name", "description": "Magical description", "storyPersonality": "personality traits", "unlockCost": 0, "isStarter": true}, ...]`;

  const text = await callGemini(prompt);
  return extractJson<GeneratedPet[]>(text);
}
