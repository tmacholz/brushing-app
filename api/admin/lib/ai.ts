const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 8192 },
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

export async function generateStoryPitches(worldName: string, worldDescription: string, count: number = 3): Promise<StoryPitch[]> {
  const prompt = `Generate ${count} unique story ideas for a children's toothbrushing app (ages 4-8).
World: ${worldName} - ${worldDescription}
Each story: 5-chapter adventure with [CHILD] and [PET] as main characters.
Respond with ONLY a JSON array:
[{"title": "Story Title", "description": "1-2 sentence hook", "outline": [{"chapter": 1, "title": "Ch Title", "summary": "Brief summary"}, ...for all 5 chapters]}]`;

  const text = await callGemini(prompt);
  return extractJson<StoryPitch[]>(text);
}

export async function generateOutlineFromIdea(worldName: string, worldDescription: string, userIdea: string): Promise<StoryPitch> {
  const prompt = `Create a 5-chapter story outline based on this idea for a children's toothbrushing app (ages 4-8).
World: ${worldName} - ${worldDescription}
User's idea: "${userIdea}"
Features [CHILD] and [PET] as main characters.
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
Story: "${storyTitle}" - ${storyDescription}
World: ${worldName} - ${worldDescription}
Chapter ${chapterOutline.chapter}: "${chapterOutline.title}" - ${chapterOutline.summary}
${previousChapter ? `Previous chapter ended with: "${previousChapter.cliffhanger}"` : ''}

Write exactly 5 segments (each ~15 seconds to read, 2-3 sentences, 40-60 words).
Use [CHILD] and [PET] as placeholders.
${isFirstChapter ? 'Start with excitement!' : 'Begin with brief recap.'}
${isLastChapter ? 'End with happy conclusion.' : 'End with exciting cliffhanger!'}

Respond with ONLY JSON:
{"chapterNumber": ${chapterOutline.chapter}, "title": "${chapterOutline.title}", "recap": ${isFirstChapter ? 'null' : '"Brief recap"'}, "segments": [{"segmentOrder": 1, "text": "Story text...", "imagePrompt": "Visual description for illustration"}, ...5 segments], "cliffhanger": "${isLastChapter ? '' : 'Exciting cliffhanger...'}", "nextChapterTeaser": "${isLastChapter ? 'The End!' : 'Teaser...'}"}`;

    const text = await callGemini(prompt);
    const chapterData = extractJson<{
      chapterNumber: number;
      title: string;
      recap: string | null;
      segments: { segmentOrder: number; text: string; imagePrompt: string }[];
      cliffhanger: string;
      nextChapterTeaser: string;
    }>(text);

    const enhancedSegments = chapterData.segments.map((segment, idx) => {
      const zone = BRUSHING_ZONES[idx % BRUSHING_ZONES.length];
      const hasBrushingPrompt = idx === 1 || idx === 3 || idx === 4;
      return {
        ...segment,
        durationSeconds: 15,
        brushingZone: hasBrushingPrompt ? zone : null,
        brushingPrompt: hasBrushingPrompt ? getRandomBrushingPrompt(zone) : null,
      };
    });

    chapters.push({ ...chapterData, segments: enhancedSegments });
  }

  return chapters;
}
