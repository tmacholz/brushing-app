const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data: GenerateResponse = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No text in Gemini response');
  }

  return text;
}

function extractJson<T>(text: string): T {
  // Try to find JSON in the response (it might be wrapped in markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);

  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  return JSON.parse(jsonMatch[1].trim()) as T;
}

// Generate a random world
export interface GeneratedWorld {
  name: string;
  displayName: string;
  description: string;
  theme: string;
}

export async function generateWorld(): Promise<GeneratedWorld> {
  const prompt = `Generate a unique, imaginative world setting for a children's toothbrushing story app (ages 4-8).

The world should be magical, engaging, and appropriate for children. Think of settings like enchanted forests, underwater kingdoms, space adventures, dinosaur lands, etc.

Respond with ONLY a JSON object in this exact format:
{
  "name": "kebab-case-name",
  "displayName": "Human Readable Name",
  "description": "A short, exciting 1-sentence description that would appeal to children",
  "theme": "one-or-two-word-theme"
}

Be creative! Don't use common themes like "magical forest" or "underwater kingdom". Think of unique combinations.`;

  const text = await callGemini(prompt);
  return extractJson<GeneratedWorld>(text);
}

// Generate story pitches for a world
export interface StoryPitch {
  title: string;
  description: string;
  outline: {
    chapter: number;
    title: string;
    summary: string;
  }[];
}

export async function generateStoryPitches(worldName: string, worldDescription: string, count: number = 3): Promise<StoryPitch[]> {
  const prompt = `Generate ${count} unique story ideas for a children's toothbrushing app (ages 4-8).

The stories take place in this world:
- World: ${worldName}
- Description: ${worldDescription}

Each story should:
- Be a 5-chapter adventure with clear beginning, middle, and end
- Feature [CHILD] (the reader) and [PET] (their companion) as main characters
- Have age-appropriate themes: friendship, bravery, kindness, problem-solving
- Include a gentle challenge or mystery to solve
- End positively with a lesson or achievement

Respond with ONLY a JSON array of ${count} story pitches in this exact format:
[
  {
    "title": "Story Title",
    "description": "A 1-2 sentence hook that makes kids want to hear this story",
    "outline": [
      { "chapter": 1, "title": "Chapter Title", "summary": "Brief 1-sentence chapter summary" },
      { "chapter": 2, "title": "Chapter Title", "summary": "Brief 1-sentence chapter summary" },
      { "chapter": 3, "title": "Chapter Title", "summary": "Brief 1-sentence chapter summary" },
      { "chapter": 4, "title": "Chapter Title", "summary": "Brief 1-sentence chapter summary" },
      { "chapter": 5, "title": "Chapter Title", "summary": "Brief 1-sentence chapter summary" }
    ]
  }
]`;

  const text = await callGemini(prompt);
  return extractJson<StoryPitch[]>(text);
}

// Generate story outline from user idea
export async function generateOutlineFromIdea(worldName: string, worldDescription: string, userIdea: string): Promise<StoryPitch> {
  const prompt = `Create a 5-chapter story outline based on this idea for a children's toothbrushing app (ages 4-8).

World setting:
- World: ${worldName}
- Description: ${worldDescription}

User's story idea: "${userIdea}"

The story should:
- Be a 5-chapter adventure with clear beginning, middle, and end
- Feature [CHILD] (the reader) and [PET] (their companion) as main characters
- Incorporate the user's idea naturally
- Have age-appropriate themes: friendship, bravery, kindness, problem-solving
- Include a gentle challenge or mystery to solve
- End positively with a lesson or achievement

Respond with ONLY a JSON object in this exact format:
{
  "title": "Story Title based on the idea",
  "description": "A 1-2 sentence hook that makes kids want to hear this story",
  "outline": [
    { "chapter": 1, "title": "Chapter Title", "summary": "Brief 1-sentence chapter summary" },
    { "chapter": 2, "title": "Chapter Title", "summary": "Brief 1-sentence chapter summary" },
    { "chapter": 3, "title": "Chapter Title", "summary": "Brief 1-sentence chapter summary" },
    { "chapter": 4, "title": "Chapter Title", "summary": "Brief 1-sentence chapter summary" },
    { "chapter": 5, "title": "Chapter Title", "summary": "Brief 1-sentence chapter summary" }
  ]
}`;

  const text = await callGemini(prompt);
  return extractJson<StoryPitch>(text);
}

// Brushing zones to cycle through
const BRUSHING_ZONES = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'tongue'] as const;

const BRUSHING_PROMPTS: Record<string, string[]> = {
  'top-left': [
    'Brush your top left teeth while we continue!',
    'Scrub those top left teeth nice and clean!',
    'Time for the top left - brush in circles!',
  ],
  'top-right': [
    'Now brush your top right teeth!',
    'Switch to the top right - keep brushing!',
    'Top right teeth need cleaning too!',
  ],
  'bottom-left': [
    'Move to your bottom left teeth!',
    'Bottom left now - keep going!',
    'Scrub those bottom left teeth!',
  ],
  'bottom-right': [
    'Almost done! Brush your bottom right teeth!',
    'Bottom right teeth - nearly there!',
    'Keep brushing those bottom right teeth!',
  ],
  'tongue': [
    "Don't forget your tongue!",
    'Give your tongue a good brush!',
    'Brush your tongue to finish strong!',
  ],
};

function getRandomBrushingPrompt(zone: string): string {
  const prompts = BRUSHING_PROMPTS[zone] || BRUSHING_PROMPTS['top-left'];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

// Generate full story content from outline
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
  }[];
}

export async function generateFullStory(
  worldName: string,
  worldDescription: string,
  storyTitle: string,
  storyDescription: string,
  outline: { chapter: number; title: string; summary: string }[]
): Promise<GeneratedChapter[]> {
  const chapters: GeneratedChapter[] = [];

  for (let i = 0; i < outline.length; i++) {
    const chapterOutline = outline[i];
    const isFirstChapter = i === 0;
    const isLastChapter = i === outline.length - 1;
    const previousChapter = i > 0 ? chapters[i - 1] : null;

    const prompt = `Write Chapter ${chapterOutline.chapter} of a children's story for a toothbrushing app (ages 4-8).

Story: "${storyTitle}"
Story description: ${storyDescription}
World: ${worldName} - ${worldDescription}

Chapter outline:
${outline.map((ch) => `- Chapter ${ch.chapter}: ${ch.title} - ${ch.summary}`).join('\n')}

NOW WRITE CHAPTER ${chapterOutline.chapter}: "${chapterOutline.title}"
Summary: ${chapterOutline.summary}

${previousChapter ? `Previous chapter ended with: "${previousChapter.cliffhanger}"` : ''}

Requirements:
- Write exactly 5 story segments (each read during ~15 seconds of brushing)
- Each segment should be 2-3 sentences (40-60 words max)
- Use [CHILD] and [PET] as placeholders for character names
- Language should be simple, engaging, and age-appropriate
- Include vivid, visual descriptions suitable for illustration
- ${isFirstChapter ? 'Start the adventure with excitement!' : 'Begin with a brief recap of what happened.'}
- ${isLastChapter ? 'End the story with a satisfying, happy conclusion.' : 'End with an exciting cliffhanger!'}

Respond with ONLY a JSON object in this exact format:
{
  "chapterNumber": ${chapterOutline.chapter},
  "title": "${chapterOutline.title}",
  "recap": ${isFirstChapter ? 'null' : '"Brief 1-sentence recap of previous chapter"'},
  "segments": [
    {
      "segmentOrder": 1,
      "text": "Story text for segment 1...",
      "imagePrompt": "Detailed visual description for illustration"
    },
    {
      "segmentOrder": 2,
      "text": "Story text for segment 2...",
      "imagePrompt": "Detailed visual description for illustration"
    },
    {
      "segmentOrder": 3,
      "text": "Story text for segment 3...",
      "imagePrompt": "Detailed visual description for illustration"
    },
    {
      "segmentOrder": 4,
      "text": "Story text for segment 4...",
      "imagePrompt": "Detailed visual description for illustration"
    },
    {
      "segmentOrder": 5,
      "text": "Story text for segment 5...",
      "imagePrompt": "Detailed visual description for illustration"
    }
  ],
  "cliffhanger": "${isLastChapter ? '' : 'Exciting cliffhanger sentence...'}",
  "nextChapterTeaser": "${isLastChapter ? 'The End! Great job completing this adventure!' : 'Teaser for next chapter...'}"
}`;

    const text = await callGemini(prompt);
    const chapterData = extractJson<{
      chapterNumber: number;
      title: string;
      recap: string | null;
      segments: { segmentOrder: number; text: string; imagePrompt: string }[];
      cliffhanger: string;
      nextChapterTeaser: string;
    }>(text);

    // Add brushing zones and prompts to segments
    const enhancedSegments = chapterData.segments.map((segment, idx) => {
      const zone = BRUSHING_ZONES[idx % BRUSHING_ZONES.length];
      // First and third segments don't have brushing prompts (story moments)
      const hasBrushingPrompt = idx === 1 || idx === 3 || idx === 4;

      return {
        ...segment,
        durationSeconds: 15,
        brushingZone: hasBrushingPrompt ? zone : null,
        brushingPrompt: hasBrushingPrompt ? getRandomBrushingPrompt(zone) : null,
      };
    });

    chapters.push({
      ...chapterData,
      segments: enhancedSegments,
    });
  }

  return chapters;
}
