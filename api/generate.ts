import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

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
// Optional postProcess function to transform the image buffer before upload
async function generateAndUpload(
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>,
  storageKey: string,
  postProcess?: (buffer: Buffer) => Promise<Buffer>
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
  let imageBuffer = Buffer.from(base64Data, 'base64');

  // Apply post-processing if provided (e.g., background removal for sprites)
  if (postProcess) {
    imageBuffer = await postProcess(imageBuffer);
  }

  // Try to upload to Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(storageKey, imageBuffer, {
        access: 'public',
        contentType: 'image/png', // Always PNG after processing
        allowOverwrite: true,
      });
      return { url: blob.url, isDataUrl: false };
    } catch (blobError) {
      console.error('Blob upload failed, falling back to data URL:', blobError);
    }
  }

  // Fallback to data URL
  const finalBase64 = imageBuffer.toString('base64');
  return { url: `data:image/png;base64,${finalBase64}`, isDataUrl: true };
}

// Story Bible type for visual consistency
interface StoryBible {
  colorPalette?: string;
  lightingStyle?: string;
  artDirection?: string;
  keyLocations?: { name: string; visualDescription: string; mood: string }[];
  recurringCharacters?: { name: string; visualDescription: string; personality: string; role: string }[];
}

// Visual reference for consistent imagery
interface VisualReference {
  type: 'character' | 'object' | 'location';
  name: string;
  description: string;
  imageUrl: string;
}

// Visual asset from Story Bible
interface VisualAsset {
  id: string;
  name: string;
  description: string;
  mood?: string;
  personality?: string;
  role?: string;
  referenceImageUrl?: string;
  source?: 'bible' | 'extracted';
}

// Story image generation
interface StoryImageRequest {
  type: 'image';
  prompt?: string;                         // Optional manual override for scene description
  segmentText?: string;                    // The narrative text of the segment (used with storyboard)
  segmentId: string;
  referenceImageUrl?: string;
  userAvatarUrl?: string | null;
  petAvatarUrl?: string | null;
  includeUser?: boolean;
  includePet?: boolean;
  childName?: string;
  petName?: string;
  storyBible?: StoryBible & {              // Extended with visualAssets
    visualAssets?: {
      locations: VisualAsset[];
      characters: VisualAsset[];
      objects: VisualAsset[];
    };
  };
  visualReferences?: VisualReference[];    // Reference images for characters/objects/locations
  // Storyboard fields for intentional visual planning (name-based for display/backwards compat)
  storyboardLocation?: string | null;      // Location name
  storyboardCharacters?: string[] | null;  // NPC names
  storyboardShotType?: string | null;      // 'wide', 'medium', 'close-up', etc.
  storyboardCameraAngle?: string | null;   // 'eye-level', 'low-angle', etc.
  storyboardFocus?: string | null;         // What to emphasize visually
  storyboardExclude?: string[] | null;     // Elements to explicitly exclude
  // ID-based storyboard fields (preferred for lookups)
  storyboardLocationId?: string | null;    // visualAssets.locations[].id
  storyboardCharacterIds?: string[] | null; // visualAssets.characters[].id
}

async function handleStoryImage(req: StoryImageRequest, res: VercelResponse) {
  const {
    prompt, segmentText, segmentId, referenceImageUrl, userAvatarUrl, petAvatarUrl,
    includeUser, includePet, childName, petName, storyBible, visualReferences,
    storyboardLocation, storyboardCharacters, storyboardShotType, storyboardCameraAngle, storyboardFocus, storyboardExclude,
    storyboardLocationId, storyboardCharacterIds
  } = req;

  if (!segmentId) {
    return res.status(400).json({ error: 'Missing required field: segmentId' });
  }

  // Determine if we have storyboard data to build from
  const hasStoryboard = storyboardShotType || storyboardLocation || storyboardCameraAngle || storyboardFocus;

  // Using overlay system - child and pet will be composited separately
  const usingOverlaySystem = !includeUser && !includePet;

  // Helper to strip [CHILD] and [PET] placeholders from text (they're overlaid separately)
  const stripMainCharacters = (text: string): string => {
    return text
      .replace(/\[CHILD\]/g, 'the young hero')
      .replace(/\[PET\]/g, 'the companion');
  };

  // Build scene description: use manual prompt override, or build from storyboard + segment text
  let sceneDescription: string;
  if (prompt) {
    // Manual override takes precedence
    sceneDescription = usingOverlaySystem ? stripMainCharacters(prompt) : prompt;
  } else if (hasStoryboard && segmentText) {
    // Build from storyboard data - strip character names for overlay system
    const cleanText = usingOverlaySystem ? stripMainCharacters(segmentText) : segmentText;
    sceneDescription = `Scene context: ${cleanText}`;
    if (storyboardFocus) {
      const cleanFocus = usingOverlaySystem ? stripMainCharacters(storyboardFocus) : storyboardFocus;
      sceneDescription += `\n\nVisual emphasis: ${cleanFocus}`;
    }
  } else if (segmentText) {
    // Fallback to just segment text
    const cleanText = usingOverlaySystem ? stripMainCharacters(segmentText) : segmentText;
    sceneDescription = `Illustrate this scene: ${cleanText}`;
  } else {
    return res.status(400).json({ error: 'Missing scene data: provide prompt, or segmentText with storyboard data' });
  }

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  const referenceDescriptions: string[] = [];
  let imageIndex = 1;

  // Only add previous scene reference if NO storyboard data (legacy behavior)
  // With storyboard, we rely on Story Bible and references for consistency instead
  if (referenceImageUrl && !hasStoryboard) {
    const imageData = await fetchImageAsBase64(referenceImageUrl);
    if (imageData) {
      parts.push({ inlineData: imageData });
      referenceDescriptions.push(`[Image ${imageIndex}] Previous scene - use for style, color palette, and lighting consistency`);
      imageIndex++;
    }
  }

  // Add visual references (characters, objects, locations) for consistency
  // These are the reference sheets we generated - use them for exact appearance matching
  if (visualReferences && visualReferences.length > 0) {
    for (const ref of visualReferences) {
      const imageData = await fetchImageAsBase64(ref.imageUrl);
      if (imageData) {
        parts.push({ inlineData: imageData });
        const typeLabel = ref.type === 'character' ? 'CHARACTER REFERENCE SHEET' :
                         ref.type === 'location' ? 'LOCATION REFERENCE' : 'OBJECT REFERENCE SHEET';
        referenceDescriptions.push(
          `[Image ${imageIndex}] ${typeLabel} for "${ref.name}" - Match this ${ref.type}'s appearance EXACTLY`
        );
        imageIndex++;
      }
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

  // Add storyboard camera/composition instructions if provided
  if (hasStoryboard) {
    fullPrompt += '=== STORYBOARD DIRECTION ===\n';

    if (storyboardShotType) {
      const shotDescriptions: Record<string, string> = {
        'wide': 'WIDE SHOT - Show the full environment with characters small in frame. Establish the setting.',
        'medium': 'MEDIUM SHOT - Characters from waist up. Good balance of character and environment.',
        'close-up': 'CLOSE-UP - Focus on character face/upper body. Emotional, intimate framing.',
        'extreme-close-up': 'EXTREME CLOSE-UP - Tight focus on a specific detail (object, expression, hands).',
        'over-shoulder': 'OVER-SHOULDER SHOT - From behind one character, looking at another or at the scene.',
      };
      fullPrompt += `SHOT: ${shotDescriptions[storyboardShotType] || storyboardShotType}\n`;
    }

    if (storyboardCameraAngle) {
      const angleDescriptions: Record<string, string> = {
        'eye-level': 'EYE-LEVEL - Camera at subject height. Neutral, relatable perspective.',
        'low-angle': 'LOW-ANGLE - Camera looking UP at subject. Makes them appear powerful, heroic, larger.',
        'high-angle': 'HIGH-ANGLE - Camera looking DOWN at subject. Makes them appear small, vulnerable.',
        'birds-eye': 'BIRD\'S EYE - Directly from above. Shows geography, layout, patterns.',
        'worms-eye': 'WORM\'S EYE - From ground looking up. Dramatic, emphasizes scale.',
        'dutch-angle': 'DUTCH ANGLE - Tilted frame. Creates unease, tension, or dynamic action.',
      };
      fullPrompt += `ANGLE: ${angleDescriptions[storyboardCameraAngle] || storyboardCameraAngle}\n`;
    }

    if (storyboardFocus) {
      fullPrompt += `VISUAL FOCUS: ${storyboardFocus}\n`;
    }

    fullPrompt += '\n';
  }

  // Add Story Bible visual style (always include if provided)
  if (storyBible) {
    fullPrompt += '=== VISUAL STYLE GUIDE ===\n';
    if (storyBible.colorPalette) {
      fullPrompt += `Color Palette: ${storyBible.colorPalette}\n`;
    }
    if (storyBible.lightingStyle) {
      fullPrompt += `Lighting: ${storyBible.lightingStyle}\n`;
    }
    if (storyBible.artDirection) {
      fullPrompt += `Art Direction: ${storyBible.artDirection}\n`;
    }
    fullPrompt += '\n';

    // If storyboard specifies a location, look it up from visualAssets (by ID) or keyLocations (by name)
    const locations = storyBible.visualAssets?.locations || [];
    const hasVisualAssets = locations.length > 0;

    if (storyboardLocationId || storyboardLocation) {
      let matchingLocation: { name: string; description: string; mood?: string } | null = null;

      // Prefer ID-based lookup
      if (storyboardLocationId && hasVisualAssets) {
        const locById = locations.find(loc => loc.id === storyboardLocationId);
        if (locById) {
          matchingLocation = { name: locById.name, description: locById.description, mood: locById.mood };
        }
      }

      // Fall back to name-based lookup
      if (!matchingLocation && storyboardLocation) {
        // Try visualAssets first
        if (hasVisualAssets) {
          const locByName = locations.find(
            loc => loc.name.toLowerCase() === storyboardLocation.toLowerCase() ||
                   loc.name.toLowerCase().includes(storyboardLocation.toLowerCase()) ||
                   storyboardLocation.toLowerCase().includes(loc.name.toLowerCase())
          );
          if (locByName) {
            matchingLocation = { name: locByName.name, description: locByName.description, mood: locByName.mood };
          }
        }
        // Then try deprecated keyLocations
        if (!matchingLocation && storyBible.keyLocations) {
          const locLegacy = storyBible.keyLocations.find(
            loc => loc.name.toLowerCase() === storyboardLocation.toLowerCase()
          );
          if (locLegacy) {
            matchingLocation = { name: locLegacy.name, description: locLegacy.visualDescription, mood: locLegacy.mood };
          }
        }
      }

      if (matchingLocation) {
        fullPrompt += `=== LOCATION: ${matchingLocation.name} ===\n`;
        fullPrompt += `${matchingLocation.description}\n`;
        if (matchingLocation.mood) {
          fullPrompt += `Mood: ${matchingLocation.mood}\n`;
        }
        fullPrompt += '\n';
      }
    }

    // If storyboard specifies characters, look them up from visualAssets (by ID) or recurringCharacters (by name)
    const characters = storyBible.visualAssets?.characters || [];

    if ((storyboardCharacterIds && storyboardCharacterIds.length > 0) ||
        (storyboardCharacters && storyboardCharacters.length > 0)) {
      const charactersToInclude: { name: string; description: string }[] = [];

      // Prefer ID-based lookup
      if (storyboardCharacterIds && storyboardCharacterIds.length > 0 && characters.length > 0) {
        for (const charId of storyboardCharacterIds) {
          const charById = characters.find(c => c.id === charId);
          if (charById) {
            charactersToInclude.push({ name: charById.name, description: charById.description });
          }
        }
      }

      // If no ID matches, fall back to name-based lookup
      if (charactersToInclude.length === 0 && storyboardCharacters && storyboardCharacters.length > 0) {
        // Try visualAssets first
        if (characters.length > 0) {
          for (const charName of storyboardCharacters) {
            const charByName = characters.find(c =>
              c.name.toLowerCase().includes(charName.toLowerCase()) ||
              charName.toLowerCase().includes(c.name.toLowerCase())
            );
            if (charByName && !charactersToInclude.some(c => c.name === charByName.name)) {
              charactersToInclude.push({ name: charByName.name, description: charByName.description });
            }
          }
        }
        // Then try deprecated recurringCharacters
        if (charactersToInclude.length === 0 && storyBible.recurringCharacters) {
          const legacyChars = storyBible.recurringCharacters.filter(char =>
            storyboardCharacters.some(name =>
              char.name.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(char.name.toLowerCase())
            )
          );
          for (const char of legacyChars) {
            charactersToInclude.push({ name: char.name, description: char.visualDescription });
          }
        }
      }

      if (charactersToInclude.length > 0) {
        fullPrompt += '=== CHARACTERS IN THIS SCENE ===\n';
        charactersToInclude.forEach(char => {
          fullPrompt += `${char.name}: ${char.description}\n`;
        });
        fullPrompt += '\n';
      }
    } else if (!hasStoryboard && storyBible.recurringCharacters && storyBible.recurringCharacters.length > 0) {
      // Legacy behavior: include all characters if no storyboard
      fullPrompt += 'RECURRING CHARACTERS (if they appear, use these exact descriptions):\n';
      storyBible.recurringCharacters.forEach(char => {
        fullPrompt += `- ${char.name}: ${char.visualDescription}\n`;
      });
      fullPrompt += '\n';
    }
  }

  if (referenceDescriptions.length > 0) {
    fullPrompt += '=== REFERENCE IMAGES ===\n' + referenceDescriptions.join('\n') + '\n\n';
  }

  if (includeUser || includePet) {
    fullPrompt += '=== MAIN CHARACTERS ===\n';
    if (includeUser) {
      fullPrompt += `${childName || 'The child'} MUST be clearly visible. `;
      fullPrompt += userAvatarUrl ? 'Match their appearance EXACTLY from the reference image.\n' : 'Show them as a friendly child protagonist.\n';
    }
    if (includePet) {
      fullPrompt += `${petName || 'The pet companion'} MUST be clearly visible. `;
      fullPrompt += petAvatarUrl ? 'Match their appearance EXACTLY from the reference image.\n' : 'Show them as an adorable, friendly companion.\n';
    }
    fullPrompt += '\n';
  }

  // Add exclusions (negative prompt)
  const hasExclusions = (storyboardExclude && storyboardExclude.length > 0) || usingOverlaySystem;
  if (hasExclusions) {
    fullPrompt += '=== DO NOT INCLUDE ===\n';
    fullPrompt += 'The following elements must NOT appear in this image:\n';

    // When using overlay system, explicitly exclude child and pet characters
    if (usingOverlaySystem) {
      fullPrompt += '- NO children or child characters (they will be added as a separate overlay)\n';
      fullPrompt += '- NO pets, animal companions, or sidekick creatures (they will be added as a separate overlay)\n';
      fullPrompt += '- This is a BACKGROUND ONLY image - show only the environment, setting, and any NPCs\n';
    }

    if (storyboardExclude && storyboardExclude.length > 0) {
      storyboardExclude.forEach(item => {
        fullPrompt += `- NO ${item}\n`;
      });
    }
    fullPrompt += '\n';
  }

  fullPrompt += `=== SCENE DESCRIPTION ===\n${sceneDescription}`;
  parts.push({ text: fullPrompt });

  // Include timestamp in filename for reliable cache busting (CDN may ignore query params)
  const timestamp = Date.now();
  const result = await generateAndUpload(parts, `story-images/${segmentId}-${timestamp}.png`);
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

// Segment audio generation (TTS with name placeholders)
interface SegmentAudioRequest {
  type: 'segmentAudio';
  segmentId: string;
  text: string;
  storyId: string;
  chapterNumber: number;
  segmentOrder: number;
}

// Chapter audio generation (recap, cliffhanger, teaser)
interface ChapterAudioRequest {
  type: 'chapterAudio';
  chapterId: string;
  text: string;
  storyId: string;
  chapterNumber: number;
  fieldName: 'recap' | 'cliffhanger' | 'teaser';
}

type NarrationSequenceItem =
  | { type: 'audio'; url: string }
  | { type: 'name'; placeholder: 'CHILD' | 'PET' };

/**
 * Parse segment text and split into parts at [CHILD] and [PET] placeholders.
 */
function parseTextIntoParts(text: string): Array<{ type: 'text'; content: string } | { type: 'placeholder'; name: 'CHILD' | 'PET' }> {
  const parts: Array<{ type: 'text'; content: string } | { type: 'placeholder'; name: 'CHILD' | 'PET' }> = [];
  const regex = /\[(CHILD|PET)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const content = text.slice(lastIndex, match.index);
      if (content.trim()) {
        parts.push({ type: 'text', content });
      }
    }
    parts.push({ type: 'placeholder', name: match[1] as 'CHILD' | 'PET' });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const content = text.slice(lastIndex);
    if (content.trim()) {
      parts.push({ type: 'text', content });
    }
  }

  return parts;
}

/**
 * Generate TTS audio for a single text clip
 */
async function generateTtsClip(text: string): Promise<ArrayBuffer> {
  const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${DEFAULT_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY!,
    },
    body: JSON.stringify({
      text,
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
    throw new Error(`ElevenLabs API error: ${error}`);
  }

  return response.arrayBuffer();
}

async function handleSegmentAudio(req: SegmentAudioRequest, res: VercelResponse) {
  const { segmentId, text, storyId, chapterNumber, segmentOrder } = req;

  if (!segmentId || !text || !storyId) {
    return res.status(400).json({ error: 'Missing required fields: segmentId, text, storyId' });
  }

  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured' });
  }

  try {
    const parts = parseTextIntoParts(text);
    console.log(`[AudioGen] Segment ${segmentId}: ${parts.length} parts to process`);

    const narrationSequence: NarrationSequenceItem[] = [];
    let clipIndex = 0;

    for (const part of parts) {
      if (part.type === 'placeholder') {
        narrationSequence.push({ type: 'name', placeholder: part.name });
      } else {
        console.log(`[AudioGen] Generating clip ${clipIndex} for: "${part.content.substring(0, 50)}..."`);

        const audioBuffer = await generateTtsClip(part.content);

        const storagePath = `story-audio/${storyId}/ch${chapterNumber}/seg${segmentOrder}/clip${clipIndex}.mp3`;
        const blob = await put(storagePath, Buffer.from(audioBuffer), {
          access: 'public',
          contentType: 'audio/mpeg',
          allowOverwrite: true,
        });

        narrationSequence.push({ type: 'audio', url: blob.url });
        clipIndex++;
      }
    }

    console.log(`[AudioGen] Segment ${segmentId}: Generated ${clipIndex} clips, sequence length: ${narrationSequence.length}`);

    return res.status(200).json({
      narrationSequence,
      segmentId,
      clipCount: clipIndex,
    });
  } catch (error) {
    console.error('Segment audio generation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate segment audio'
    });
  }
}

async function handleChapterAudio(req: ChapterAudioRequest, res: VercelResponse) {
  const { chapterId, text, storyId, chapterNumber, fieldName } = req;

  if (!chapterId || !text || !storyId || !fieldName) {
    return res.status(400).json({ error: 'Missing required fields: chapterId, text, storyId, fieldName' });
  }

  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured' });
  }

  try {
    const parts = parseTextIntoParts(text);
    console.log(`[AudioGen] Chapter ${chapterId} ${fieldName}: ${parts.length} parts to process`);

    const narrationSequence: NarrationSequenceItem[] = [];
    let clipIndex = 0;

    for (const part of parts) {
      if (part.type === 'placeholder') {
        narrationSequence.push({ type: 'name', placeholder: part.name });
      } else {
        console.log(`[AudioGen] Generating clip ${clipIndex} for: "${part.content.substring(0, 50)}..."`);

        const audioBuffer = await generateTtsClip(part.content);

        const storagePath = `story-audio/${storyId}/ch${chapterNumber}/${fieldName}/clip${clipIndex}.mp3`;
        const blob = await put(storagePath, Buffer.from(audioBuffer), {
          access: 'public',
          contentType: 'audio/mpeg',
          allowOverwrite: true,
        });

        narrationSequence.push({ type: 'audio', url: blob.url });
        clipIndex++;
      }
    }

    console.log(`[AudioGen] Chapter ${chapterId} ${fieldName}: Generated ${clipIndex} clips, sequence length: ${narrationSequence.length}`);

    return res.status(200).json({
      narrationSequence,
      chapterId,
      fieldName,
      clipCount: clipIndex,
    });
  } catch (error) {
    console.error('Chapter audio generation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate chapter audio'
    });
  }
}

// Story reference image generation (for visual consistency)
interface ReferenceImageRequest {
  type: 'referenceImage';
  referenceId: string;
  referenceType: 'character' | 'object' | 'location';
  name: string;
  description: string;
  storyBible?: StoryBible;
}

async function handleReferenceImage(req: ReferenceImageRequest, res: VercelResponse) {
  const { referenceId, referenceType, name, description, storyBible } = req;

  if (!referenceId || !referenceType || !name || !description) {
    return res.status(400).json({ error: 'Missing required fields: referenceId, referenceType, name, description' });
  }

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  // Build the prompt based on reference type
  let fullPrompt = STYLE_PREFIX + '\n\n';

  // Add Story Bible visual guidelines if provided
  if (storyBible) {
    fullPrompt += 'STORY VISUAL STYLE GUIDE (maintain consistency):\n';
    if (storyBible.colorPalette) {
      fullPrompt += `- Color Palette: ${storyBible.colorPalette}\n`;
    }
    if (storyBible.lightingStyle) {
      fullPrompt += `- Lighting: ${storyBible.lightingStyle}\n`;
    }
    if (storyBible.artDirection) {
      fullPrompt += `- Art Direction: ${storyBible.artDirection}\n`;
    }
    fullPrompt += '\n';
  }

  if (referenceType === 'character') {
    // Generate a character reference sheet with multiple views
    fullPrompt += `CREATE A CHARACTER REFERENCE SHEET for: "${name}"

CHARACTER DESCRIPTION:
${description}

REQUIREMENTS:
- Create a CHARACTER REFERENCE SHEET with FOUR views arranged in a 2x2 grid:
  - Top left: FRONT view (full body, facing camera)
  - Top right: SIDE view (full body, profile facing right)
  - Bottom left: BACK view (full body, facing away)
  - Bottom right: HEADSHOT (close-up of face/head, showing expression and details)
- Maintain EXACT consistency in design, colors, proportions, and details across all views
- The character should be on a simple, clean background (light gray or white gradient)
- Include subtle labels below/beside each view: "FRONT", "SIDE", "BACK", "HEADSHOT"
- The style should be suitable for children's book illustration
- Make the character expressive, friendly, and appealing to children ages 4-8
- Ensure the design is clear enough to be used as a reference for future illustrations

CRITICAL - NO TEXT except the view labels:
- Do NOT include the character's name in the image
- Do NOT include any other text, captions, or watermarks
- Only include the small view labels (FRONT, SIDE, BACK, HEADSHOT)`;
  } else if (referenceType === 'location') {
    // Generate a single establishing shot of the location
    fullPrompt += `CREATE A LOCATION REFERENCE IMAGE for: "${name}"

LOCATION DESCRIPTION:
${description}

REQUIREMENTS:
- Create a beautiful, detailed establishing shot of this location
- The image should capture the key features, atmosphere, and mood described
- Use the story's color palette and lighting style for consistency
- The scene should feel inviting and suitable for a children's adventure story
- Include enough detail that this image can be used as a reference for scenes set in this location
- No characters should appear in this image - just the environment
- The composition should showcase the most distinctive elements of the location

CRITICAL - NO TEXT:
- Do NOT include ANY text, labels, signs, or writing in the image
- The image should be PURELY environmental artwork`;
  } else {
    // Object reference - multiple views for consistency
    fullPrompt += `CREATE AN OBJECT REFERENCE SHEET for: "${name}"

OBJECT DESCRIPTION:
${description}

REQUIREMENTS:
- Create an OBJECT REFERENCE SHEET with THREE views arranged in a row:
  - Left: FRONT view (facing camera directly)
  - Center: SIDE view (profile, facing right)
  - Right: BACK view (facing away from camera)
- Maintain EXACT consistency in design, colors, proportions, and details across all views
- The object should be on a simple, clean background (light gray or white gradient)
- Include subtle labels below each view: "FRONT", "SIDE", "BACK"
- The style should match children's book illustration - friendly and appealing
- Add subtle magical sparkles or glow if the object is magical/enchanted
- Ensure the design is clear enough to be used as a reference for future illustrations

CRITICAL - NO TEXT except the view labels:
- Do NOT include the object's name in the image
- Do NOT include any other text, captions, or watermarks
- Only include the small view labels (FRONT, SIDE, BACK)`;
  }

  parts.push({ text: fullPrompt });

  // Include timestamp in filename for reliable cache busting
  const timestamp = Date.now();
  const result = await generateAndUpload(parts, `story-references/${referenceId}-${timestamp}.png`);
  return res.status(200).json({ imageUrl: result.url, referenceId });
}

// Cover image generation for stories
interface CoverImageRequest {
  type: 'coverImage';
  storyId: string;
  storyTitle: string;
  storyDescription: string;
  referenceImageUrls?: string[]; // Existing segment images for style reference
  storyBible?: StoryBible;
}

async function handleCoverImage(req: CoverImageRequest, res: VercelResponse) {
  const { storyId, storyTitle, storyDescription, referenceImageUrls, storyBible } = req;

  if (!storyId || !storyTitle) {
    return res.status(400).json({ error: 'Missing required fields: storyId, storyTitle' });
  }

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  const referenceDescriptions: string[] = [];
  let imageIndex = 1;

  // Add reference images from existing segments (up to 3 for style consistency)
  if (referenceImageUrls && referenceImageUrls.length > 0) {
    const imagesToUse = referenceImageUrls.slice(0, 3);
    for (const url of imagesToUse) {
      const imageData = await fetchImageAsBase64(url);
      if (imageData) {
        parts.push({ inlineData: imageData });
        referenceDescriptions.push(`[Image ${imageIndex}] Existing story scene - use for style, color palette, and character appearance consistency`);
        imageIndex++;
      }
    }
  }

  // Build the cover image prompt
  let fullPrompt = STYLE_PREFIX + '\n\n';

  // Add Story Bible visual guidelines if provided
  if (storyBible) {
    fullPrompt += 'STORY VISUAL STYLE GUIDE (maintain consistency):\n';
    if (storyBible.colorPalette) {
      fullPrompt += `- Color Palette: ${storyBible.colorPalette}\n`;
    }
    if (storyBible.lightingStyle) {
      fullPrompt += `- Lighting: ${storyBible.lightingStyle}\n`;
    }
    if (storyBible.artDirection) {
      fullPrompt += `- Art Direction: ${storyBible.artDirection}\n`;
    }
    fullPrompt += '\n';
  }

  if (referenceDescriptions.length > 0) {
    fullPrompt += 'REFERENCE IMAGES PROVIDED (match this art style EXACTLY):\n' + referenceDescriptions.join('\n') + '\n\n';
  }

  fullPrompt += `CREATE A STORY COVER IMAGE:

Story Title: "${storyTitle}"
Story Description: ${storyDescription || 'A magical adventure story'}

REQUIREMENTS:
- Create an eye-catching cover illustration that captures the story's essence
- The composition should be PORTRAIT oriented, suitable for a book cover
- Feature a dramatic or intriguing scene that hints at the adventure
- Include space at the top for the title (but DO NOT include any text in the image)
- Use vibrant, appealing colors that match the story's theme
- The image should make children excited to read the story
- Maintain the children's book illustration style from the reference images
- Create a sense of wonder and adventure

CRITICAL - NO TEXT:
- Do NOT include ANY text, letters, words, or typography in the image
- Do NOT write the title on the image
- Do NOT include any labels, captions, or watermarks
- The image should be PURELY illustrative with no written elements whatsoever
- Text will be added separately by the app - generate only artwork`;

  parts.push({ text: fullPrompt });

  // Include timestamp in filename for reliable cache busting
  const timestamp = Date.now();
  const result = await generateAndUpload(parts, `story-covers/${storyId}-${timestamp}.png`);
  return res.status(200).json({ coverImageUrl: result.url, storyId });
}

// Character portrait generation (for circle overlay compositing)
interface SpriteGenerationRequest {
  type: 'sprite';
  ownerType: 'child' | 'pet';
  ownerId: string;
  poseKey: string;  // Now represents expression: happy, sad, surprised, worried, determined, excited
  sourceAvatarUrl: string;
  posePrompt: string;  // Expression description
}

// Style prefix for portrait generation (white background for removal, will be circle-masked in UI)
const PORTRAIT_STYLE = `Children's book illustration style, soft watercolor and digital art hybrid,
PURE WHITE #FFFFFF BACKGROUND (critical - solid white background, no gradients or shadows),
PORTRAIT SHOT - shoulders up, head and upper chest only, NO full body,
centered face with clear expressive features, Studio Ghibli inspired soft aesthetic,
warm inviting colors, friendly approachable character design,
clean sharp edges suitable for circle masking.`;

async function handleSpriteGeneration(req: SpriteGenerationRequest, res: VercelResponse) {
  const { ownerType, ownerId, poseKey, sourceAvatarUrl, posePrompt } = req;

  if (!ownerType || !ownerId || !poseKey || !sourceAvatarUrl || !posePrompt) {
    return res.status(400).json({
      error: 'Missing required fields: ownerType, ownerId, poseKey, sourceAvatarUrl, posePrompt',
    });
  }

  // Fetch the source avatar image
  const avatarData = await fetchImageAsBase64(sourceAvatarUrl);
  if (!avatarData) {
    return res.status(400).json({ error: 'Failed to fetch source avatar image' });
  }

  // Build the prompt for portrait generation
  const prompt = `${PORTRAIT_STYLE}

REFERENCE CHARACTER IMAGE PROVIDED:
[Image 1] This is the character's established appearance. You MUST match their features EXACTLY.

EXPRESSION TO CREATE:
${posePrompt}

CRITICAL REQUIREMENTS:
- The character must match the reference image EXACTLY in terms of:
  - Face shape, features, and expression style
  - Hair color, style, and design
  - Skin tone and overall coloring
  - Any distinctive features (ears, horns, etc. for pets)
- Create a PORTRAIT showing HEAD AND SHOULDERS ONLY (no full body!)
- The facial expression should clearly convey: ${posePrompt}
- The background MUST be pure white #FFFFFF (solid white, no gradients)
- Square composition, character centered
- Face should be the focal point, expressive and clear
- Clean edges suitable for circle mask overlay
- Maintain the whimsical children's book illustration style
- No text, labels, or watermarks`;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { inlineData: avatarData },
    { text: prompt },
  ];

  // Include timestamp in filename for reliable cache busting
  const timestamp = Date.now();
  const storageKey = `sprites/${ownerType}/${ownerId}/${poseKey}-${timestamp}.png`;
  const result = await generateAndUpload(parts, storageKey);

  return res.status(200).json({
    spriteUrl: result.url,
    ownerType,
    ownerId,
    poseKey,
    ...(result.isDataUrl && { warning: 'Using data URL fallback' }),
  });
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
      case 'sprite':
        if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
        return handleSpriteGeneration(req.body, res);
      case 'segmentAudio':
        return handleSegmentAudio(req.body, res);
      case 'chapterAudio':
        return handleChapterAudio(req.body, res);
      case 'coverImage':
        if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
        return handleCoverImage(req.body, res);
      case 'referenceImage':
        if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
        return handleReferenceImage(req.body, res);
      default:
        return res.status(400).json({ error: 'Invalid type. Must be: image, userAvatar, petAvatar, nameAudio, backgroundMusic, worldImage, sprite, segmentAudio, chapterAudio, coverImage, or referenceImage' });
    }
  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate' });
  }
}
