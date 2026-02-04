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
  // First try to extract from code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim()) as T;
    } catch {
      // Fall through to other methods
    }
  }

  // Try to find balanced JSON object or array
  const startChar = text.indexOf('{') !== -1 ? '{' : '[';
  const endChar = startChar === '{' ? '}' : ']';
  const startIndex = text.indexOf(startChar);

  if (startIndex === -1) {
    throw new Error('No JSON found in response');
  }

  // Find the matching closing brace/bracket by counting
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let endIndex = -1;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === startChar || char === '{' || char === '[') {
      depth++;
    } else if (char === endChar || char === '}' || char === ']') {
      depth--;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex === -1) {
    throw new Error('No valid JSON found - unbalanced braces');
  }

  const jsonStr = text.slice(startIndex, endIndex + 1);
  return JSON.parse(jsonStr) as T;
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
  tone: string;
  themes: string[];
  narrativeStyle: string;

  // Character behavior in THIS story
  childRole: string;
  petRole: string;
  characterDynamic: string;

  // Visual style guide
  colorPalette: string;
  lightingStyle: string;
  artDirection: string;

  // Story-specific elements
  magicSystem: string | null;
  stakes: string;
  resolution: string;
}

// Raw response from AI before we extract references
interface RawStoryBibleResponse {
  tone: string;
  themes: string[];
  narrativeStyle: string;
  childRole: string;
  petRole: string;
  characterDynamic: string;
  visualAssets: {
    locations: { name: string; description: string; mood?: string }[];
    characters: { name: string; description: string; personality?: string; role?: string }[];
    objects: { name: string; description: string }[];
  };
  colorPalette: string;
  lightingStyle: string;
  artDirection: string;
  magicSystem: string | null;
  stakes: string;
  resolution: string;
}

export interface GeneratedStoryBibleResult {
  storyBible: StoryBible;
  references: ExtractedReference[];
}

export async function generateStoryBible(
  worldName: string,
  worldDescription: string,
  storyTitle: string,
  storyDescription: string,
  outline: { chapter: number; title: string; summary: string }[]
): Promise<GeneratedStoryBibleResult> {
  const outlineText = outline.map(ch => `  Chapter ${ch.chapter}: "${ch.title}" - ${ch.summary}`).join('\n');

  const prompt = `Create a comprehensive "Story Bible" for a children's adventure story (ages 4-8).

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

  "visualAssets": {
    "locations": [
      {
        "name": "Location Name",
        "description": "Detailed visual description for image generation - colors, lighting, key features, atmosphere",
        "mood": "emotional quality of this place"
      }
    ],
    "characters": [
      {
        "name": "NPC Character Name (NOT [CHILD] or [PET])",
        "description": "Detailed visual appearance for consistent image generation",
        "personality": "2-3 word personality",
        "role": "their role in the story (e.g., 'wise mentor', 'comic relief', 'needs help')"
      }
    ],
    "objects": [
      {
        "name": "Important Object Name",
        "description": "Detailed visual description of the object - appearance, materials, special features"
      }
    ]
  },

  "colorPalette": "The dominant colors that should appear throughout the story's images",
  "lightingStyle": "Consistent lighting approach for all scenes",
  "artDirection": "Any additional visual style notes for consistency",

  "magicSystem": "How magic/fantasy elements work in this story (or null if not applicable)",
  "stakes": "What's at risk - why does this adventure matter?",
  "resolution": "Brief description of how the story resolves (for proper buildup)"
}

IMPORTANT for visualAssets:
- locations: Include 2-4 key places that appear multiple times
- characters: Include NPCs (allies, mentors, creatures) that appear multiple times. Do NOT include [CHILD] or [PET].
- objects: Include 1-3 important items central to the plot (magical items, tools, treasures)

CRITICAL SAFETY REQUIREMENT for character descriptions:
- This is a children's app (ages 4-8). ALL characters must be described with appropriate clothing.
- For aquatic characters (mermaids, sea creatures): describe them wearing shirts, vests, or decorative chest coverings (like colorful scaled armor, seaweed wraps, coral jewelry covering the torso).
- Never describe characters as topless, bare-chested, or with exposed torsos.
- Think Disney/Pixar character design - always family-friendly.

Be specific and detailed - this bible will be the source of truth for the entire story!`;

  const text = await callGemini(prompt);
  const raw = extractJson<RawStoryBibleResponse>(text);

  // Extract references from the AI response (these will be saved to story_references table by the caller)
  const references: ExtractedReference[] = [];
  for (const loc of raw.visualAssets?.locations || []) {
    references.push({ type: 'location', name: loc.name, description: loc.description, mood: loc.mood, source: 'bible' });
  }
  for (const char of raw.visualAssets?.characters || []) {
    references.push({ type: 'character', name: char.name, description: char.description, personality: char.personality, role: char.role, source: 'bible' });
  }
  for (const obj of raw.visualAssets?.objects || []) {
    references.push({ type: 'object', name: obj.name, description: obj.description, source: 'bible' });
  }

  // Build the StoryBible (references are stored separately in story_references table)
  const storyBible: StoryBible = {
    tone: raw.tone,
    themes: raw.themes,
    narrativeStyle: raw.narrativeStyle,
    childRole: raw.childRole,
    petRole: raw.petRole,
    characterDynamic: raw.characterDynamic,
    colorPalette: raw.colorPalette,
    lightingStyle: raw.lightingStyle,
    artDirection: raw.artDirection,
    magicSystem: raw.magicSystem,
    stakes: raw.stakes,
    resolution: raw.resolution,
  };

  return { storyBible, references };
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

  const prompt = `Generate ${count} unique story ideas for a children's adventure app (ages 4-8).
World: ${worldName} - ${worldDescription}
Each story: 5-chapter adventure with [CHILD] and [PET] as main characters.
${existingStoriesSection}

STORY VARIETY GUIDELINES:
- Focus on engaging adventures, mysteries, friendships, and discoveries
- Do NOT make stories about brushing teeth or dental hygiene (the app handles that separately)
- Avoid overused tropes: chosen one prophecies, "believe in yourself" lessons, predictable hero's journeys
- Instead explore: unexpected friendships, clever problem-solving, funny misunderstandings, creative collaborations, mysteries with surprising twists
- Each story should feel fresh and surprising, not formulaic
- Characters should have quirky personalities and genuine challenges

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

  const prompt = `Create a 5-chapter story outline based on this idea for a children's adventure app (ages 4-8).
World: ${worldName} - ${worldDescription}
User's idea: "${userIdea}"
Features [CHILD] and [PET] as main characters.
${existingStoriesSection}

STORY GUIDELINES:
- Focus on the adventure, not on brushing teeth (the app handles that separately)
- Avoid formulaic plots - surprise the reader with unexpected twists
- Characters should feel real with quirky traits, not just archetypes

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

// Valid expressions for character portrait overlay system
// Unified expressions for both child and pet (circle portrait style)
const EXPRESSIONS = ['happy', 'sad', 'surprised', 'worried', 'determined', 'excited'] as const;
export type Expression = typeof EXPRESSIONS[number];

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
    // Character expression fields (stored as pose fields for DB compatibility)
    childPose: string | null;  // Expression: happy, sad, surprised, worried, determined, excited
    petPose: string | null;    // Expression: happy, sad, surprised, worried, determined, excited
  }[];
}

export async function generateFullStory(
  worldName: string,
  worldDescription: string,
  storyTitle: string,
  storyDescription: string,
  outline: { chapter: number; title: string; summary: string }[],
  storyBible?: StoryBible,
  references?: ExtractedReference[]
): Promise<GeneratedChapter[]> {
  const chapters: GeneratedChapter[] = [];

  // Build story bible reference section if provided
  let bibleSection = '';
  if (storyBible) {
    const locations = (references || []).filter(r => r.type === 'location');
    const characters = (references || []).filter(r => r.type === 'character');

    bibleSection = `
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
${locations.map(loc => `- ${loc.name}: ${loc.description}${loc.mood ? ` (mood: ${loc.mood})` : ''}`).join('\n')}

RECURRING CHARACTERS (maintain consistent appearances):
${characters.map(char => `- ${char.name}: ${char.description}${char.personality ? ` (${char.personality}` : ''}${char.role ? `, role: ${char.role})` : char.personality ? ')' : ''}`).join('\n')}

VISUAL STYLE (apply to all image prompts):
- Color Palette: ${storyBible.colorPalette}
- Lighting: ${storyBible.lightingStyle}
- Art Direction: ${storyBible.artDirection}
${storyBible.magicSystem ? `- Magic System: ${storyBible.magicSystem}` : ''}
`;
  }

  for (let i = 0; i < outline.length; i++) {
    const chapterOutline = outline[i];
    const isFirstChapter = i === 0;
    const isLastChapter = i === outline.length - 1;
    const previousChapter = i > 0 ? chapters[i - 1] : null;

    // Build previous chapters summary for context
    const previousChaptersSummary = chapters.length > 0
      ? `\nPREVIOUS CHAPTERS SUMMARY:\n${chapters.map(ch => `- Chapter ${ch.chapterNumber} "${ch.title}": ${ch.segments.map(s => s.text).join(' ').slice(0, 150)}...`).join('\n')}`
      : '';

    const prompt = `Write Chapter ${chapterOutline.chapter} of a children's adventure story (ages 4-8).
Story: "${storyTitle}" - ${storyDescription}
World: ${worldName} - ${worldDescription}
Chapter ${chapterOutline.chapter}: "${chapterOutline.title}" - ${chapterOutline.summary}
${bibleSection}${previousChaptersSummary}
${previousChapter ? `Previous chapter ended with: "${previousChapter.cliffhanger}"` : ''}

Write exactly 5 segments (each ~15 seconds to read, 2-3 sentences, 40-60 words).
Use [CHILD] and [PET] as placeholders in the story text.

STORY QUALITY GUIDELINES:
- Focus on the adventure - do NOT mention brushing, teeth, or dental hygiene
- Avoid clichés: no "believed in themselves", "learned the real treasure was friendship"
- Make characters react in surprising but believable ways
- Include specific, vivid details rather than generic descriptions
- Show characters being clever, creative, or resourceful

IMPORTANT - [PET] DESCRIPTIONS:
The pet companion could be ANY type of creature (animal, robot, magical being, fish, etc.).
- NEVER use species-specific physical descriptions (no "wagged tail", "fuzzy nose", "flapped wings", "purred", etc.)
- ONLY describe [PET]'s expressions and emotions (smiled, looked excited, seemed worried, bounced happily)
- Use universal actions: "jumped", "bounced", "nodded", "looked at", "moved closer"
- AVOID: tail, fur, paws, wings, fins, antenna, or any body part references

${isFirstChapter ? 'Start with excitement!' : 'Begin with brief recap.'}
${isLastChapter ? 'End with happy conclusion that resolves the story stakes.' : `End with an exciting cliffhanger that:
- Poses a QUESTION about what will happen next (e.g., "Will [CHILD] and [PET] reach the cave in time?" or "What could be making that strange sound?")
- Does NOT introduce new characters, actions, or events (no "Suddenly, a mysterious figure appeared...")
- Creates suspense by leaving an existing situation unresolved
- Makes the reader wonder about the outcome of the current scene`}

IMPORTANT - CHARACTER EXPRESSION SYSTEM:
For each segment, provide character expressions (portrait overlays will be shown in corner circles):
- "childExpression": The child's facial expression. Options: "happy", "sad", "surprised", "worried", "determined", "excited", or null if child not featured in this segment.
- "petExpression": The pet's facial expression. Options: "happy", "sad", "surprised", "worried", "determined", "excited", or null if pet not featured in this segment.

Choose expressions that match the emotional content of each segment.

Respond with ONLY JSON:
{"chapterNumber": ${chapterOutline.chapter}, "title": "${chapterOutline.title}", "recap": ${isFirstChapter ? 'null' : '"Brief recap"'}, "segments": [{"segmentOrder": 1, "text": "Story text...", "childExpression": "happy", "petExpression": "happy"}, ...5 segments], "cliffhanger": "${isLastChapter ? '' : 'A question about what happens next (not a new event)'}", "nextChapterTeaser": "${isLastChapter ? 'The End!' : 'Teaser...'}"}`;

    const text = await callGemini(prompt);
    const chapterData = extractJson<{
      chapterNumber: number;
      title: string;
      recap: string | null;
      segments: {
        segmentOrder: number;
        text: string;
        childExpression?: string | null;
        petExpression?: string | null;
      }[];
      cliffhanger: string;
      nextChapterTeaser: string;
    }>(text);

    const enhancedSegments = chapterData.segments.map((segment, idx) => {
      const zone = BRUSHING_ZONES[idx % BRUSHING_ZONES.length];
      const hasBrushingPrompt = idx === 1 || idx === 3 || idx === 4;

      // Validate expression values (stored in childPose/petPose fields for DB compatibility)
      const childPose = segment.childExpression && EXPRESSIONS.includes(segment.childExpression as Expression)
        ? segment.childExpression
        : 'happy';
      const petPose = segment.petExpression && EXPRESSIONS.includes(segment.petExpression as Expression)
        ? segment.petExpression
        : 'happy';

      return {
        ...segment,
        durationSeconds: 15,
        brushingZone: hasBrushingPrompt ? zone : null,
        brushingPrompt: hasBrushingPrompt ? getRandomBrushingPrompt(zone) : null,
        childPose,
        petPose,
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
  mood?: string;       // For locations
  personality?: string; // For characters
  role?: string;       // For characters
  source?: 'bible' | 'extracted'; // Where it came from
}

export async function extractStoryReferences(
  storyTitle: string,
  storyDescription: string,
  chapters: GeneratedChapter[],
  storyBible?: StoryBible,
  existingReferences?: ExtractedReference[]
): Promise<ExtractedReference[]> {
  // Compile all story text for analysis
  const allSegmentTexts = chapters.flatMap(ch =>
    ch.segments.map(s => s.text)
  ).join('\n');

  const allCliffhangers = chapters
    .filter(ch => ch.cliffhanger)
    .map(ch => ch.cliffhanger)
    .join('\n');

  // Include Story Bible and existing references for context
  let bibleContext = '';
  if (storyBible || (existingReferences && existingReferences.length > 0)) {
    const refs = existingReferences || [];
    const locations = refs.filter(r => r.type === 'location');
    const characters = refs.filter(r => r.type === 'character');
    const objects = refs.filter(r => r.type === 'object');

    bibleContext = `
STORY BIBLE CONTEXT:
Locations: ${locations.map(l => `${l.name} - ${l.description}`).join('; ')}
Characters: ${characters.map(c => `${c.name} - ${c.description}`).join('; ')}
Objects: ${objects.map(o => `${o.name} - ${o.description}`).join('; ')}
${storyBible ? `Color Palette: ${storyBible.colorPalette}\nLighting Style: ${storyBible.lightingStyle}` : ''}
`;
  }

  const prompt = `Analyze this children's story and extract visual elements that need CONSISTENT reference images for illustration.

STORY: "${storyTitle}" - ${storyDescription}
${bibleContext}
STORY TEXT:
${allSegmentTexts}

CLIFFHANGERS:
${allCliffhangers}

Extract the KEY VISUAL ELEMENTS that need to look consistent across different scenes.

DO NOT INCLUDE:
- [CHILD] or [PET] - these are the main characters handled separately
- Generic background elements (sky, grass, trees unless they're special)
- Single-use throwaway objects that only appear once

DO INCLUDE (up to 8 total, prioritize by frequency in the story):
1. CHARACTERS: NPCs, creatures, allies, or antagonists that appear multiple times (e.g., "the wise owl", "the grumpy troll", "Queen Coral")
2. OBJECTS: Important items that appear in multiple scenes (e.g., "the magical toothbrush", "the glowing crystal", "the treasure map")
3. LOCATIONS: Specific places that are revisited (e.g., "the crystal cavern entrance", "the ancient bridge", "the meadow clearing")

For CHARACTERS, provide descriptions suitable for generating a CHARACTER REFERENCE SHEET (showing the character from multiple angles).

CRITICAL SAFETY REQUIREMENT: This is for a children's app (ages 4-8).
- ALL characters must be described wearing appropriate clothing covering their torso.
- For aquatic characters (mermaids, sea creatures, etc.): describe them wearing shirts, vests, decorative scaled armor, seaweed wraps, or coral jewelry that covers the chest.
- Never describe characters as topless or with exposed torsos.

Respond with ONLY a JSON array (max 8 items, sorted by importance to the story):
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


// =====================================================
// Reference Tagging for Segments
// =====================================================

export interface SegmentForTagging {
  id: string;
  segmentOrder: number;
  text: string;
  imagePrompt: string | null;
}

export interface ReferenceForTagging {
  id: string;
  name: string;
  type: 'character' | 'object' | 'location';
  description: string;
}

export interface SegmentReferenceTags {
  segmentId: string;
  referenceIds: string[];
}

export async function suggestSegmentReferenceTags(
  segments: SegmentForTagging[],
  references: ReferenceForTagging[]
): Promise<SegmentReferenceTags[]> {
  if (references.length === 0) {
    return segments.map(s => ({ segmentId: s.id, referenceIds: [] }));
  }

  // Build reference list for the prompt
  const referenceList = references.map((ref, idx) =>
    `${idx + 1}. [${ref.id}] "${ref.name}" (${ref.type}): ${ref.description.slice(0, 100)}...`
  ).join('\n');

  // Build segment list for the prompt
  const segmentList = segments.map(seg =>
    `Segment ${seg.segmentOrder} [${seg.id}]:\n  Text: "${seg.text}"\n  Image Prompt: "${seg.imagePrompt || 'none'}"`
  ).join('\n\n');

  const prompt = `Analyze which visual references should be included when generating images for each story segment.

AVAILABLE REFERENCES:
${referenceList}

SEGMENTS TO ANALYZE:
${segmentList}

For each segment, determine which references (if any) should be included in the image generation.
A reference should be tagged if:
- The character/object/location is mentioned in the segment text
- The character/object/location should appear in the scene based on the image prompt
- The reference is relevant to what's being illustrated

Be SELECTIVE - only tag references that should VISUALLY APPEAR in that specific segment's illustration.

Respond with ONLY a JSON array mapping segment IDs to reference IDs:
[
  {"segmentId": "segment-uuid-1", "referenceIds": ["ref-uuid-1", "ref-uuid-3"]},
  {"segmentId": "segment-uuid-2", "referenceIds": []},
  ...
]

Include ALL segments in the response, even if they have no references (empty array).`;

  const text = await callGemini(prompt);
  const suggestions = extractJson<SegmentReferenceTags[]>(text);

  // Ensure all segments are represented
  const segmentIds = new Set(segments.map(s => s.id));
  const validReferenceIds = new Set(references.map(r => r.id));

  return segments.map(seg => {
    const suggestion = suggestions.find(s => s.segmentId === seg.id);
    if (suggestion) {
      // Filter to only valid reference IDs
      return {
        segmentId: seg.id,
        referenceIds: suggestion.referenceIds.filter(id => validReferenceIds.has(id))
      };
    }
    return { segmentId: seg.id, referenceIds: [] };
  });
}

// =====================================================
// Storyboard Generation
// =====================================================

export interface StoryboardSegment {
  segmentId: string;
  segmentOrder: number;
  chapterNumber: number;
  location: string | null;           // Location name (for display)
  characters: string[];              // NPC names (for display)
  locationId: string | null;         // story_references UUID
  characterIds: string[];            // story_references UUIDs
  shotType: 'wide' | 'medium' | 'close-up' | 'extreme-close-up' | 'over-shoulder';
  cameraAngle: 'eye-level' | 'low-angle' | 'high-angle' | 'birds-eye' | 'worms-eye' | 'dutch-angle';
  visualFocus: string;               // What to emphasize visually
  continuityNote: string;            // How this connects to adjacent segments
}

export interface StoryboardReference {
  id: string;   // UUID from story_references table
  type: 'character' | 'object' | 'location';
  name: string;
  description: string;
  mood?: string;
  personality?: string;
  role?: string;
}

export interface FullStoryboardInput {
  storyTitle: string;
  storyDescription: string;
  storyBible: StoryBible;
  references?: StoryboardReference[]; // References with DB UUIDs for ID-based lookups
  chapters: {
    chapterNumber: number;
    title: string;
    segments: {
      id: string;
      segmentOrder: number;
      text: string;
      imagePrompt: string | null;
    }[];
  }[];
}

export async function generateStoryboard(input: FullStoryboardInput): Promise<StoryboardSegment[]> {
  const { storyTitle, storyDescription, storyBible, references: inputRefs, chapters } = input;

  // Get locations and characters from references (story_references table with UUIDs)
  const allRefs = inputRefs || [];
  const locations = allRefs.filter(r => r.type === 'location').map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    mood: r.mood,
  }));
  const characters = allRefs.filter(r => r.type === 'character').map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    personality: r.personality,
    role: r.role,
  }));

  // Build location list from Story Bible
  const locationList = locations.length
    ? locations.map(l => `- "${l.name}": ${l.description} (mood: ${l.mood || 'unspecified'})`).join('\n')
    : 'No specific locations defined';

  // Build character list from Story Bible
  const characterList = characters.length
    ? characters.map(c => `- "${c.name}": ${c.description} (${c.personality || 'unspecified'}, ${c.role || 'unspecified'})`).join('\n')
    : 'No recurring NPCs defined';

  // Build full story structure for analysis
  const storyStructure = chapters.map(ch => {
    const segmentLines = ch.segments.map(s =>
      `  Segment ${s.segmentOrder} [${s.id}]:\n    Text: "${s.text}"\n    Current Image Prompt: "${s.imagePrompt || 'none'}"`
    ).join('\n');
    return `Chapter ${ch.chapterNumber}: "${ch.title}"\n${segmentLines}`;
  }).join('\n\n');

  const prompt = `You are a storyboard artist for a children's animated story. Analyze the entire story and create a VISUAL STORYBOARD that plans camera work, locations, and character appearances for each segment.

STORY: "${storyTitle}"
${storyDescription}

VISUAL STYLE (from Story Bible):
- Color Palette: ${storyBible.colorPalette || 'Not specified'}
- Lighting: ${storyBible.lightingStyle || 'Not specified'}
- Art Direction: ${storyBible.artDirection || 'Not specified'}

AVAILABLE LOCATIONS (use these exact names when applicable):
${locationList}

AVAILABLE NPCs (use these exact names when they appear):
${characterList}

IMPORTANT - CHARACTER OVERLAY SYSTEM:
The [CHILD] and [PET] are rendered as SEPARATE sprite overlays on top of the background image.
They should NEVER be included in the storyboard planning because they are composited separately.
- Do NOT include [CHILD] or [PET] in the "characters" array
- Do NOT focus on [CHILD] or [PET] in the "visualFocus" field
- The storyboard plans ONLY the background scene and any NPCs

STORY STRUCTURE:
${storyStructure}

Create a storyboard that:
1. VARIES camera shots and angles - avoid repetition between adjacent segments
2. Uses LOCATIONS from the Story Bible when the scene matches (use exact name or null if no match)
3. Only includes NPCs when they are ACTUALLY in that segment's text/scene
4. Creates visual FLOW - establishing shots for new locations, then closer shots for action/dialogue
5. Uses camera angles meaningfully (low-angle for heroic moments, high-angle for vulnerability, etc.)

SHOT TYPES:
- "wide": Full scene, shows environment and multiple characters
- "medium": Characters from waist up, good for dialogue and action
- "close-up": Face/upper body, emotional moments
- "extreme-close-up": Specific detail (object, expression)
- "over-shoulder": POV from behind one character looking at another/scene

CAMERA ANGLES:
- "eye-level": Neutral, standard view
- "low-angle": Looking up, makes subjects appear powerful/heroic
- "high-angle": Looking down, makes subjects appear small/vulnerable
- "birds-eye": Directly above, shows layout/geography
- "worms-eye": From ground looking up, dramatic
- "dutch-angle": Tilted, creates unease or dynamic action

Respond with ONLY a JSON array containing ALL segments:
[
  {
    "segmentId": "uuid-here",
    "segmentOrder": 1,
    "chapterNumber": 1,
    "location": "the crystal cavern" or null,
    "characters": ["the wise owl"] or [],
    "shotType": "wide",
    "cameraAngle": "eye-level",
    "visualFocus": "The glowing crystals illuminating the cavern entrance",
    "continuityNote": "Establishing shot of new location"
  },
  ...
]

IMPORTANT:
- Include EVERY segment from the story
- Use EXACT location/character names from the Story Bible
- Vary shots between adjacent segments (don't use same shot type twice in a row)
- "characters" = ONLY NPCs from the Story Bible that appear in the scene (NEVER [CHILD] or [PET])
- "visualFocus" = What the BACKGROUND image should emphasize (NEVER the child or pet - they are overlaid separately)`;

  const text = await callGemini(prompt);
  const rawStoryboard = extractJson<Omit<StoryboardSegment, 'locationId' | 'characterIds'>[]>(text);

  // Validate shot types and camera angles
  const validShotTypes = ['wide', 'medium', 'close-up', 'extreme-close-up', 'over-shoulder'];
  const validCameraAngles = ['eye-level', 'low-angle', 'high-angle', 'birds-eye', 'worms-eye', 'dutch-angle'];

  // Helper to find location ID by name (fuzzy match)
  const findLocationId = (name: string | null): string | null => {
    if (!name) return null;
    const normalized = name.toLowerCase().replace(/^the\s+/, '');
    const match = locations.find(l =>
      l.name.toLowerCase().replace(/^the\s+/, '') === normalized ||
      l.name.toLowerCase().includes(normalized) ||
      normalized.includes(l.name.toLowerCase())
    );
    return match?.id || null;
  };

  // Helper to find character IDs by names (fuzzy match)
  const findCharacterIds = (names: string[]): string[] => {
    return names.map(name => {
      const normalized = name.toLowerCase().replace(/^the\s+/, '');
      const match = characters.find(c =>
        c.name.toLowerCase().replace(/^the\s+/, '') === normalized ||
        c.name.toLowerCase().includes(normalized) ||
        normalized.includes(c.name.toLowerCase())
      );
      return match?.id;
    }).filter((id): id is string => !!id);
  };

  return rawStoryboard.map(segment => ({
    ...segment,
    shotType: validShotTypes.includes(segment.shotType) ? segment.shotType : 'medium',
    cameraAngle: validCameraAngles.includes(segment.cameraAngle) ? segment.cameraAngle : 'eye-level',
    characters: Array.isArray(segment.characters) ? segment.characters : [],
    location: segment.location || null,
    // Add ID-based references
    locationId: findLocationId(segment.location),
    characterIds: findCharacterIds(Array.isArray(segment.characters) ? segment.characters : []),
  })) as StoryboardSegment[];
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
