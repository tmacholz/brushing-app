import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent';

// ElevenLabs for name audio
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = '0z8S749Xe6jLCD34QXl1';

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

// World image generation
interface WorldImageRequest {
  type: 'worldImage';
  worldId: string;
  worldName: string;
  worldDescription: string;
  theme?: string;
}

async function handleWorldImage(req: WorldImageRequest, res: VercelResponse) {
  const { worldId, worldName, worldDescription, theme } = req;

  if (!worldId || !worldName || !worldDescription) {
    return res.status(400).json({ error: 'Missing required fields: worldId, worldName, worldDescription' });
  }

  // Determine the central image based on the theme/name
  const themeIconMap: Record<string, string> = {
    'magical-forest': 'a majestic glowing tree with magical sparkles',
    'space': 'a sleek futuristic spaceship with glowing engines',
    'underwater': 'a beautiful coral castle with swimming fish',
    'dinosaurs': 'a friendly dinosaur silhouette',
    'pirates': 'a pirate ship with billowing sails',
  };

  // Try to infer the theme from the world name/description if not explicitly set
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
    } else if (nameAndDesc.includes('cave') || nameAndDesc.includes('crystal') || nameAndDesc.includes('gem')) {
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
  return res.status(200).json({ imageUrl: result.url, worldId });
}

// Name audio generation (child or pet name TTS)
interface NameAudioRequest {
  type: 'nameAudio';
  name: string;
  nameType: 'child' | 'pet';
  id: string;
}

// Background music generation (can be for world or story)
interface BackgroundMusicRequest {
  type: 'backgroundMusic';
  worldId?: string;
  worldName?: string;
  worldDescription?: string;
  worldTheme?: string;
  // Legacy story-level fields (deprecated)
  storyId?: string;
  storyTitle?: string;
  storyDescription?: string;
}

async function handleNameAudio(req: NameAudioRequest, res: VercelResponse) {
  const { name, nameType, id } = req;

  console.log('handleNameAudio called with:', { name, nameType, id });

  if (!name || !nameType || !id) {
    console.log('Missing fields:', { name: !!name, nameType: !!nameType, id: !!id });
    return res.status(400).json({ error: 'Missing required fields: name, nameType, id' });
  }

  if (!ELEVENLABS_API_KEY) {
    console.log('ELEVENLABS_API_KEY not set');
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.log('BLOB_READ_WRITE_TOKEN not set');
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured' });
  }

  if (name.length > 50) {
    return res.status(400).json({ error: 'Name too long (max 50 characters)' });
  }

  try {
    console.log('Calling ElevenLabs API...');
    const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${DEFAULT_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: name,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log('ElevenLabs API error:', response.status, error);
      return res.status(500).json({ error: `ElevenLabs API error: ${error}` });
    }

    console.log('ElevenLabs API success, uploading to blob...');
    const audioBuffer = await response.arrayBuffer();
    const storagePath = nameType === 'child'
      ? `name-audio/children/${id}.mp3`
      : `name-audio/pets/${id}.mp3`;

    const blob = await put(storagePath, Buffer.from(audioBuffer), {
      access: 'public',
      contentType: 'audio/mpeg',
      allowOverwrite: true,
    });

    console.log('Blob upload success:', blob.url);
    return res.status(200).json({ audioUrl: blob.url, name, type: nameType, id });
  } catch (error) {
    console.error('handleNameAudio error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate name audio' });
  }
}

async function handleBackgroundMusic(req: BackgroundMusicRequest, res: VercelResponse) {
  const { worldId, worldName, worldDescription, worldTheme, storyId, storyTitle, storyDescription } = req;

  // Support both world-level and story-level (legacy) music generation
  const isWorldLevel = !!worldId;
  const id = worldId || storyId;
  const name = worldName || storyTitle;
  const description = worldDescription || storyDescription;

  console.log('handleBackgroundMusic called with:', { worldId, worldName, storyId, storyTitle, worldTheme });

  if (!id || !name) {
    return res.status(400).json({ error: 'Missing required fields: worldId/storyId, worldName/storyTitle' });
  }

  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured' });
  }

  try {
    // Generate prompt for instrumental music
    const musicPrompt = isWorldLevel
      ? `Gentle, whimsical instrumental background music for a children's story world.
World: ${name} - ${description || ''}
Theme: ${worldTheme || 'magical adventure'}
Style: Soft, enchanting, loopable background music suitable for ages 4-8. No vocals or lyrics.
Mood: Wonder, gentle excitement, cozy and safe feeling. Should work as ambient background for multiple stories.
Instruments: Light orchestral, soft piano, gentle strings, subtle chimes.`
      : `Gentle, whimsical instrumental music for a children's story.
Theme: ${worldTheme || 'magical adventure'}
Story: ${name} - ${description || ''}
Style: Soft, enchanting, suitable for ages 4-8. No vocals or lyrics.
Mood: Wonder, gentle excitement, cozy and safe feeling.
Instruments: Light orchestral, soft piano, gentle strings, subtle chimes.`;

    console.log('Calling ElevenLabs Music API...');
    const response = await fetch('https://api.elevenlabs.io/v1/music/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        prompt: musicPrompt,
        duration_seconds: 120, // 2 minutes
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs Music API error:', response.status, error);
      return res.status(500).json({ error: `ElevenLabs Music API error: ${error}` });
    }

    console.log('ElevenLabs Music API success, uploading to blob...');
    const audioBuffer = await response.arrayBuffer();
    const storagePath = isWorldLevel ? `world-music/${id}.mp3` : `story-music/${id}.mp3`;
    const blob = await put(storagePath, Buffer.from(audioBuffer), {
      access: 'public',
      contentType: 'audio/mpeg',
      allowOverwrite: true,
    });

    console.log('Music blob upload success:', blob.url);
    return res.status(200).json({
      musicUrl: blob.url,
      ...(isWorldLevel ? { worldId: id } : { storyId: id }),
    });
  } catch (error) {
    console.error('handleBackgroundMusic error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate background music' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.body;

  try {
    switch (type) {
      case 'image':
        if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
        return handleStoryImage(req.body, res);
      case 'userAvatar':
      case 'user': // backwards compatibility
        if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
        return handleUserAvatar({ ...req.body, type: 'userAvatar' }, res);
      case 'petAvatar':
      case 'pet': // backwards compatibility
        if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
        return handlePetAvatar({ ...req.body, type: 'petAvatar' }, res);
      case 'nameAudio':
        return handleNameAudio(req.body, res);
      case 'backgroundMusic':
        return handleBackgroundMusic(req.body, res);
      case 'worldImage':
        if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
        return handleWorldImage(req.body, res);
      default:
        return res.status(400).json({ error: 'Invalid type. Must be: image, userAvatar, petAvatar, nameAudio, backgroundMusic, or worldImage' });
    }
  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate' });
  }
}
