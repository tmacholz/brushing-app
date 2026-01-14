import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent';

// Consistent style for all avatars (matches story image style)
const AVATAR_STYLE = `Children's book illustration style, soft watercolor and digital art hybrid,
warm and inviting colors, gentle lighting, whimsical and magical atmosphere,
suitable for ages 4-8, dreamlike quality, Studio Ghibli inspired soft aesthetic,
rounded friendly shapes, pastel color palette with vibrant accents.`;

interface GenerateUserAvatarRequest {
  type: 'user';
  photoDataUrl: string; // Base64 photo from camera
  childId: string;
  childName: string;
  childAge: number;
}

interface GeneratePetAvatarRequest {
  type: 'pet';
  petId: string;
  petName: string;
  petDescription: string;
  petPersonality: string;
}

type GenerateAvatarRequest = GenerateUserAvatarRequest | GeneratePetAvatarRequest;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const body = req.body as GenerateAvatarRequest;

  if (!body.type) {
    return res.status(400).json({ error: 'Missing required field: type' });
  }

  try {
    let prompt: string;
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
    let storageKey: string;

    if (body.type === 'user') {
      // User avatar from photo
      const { photoDataUrl, childId, childName, childAge } = body;

      if (!photoDataUrl || !childId || !childName) {
        return res.status(400).json({ error: 'Missing required fields for user avatar' });
      }

      // Extract base64 data from data URL
      const base64Match = photoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!base64Match) {
        return res.status(400).json({ error: 'Invalid photo data URL format' });
      }

      const [, mimeType, base64Data] = base64Match;

      // Add photo as reference
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });

      prompt = `${AVATAR_STYLE}

Create a character portrait illustration of a child based on the attached photo.
The character should be named ${childName} and appear to be around ${childAge} years old.

IMPORTANT:
- Maintain the child's key identifying features from the photo (hair color, eye color, skin tone, general face shape)
- Transform the realistic photo into the illustrated children's book style
- Show the character from chest up, centered in frame
- Give them a friendly, warm expression
- Use a simple, soft gradient background
- The character should look approachable and heroic, like a storybook protagonist
- No text or labels in the image`;

      storageKey = `avatars/${childId}.png`;

    } else if (body.type === 'pet') {
      // Pet avatar from description
      const { petId, petName, petDescription, petPersonality } = body;

      if (!petId || !petName || !petDescription) {
        return res.status(400).json({ error: 'Missing required fields for pet avatar' });
      }

      prompt = `${AVATAR_STYLE}

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
- No text or labels in the image`;

      storageKey = `pet-avatars/${petId}.png`;

    } else {
      return res.status(400).json({ error: 'Invalid avatar type' });
    }

    // Add the text prompt
    parts.push({ text: prompt });

    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return res.status(response.status).json({ error: `Gemini API error: ${errorText}` });
    }

    const data = await response.json();

    // Extract the image from the response
    const responseParts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = responseParts.find(
      (part: { inlineData?: { mimeType: string; data: string } }) => part.inlineData
    );

    if (!imagePart?.inlineData) {
      console.error('No image in response:', JSON.stringify(data, null, 2));
      return res.status(500).json({ error: 'No avatar image generated' });
    }

    const { mimeType, data: base64Data } = imagePart.inlineData;

    // Upload to Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const blob = await put(storageKey, imageBuffer, {
          access: 'public',
          contentType: mimeType || 'image/png',
        });

        return res.status(200).json({
          avatarUrl: blob.url,
          type: body.type,
        });
      } catch (blobError) {
        console.error('Blob upload failed:', blobError);
      }
    }

    // Fallback to data URL (not recommended for avatars due to size)
    const dataUrl = `data:${mimeType || 'image/png'};base64,${base64Data}`;
    return res.status(200).json({
      avatarUrl: dataUrl,
      type: body.type,
      warning: 'Using data URL fallback - configure BLOB_READ_WRITE_TOKEN for persistent storage',
    });

  } catch (error) {
    console.error('Avatar generation error:', error);
    return res.status(500).json({ error: 'Failed to generate avatar' });
  }
}
