import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent';

// Consistent style prefix for all images
const STYLE_PREFIX = `Children's book illustration style, soft watercolor and digital art hybrid,
warm and inviting colors, gentle lighting, whimsical and magical atmosphere,
suitable for ages 4-8, no text in image, dreamlike quality,
Studio Ghibli inspired soft aesthetic, rounded friendly shapes,
pastel color palette with vibrant accents.`;

// Helper to fetch and convert image to base64
async function fetchImageAsBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/png';

    return { mimeType, data: base64 };
  } catch (error) {
    console.error('Failed to fetch image:', url, error);
    return null;
  }
}

// Helper to call Gemini API and upload result
async function generateAndUpload(
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>,
  storageKey: string
): Promise<{ url: string; isDataUrl: boolean }> {
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  const responseParts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find(
    (part: { inlineData?: { mimeType: string; data: string } }) => part.inlineData
  );

  if (!imagePart?.inlineData) {
    throw new Error('No image generated');
  }

  const { mimeType, data: base64Data } = imagePart.inlineData;

  // Try to upload to Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const blob = await put(storageKey, imageBuffer, {
        access: 'public',
        contentType: mimeType || 'image/png',
      });
      return { url: blob.url, isDataUrl: false };
    } catch (blobError) {
      console.error('Blob upload failed, falling back to data URL:', blobError);
    }
  }

  // Fallback to data URL
  return { url: `data:${mimeType || 'image/png'};base64,${base64Data}`, isDataUrl: true };
}

// Story image generation
interface StoryImageRequest {
  type: 'image';
  prompt: string;
  segmentId: string;
  referenceImageUrl?: string;
  userAvatarUrl?: string | null;
  petAvatarUrl?: string | null;
  includeUser?: boolean;
  includePet?: boolean;
  childName?: string;
  petName?: string;
}

async function handleStoryImage(req: StoryImageRequest, res: VercelResponse) {
  const { prompt, segmentId, referenceImageUrl, userAvatarUrl, petAvatarUrl, includeUser, includePet, childName, petName } = req;

  if (!prompt || !segmentId) {
    return res.status(400).json({ error: 'Missing required fields: prompt, segmentId' });
  }

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  const referenceDescriptions: string[] = [];
  let imageIndex = 1;

  // Add previous scene reference
  if (referenceImageUrl) {
    const imageData = await fetchImageAsBase64(referenceImageUrl);
    if (imageData) {
      parts.push({ inlineData: imageData });
      referenceDescriptions.push(`[Image ${imageIndex}] Previous scene - use for style, color palette, and lighting consistency`);
      imageIndex++;
    }
  }

  // Add user avatar reference
  if (includeUser && userAvatarUrl) {
    const imageData = await fetchImageAsBase64(userAvatarUrl);
    if (imageData) {
      parts.push({ inlineData: imageData });
      referenceDescriptions.push(
        `[Image ${imageIndex}] ${childName || 'The child character'}'s appearance - this character MUST appear in the scene with EXACT same features`
      );
      imageIndex++;
    }
  }

  // Add pet avatar reference
  if (includePet && petAvatarUrl) {
    const imageData = await fetchImageAsBase64(petAvatarUrl);
    if (imageData) {
      parts.push({ inlineData: imageData });
      referenceDescriptions.push(
        `[Image ${imageIndex}] ${petName || 'The pet companion'}'s appearance - this character MUST appear in the scene with EXACT same design`
      );
      imageIndex++;
    }
  }

  // Build the complete prompt
  let fullPrompt = STYLE_PREFIX + '\n\n';

  if (referenceDescriptions.length > 0) {
    fullPrompt += 'REFERENCE IMAGES PROVIDED:\n' + referenceDescriptions.join('\n') + '\n\n';
  }

  if (includeUser || includePet) {
    fullPrompt += 'CHARACTER REQUIREMENTS:\n';
    if (includeUser) {
      fullPrompt += `- ${childName || 'The child'} MUST be clearly visible in this scene. `;
      fullPrompt += userAvatarUrl ? 'Match their appearance EXACTLY from the reference image.\n' : 'Show them as a friendly child protagonist.\n';
    }
    if (includePet) {
      fullPrompt += `- ${petName || 'The pet companion'} MUST be clearly visible in this scene. `;
      fullPrompt += petAvatarUrl ? 'Match their appearance EXACTLY from the reference image.\n' : 'Show them as an adorable, friendly companion.\n';
    }
    fullPrompt += '- Characters should be interacting with the scene appropriately.\n\n';
  }

  fullPrompt += `SCENE TO ILLUSTRATE:\n${prompt}`;
  parts.push({ text: fullPrompt });

  const result = await generateAndUpload(parts, `story-images/${segmentId}.png`);
  return res.status(200).json({ imageUrl: result.url, segmentId });
}

// User avatar generation
interface UserAvatarRequest {
  type: 'userAvatar';
  photoDataUrl: string;
  childId: string;
  childName: string;
  childAge: number;
}

async function handleUserAvatar(req: UserAvatarRequest, res: VercelResponse) {
  const { photoDataUrl, childId, childName, childAge } = req;

  if (!photoDataUrl || !childId || !childName) {
    return res.status(400).json({ error: 'Missing required fields for user avatar' });
  }

  const base64Match = photoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!base64Match) {
    return res.status(400).json({ error: 'Invalid photo data URL format' });
  }

  const [, mimeType, base64Data] = base64Match;
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { inlineData: { mimeType, data: base64Data } },
    {
      text: `${STYLE_PREFIX}

Create a character portrait illustration of a child based on the attached photo.
The character should be named ${childName} and appear to be around ${childAge} years old.

IMPORTANT:
- Maintain the child's key identifying features from the photo (hair color, eye color, skin tone, general face shape)
- Transform the realistic photo into the illustrated children's book style
- Show the character from chest up, centered in frame
- Give them a friendly, warm expression
- Use a simple, soft gradient background
- The character should look approachable and heroic, like a storybook protagonist
- No text or labels in the image`,
    },
  ];

  const result = await generateAndUpload(parts, `avatars/${childId}.png`);
  return res.status(200).json({ avatarUrl: result.url, type: 'user', ...(result.isDataUrl && { warning: 'Using data URL fallback' }) });
}

// Pet avatar generation
interface PetAvatarRequest {
  type: 'petAvatar';
  petId: string;
  petName: string;
  petDescription: string;
  petPersonality: string;
}

async function handlePetAvatar(req: PetAvatarRequest, res: VercelResponse) {
  const { petId, petName, petDescription, petPersonality } = req;

  if (!petId || !petName || !petDescription) {
    return res.status(400).json({ error: 'Missing required fields for pet avatar' });
  }

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    {
      text: `${STYLE_PREFIX}

Create a character portrait illustration of a pet companion character.

Character: ${petName}
Description: ${petDescription}
Personality: ${petPersonality}

IMPORTANT:
- Show the full character, centered in frame
- Give them an expressive, friendly face that shows their personality
- Use a simple, soft gradient background
- The character should look like a lovable sidekick from a children's adventure story
- Make them visually distinct and memorable
- No text or labels in the image`,
    },
  ];

  const result = await generateAndUpload(parts, `pet-avatars/${petId}.png`);
  return res.status(200).json({ avatarUrl: result.url, type: 'pet', ...(result.isDataUrl && { warning: 'Using data URL fallback' }) });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const { type } = req.body;

  try {
    switch (type) {
      case 'image':
        return handleStoryImage(req.body, res);
      case 'userAvatar':
      case 'user': // backwards compatibility
        return handleUserAvatar({ ...req.body, type: 'userAvatar' }, res);
      case 'petAvatar':
      case 'pet': // backwards compatibility
        return handlePetAvatar({ ...req.body, type: 'petAvatar' }, res);
      default:
        return res.status(400).json({ error: 'Invalid type. Must be: image, userAvatar, or petAvatar' });
    }
  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate' });
  }
}
