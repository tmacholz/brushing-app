import { put } from '@vercel/blob';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent';

// Consistent style prefix for all images
const STYLE_PREFIX = `Children's book illustration style, soft watercolor and digital art hybrid,
warm and inviting colors, gentle lighting, whimsical and magical atmosphere,
suitable for ages 4-8, no text in image, dreamlike quality,
Studio Ghibli inspired soft aesthetic, rounded friendly shapes,
pastel color palette with vibrant accents.`;

// Helper to call Gemini API and upload result
async function generateAndUpload(
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>,
  storageKey: string
): Promise<{ url: string; isDataUrl: boolean }> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

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
        allowOverwrite: true,
      });
      return { url: blob.url, isDataUrl: false };
    } catch (blobError) {
      console.error('Blob upload failed, falling back to data URL:', blobError);
    }
  }

  // Fallback to data URL
  return { url: `data:${mimeType || 'image/png'};base64,${base64Data}`, isDataUrl: true };
}

// Theme to icon mapping
const themeIconMap: Record<string, string> = {
  'magical-forest': 'a majestic glowing tree with magical sparkles',
  'space': 'a sleek futuristic spaceship with glowing engines',
  'underwater': 'a beautiful coral castle with swimming fish',
  'dinosaurs': 'a friendly dinosaur silhouette',
  'pirates': 'a pirate ship with billowing sails',
};

/**
 * Generate a world image directly (without HTTP request)
 * Returns the URL of the generated image
 */
export async function generateWorldImageDirect(
  worldId: string,
  worldName: string,
  worldDescription: string,
  theme?: string
): Promise<string> {
  // Determine the central image based on the theme/name
  let centralImage = 'a magical glowing symbol representing the theme';

  if (theme && themeIconMap[theme]) {
    centralImage = themeIconMap[theme];
  } else {
    // Try to match based on world name/description
    const nameAndDesc = `${worldName} ${worldDescription}`.toLowerCase();
    if (nameAndDesc.includes('forest') || nameAndDesc.includes('tree') || nameAndDesc.includes('magic')) {
      centralImage = themeIconMap['magical-forest'];
    } else if (nameAndDesc.includes('space') || nameAndDesc.includes('star') || nameAndDesc.includes('galaxy') || nameAndDesc.includes('rocket')) {
      centralImage = themeIconMap['space'];
    } else if (nameAndDesc.includes('underwater') || nameAndDesc.includes('ocean') || nameAndDesc.includes('sea') || nameAndDesc.includes('fish')) {
      centralImage = themeIconMap['underwater'];
    } else if (nameAndDesc.includes('dinosaur') || nameAndDesc.includes('dino') || nameAndDesc.includes('prehistoric')) {
      centralImage = themeIconMap['dinosaurs'];
    } else if (nameAndDesc.includes('pirate') || nameAndDesc.includes('ship') || nameAndDesc.includes('treasure')) {
      centralImage = themeIconMap['pirates'];
    } else if (nameAndDesc.includes('castle') || nameAndDesc.includes('kingdom')) {
      centralImage = 'a majestic castle with towers and flags';
    } else if (nameAndDesc.includes('dragon')) {
      centralImage = 'a friendly dragon curled around a glowing crystal';
    } else if (nameAndDesc.includes('fairy') || nameAndDesc.includes('pixie')) {
      centralImage = 'sparkling fairy wings with magical dust';
    } else if (nameAndDesc.includes('robot') || nameAndDesc.includes('machine')) {
      centralImage = 'a friendly robot with glowing eyes';
    } else if (nameAndDesc.includes('candy') || nameAndDesc.includes('sweet')) {
      centralImage = 'colorful candy swirls and lollipops';
    } else if (nameAndDesc.includes('cloud') || nameAndDesc.includes('sky')) {
      centralImage = 'fluffy clouds with a rainbow';
    } else if (nameAndDesc.includes('cave') || nameAndDesc.includes('crystal') || nameAndDesc.includes('gem') || nameAndDesc.includes('grotto')) {
      centralImage = 'glowing crystals and gems';
    } else if (nameAndDesc.includes('jungle') || nameAndDesc.includes('safari')) {
      centralImage = 'tropical leaves with exotic birds';
    } else if (nameAndDesc.includes('snow') || nameAndDesc.includes('ice') || nameAndDesc.includes('winter')) {
      centralImage = 'sparkling snowflakes and icicles';
    }
  }

  const prompt = `${STYLE_PREFIX}

Create a circular planet-like world icon for a children's app. This represents "${worldName}" - ${worldDescription}.

REQUIREMENTS:
- The image should look like a floating spherical planet viewed from space
- The planet should have a gentle 3D spherical appearance with soft lighting from the top-left
- In the CENTER of the planet, feature: ${centralImage}
- The planet surface should have colors and textures that match the theme
- Add a soft glowing aura around the planet
- The background should be transparent or a very dark space-like gradient
- Style should be whimsical, magical, and appealing to children ages 4-8
- The planet should feel like a portal to an adventure world
- Use vibrant but soft colors
- NO text or labels in the image
- The central icon should be clearly visible and recognizable
- Add subtle sparkles or magical particles around the planet`;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];

  const result = await generateAndUpload(parts, `world-images/${worldId}.png`);
  return result.url;
}
