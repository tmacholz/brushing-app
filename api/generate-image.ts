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
pastel color palette with vibrant accents. Scene: `;

interface GenerateImageRequest {
  prompt: string;
  segmentId: string;
  referenceImageUrl?: string; // Previous image for style/character consistency
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const { prompt, segmentId, referenceImageUrl } = req.body as GenerateImageRequest;

  if (!prompt || !segmentId) {
    return res.status(400).json({ error: 'Missing required fields: prompt, segmentId' });
  }

  try {
    // Build the prompt with style consistency instructions
    let fullPrompt = `${STYLE_PREFIX}${prompt}`;

    // Build the parts array for the request
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    // If we have a reference image, fetch it and add consistency instructions
    if (referenceImageUrl) {
      try {
        // Fetch the reference image
        const imageResponse = await fetch(referenceImageUrl);
        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer();
          const base64Image = Buffer.from(imageBuffer).toString('base64');
          const mimeType = imageResponse.headers.get('content-type') || 'image/png';

          // Add reference image first
          parts.push({
            inlineData: {
              mimeType,
              data: base64Image,
            },
          });

          // Add consistency instruction
          fullPrompt = `Using the attached image as a style reference: match the exact art style, color palette, lighting, and line quality. Keep the same exact character designs, proportions, and visual appearance for any characters that appear. Maintain complete visual consistency. New scene: ${fullPrompt}`;
        }
      } catch (refError) {
        console.error('Failed to fetch reference image:', refError);
        // Continue without reference image
      }
    }

    // Add the text prompt
    parts.push({ text: fullPrompt });

    // Call Gemini API for image generation
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts,
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: '16:9',
          },
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
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part: { inlineData?: { mimeType: string; data: string } }) => part.inlineData);

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
