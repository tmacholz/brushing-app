import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Use the experimental image generation model
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent';

// Consistent style prefix for all story images
const STYLE_PREFIX = `Children's book illustration style, soft watercolor and digital art hybrid,
warm and inviting colors, gentle lighting, whimsical and magical atmosphere,
suitable for ages 4-8, no text in image, dreamlike quality,
Studio Ghibli inspired soft aesthetic, rounded friendly shapes,
pastel color palette with vibrant accents.`;

interface GenerateImageRequest {
  prompt: string;
  segmentId: string;
  referenceImageUrl?: string; // Previous scene for style consistency
  userAvatarUrl?: string | null; // User's illustrated avatar
  petAvatarUrl?: string | null; // Pet's illustrated avatar
  includeUser?: boolean; // Whether to include user character in scene
  includePet?: boolean; // Whether to include pet character in scene
  childName?: string; // Name of the child character
  petName?: string; // Name of the pet character
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const {
    prompt,
    segmentId,
    referenceImageUrl,
    userAvatarUrl,
    petAvatarUrl,
    includeUser,
    includePet,
    childName,
    petName,
  } = req.body as GenerateImageRequest;

  if (!prompt || !segmentId) {
    return res.status(400).json({ error: 'Missing required fields: prompt, segmentId' });
  }

  try {
    // Build the parts array for the request
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    // Track which reference images we're including
    const referenceDescriptions: string[] = [];
    let imageIndex = 1;

    // Add previous scene reference (for style consistency)
    if (referenceImageUrl) {
      const imageData = await fetchImageAsBase64(referenceImageUrl);
      if (imageData) {
        parts.push({ inlineData: imageData });
        referenceDescriptions.push(`[Image ${imageIndex}] Previous scene - use for style, color palette, and lighting consistency`);
        imageIndex++;
      }
    }

    // Add user avatar reference (if user should appear in scene)
    if (includeUser && userAvatarUrl) {
      const imageData = await fetchImageAsBase64(userAvatarUrl);
      if (imageData) {
        parts.push({ inlineData: imageData });
        referenceDescriptions.push(
          `[Image ${imageIndex}] ${childName || 'The child character'}'s appearance - this character MUST appear in the scene with EXACT same features, hair, face, and clothing style`
        );
        imageIndex++;
      }
    }

    // Add pet avatar reference (if pet should appear in scene)
    if (includePet && petAvatarUrl) {
      const imageData = await fetchImageAsBase64(petAvatarUrl);
      if (imageData) {
        parts.push({ inlineData: imageData });
        referenceDescriptions.push(
          `[Image ${imageIndex}] ${petName || 'The pet companion'}'s appearance - this character MUST appear in the scene with EXACT same design and features`
        );
        imageIndex++;
      }
    }

    // Build the complete prompt with character instructions
    let fullPrompt = STYLE_PREFIX + '\n\n';

    // Add reference image instructions if we have any
    if (referenceDescriptions.length > 0) {
      fullPrompt += 'REFERENCE IMAGES PROVIDED:\n';
      fullPrompt += referenceDescriptions.join('\n');
      fullPrompt += '\n\n';
    }

    // Add character inclusion instructions
    if (includeUser || includePet) {
      fullPrompt += 'CHARACTER REQUIREMENTS:\n';

      if (includeUser) {
        fullPrompt += `- ${childName || 'The child'} MUST be clearly visible in this scene. `;
        if (userAvatarUrl) {
          fullPrompt += 'Match their appearance EXACTLY from the reference image.\n';
        } else {
          fullPrompt += 'Show them as a friendly child protagonist.\n';
        }
      }

      if (includePet) {
        fullPrompt += `- ${petName || 'The pet companion'} MUST be clearly visible in this scene. `;
        if (petAvatarUrl) {
          fullPrompt += 'Match their appearance EXACTLY from the reference image.\n';
        } else {
          fullPrompt += 'Show them as an adorable, friendly companion.\n';
        }
      }

      fullPrompt += '- Characters should be interacting with the scene appropriately.\n';
      fullPrompt += '- Maintain consistent character designs throughout.\n\n';
    }

    fullPrompt += `SCENE TO ILLUSTRATE:\n${prompt}`;

    // Add the text prompt
    parts.push({ text: fullPrompt });

    // Call Gemini API for image generation
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
      return res.status(500).json({ error: 'No image generated' });
    }

    const { mimeType, data: base64Data } = imagePart.inlineData;

    // Try to upload to Vercel Blob if available
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const blob = await put(`story-images/${segmentId}.png`, imageBuffer, {
          access: 'public',
          contentType: mimeType || 'image/png',
        });

        return res.status(200).json({
          imageUrl: blob.url,
          segmentId,
        });
      } catch (blobError) {
        console.error('Blob upload failed, falling back to data URL:', blobError);
      }
    }

    // Fallback to data URL if Blob storage not available
    const dataUrl = `data:${mimeType || 'image/png'};base64,${base64Data}`;

    return res.status(200).json({
      imageUrl: dataUrl,
      segmentId,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return res.status(500).json({ error: 'Failed to generate image' });
  }
}
