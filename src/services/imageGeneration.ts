import type { StoryArc, StorySegment, StoryBible, StoryReference, Child, Pet } from '../types';
import { getCharacterById } from '../data/characters';

interface GenerateImageResult {
  imageUrl: string;
  segmentId: string;
}

interface CharacterContext {
  childName: string;
  petName: string;
  userAvatarUrl: string | null;
  petAvatarUrl: string | null;
}

// Visual reference for consistent imagery (matches API interface)
interface VisualReference {
  id?: string;
  type: 'character' | 'object' | 'location';
  name: string;
  description: string;
  imageUrl: string;
}

// Detect if characters should appear in a segment based on text content
function detectCharacterPresence(
  segmentText: string,
  childName: string,
  petName: string
): { includeUser: boolean; includePet: boolean } {
  const text = segmentText.toLowerCase();
  const childNameLower = childName.toLowerCase();
  const petNameLower = petName.toLowerCase();

  // Check if child is mentioned (by name or common pronouns in context)
  const includeUser =
    text.includes(childNameLower) ||
    text.includes('[child]') || // In case placeholders weren't replaced
    // Common patterns that suggest the child is in the scene
    text.includes('they walked') ||
    text.includes('they looked') ||
    text.includes('they saw') ||
    text.includes('their eyes');

  // Check if pet is mentioned
  const includePet =
    text.includes(petNameLower) ||
    text.includes('[pet]'); // In case placeholders weren't replaced

  return { includeUser, includePet };
}

// Build visualReferences array from segment's storyboard tags using story_references
function buildVisualReferences(
  segment: StorySegment,
  storyReferences?: StoryReference[]
): VisualReference[] {
  const result: VisualReference[] = [];
  const includedIds = new Set<string>();

  // Look up a storyboard ID in story_references by UUID
  const lookupId = (id: string, assetType: 'location' | 'character' | 'object') => {
    if (includedIds.has(id)) return;

    if (storyReferences && storyReferences.length > 0) {
      const ref = storyReferences.find(r => r.id === id);
      if (ref?.imageUrl) {
        result.push({ id: ref.id, type: assetType, name: ref.name, description: ref.description, imageUrl: ref.imageUrl });
        includedIds.add(id);
      }
    }
  };

  // Add location reference if tagged
  if (segment.storyboardLocationId) {
    lookupId(segment.storyboardLocationId, 'location');
  }

  // Add character references if tagged
  if (segment.storyboardCharacterIds) {
    for (const charId of segment.storyboardCharacterIds) {
      lookupId(charId, 'character');
    }
  }

  // Add object references if tagged
  if (segment.storyboardObjectIds) {
    for (const objId of segment.storyboardObjectIds) {
      lookupId(objId, 'object');
    }
  }

  return result;
}

export async function generateImageForSegment(
  segment: StorySegment,
  referenceImageUrl?: string,
  characterContext?: CharacterContext,
  storyBible?: StoryBible | null,
  storyReferences?: StoryReference[]
): Promise<GenerateImageResult | null> {
  // Check if segment has image prompt or storyboard data
  const hasStoryboard = !!(segment.storyboardShotType || segment.storyboardLocationId || segment.storyboardFocus);

  if (!segment.imagePrompt && !hasStoryboard) {
    console.log('[ImageGen] Segment has no imagePrompt or storyboard, skipping:', segment.id);
    return null;
  }
  console.log('[ImageGen] Starting image generation for segment:', segment.id);

  // Detect if characters should be in this scene
  let includeUser = false;
  let includePet = false;
  let childName: string | undefined;
  let petName: string | undefined;
  let userAvatarUrl: string | null | undefined;
  let petAvatarUrl: string | null | undefined;

  if (characterContext) {
    const presence = detectCharacterPresence(
      segment.text,
      characterContext.childName,
      characterContext.petName
    );
    includeUser = presence.includeUser;
    includePet = presence.includePet;
    childName = characterContext.childName;
    petName = characterContext.petName;
    userAvatarUrl = characterContext.userAvatarUrl;
    petAvatarUrl = characterContext.petAvatarUrl;
  }

  // Build visual references from storyboard tags
  const visualReferences = buildVisualReferences(segment, storyReferences);
  console.log('[ImageGen] Visual references:', visualReferences.length, 'items');

  try {
    console.log('[ImageGen] Calling /api/generate for segment:', segment.id);
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'image',
        prompt: segment.imagePrompt,
        segmentText: segment.text,
        segmentId: segment.id,
        referenceImageUrl,
        userAvatarUrl,
        petAvatarUrl,
        includeUser,
        includePet,
        childName,
        petName,
        // Story Bible for visual style consistency
        storyBible: storyBible ? {
          colorPalette: storyBible.colorPalette,
          lightingStyle: storyBible.lightingStyle,
          artDirection: storyBible.artDirection,
        } : undefined,
        // Visual references (character/location/object images)
        visualReferences: visualReferences.length > 0 ? visualReferences : undefined,
        // Storyboard data
        storyboardLocationId: segment.storyboardLocationId,
        storyboardCharacterIds: segment.storyboardCharacterIds,
        storyboardObjectIds: segment.storyboardObjectIds,
        storyboardShotType: segment.storyboardShotType,
        storyboardCameraAngle: segment.storyboardCameraAngle,
        storyboardFocus: segment.storyboardFocus,
        storyboardExclude: segment.storyboardExclude,
      }),
    });

    console.log('[ImageGen] Response status:', response.status, 'for segment:', segment.id);

    if (!response.ok) {
      const error = await response.text();
      console.error(`[ImageGen] Failed for segment ${segment.id}:`, error);
      return null;
    }

    const result = await response.json();
    console.log('[ImageGen] Success for segment:', segment.id);
    return result;
  } catch (error) {
    console.error(`[ImageGen] Error for segment ${segment.id}:`, error);
    return null;
  }
}

export interface ImageGenerationProgress {
  total: number;
  completed: number;
  currentSegment: string | null;
}

export async function generateImagesForStory(
  storyArc: StoryArc,
  onProgress?: (progress: ImageGenerationProgress) => void,
  child?: Child | null,
  pet?: Pet | null
): Promise<Map<string, string>> {
  const imageUrlMap = new Map<string, string>();

  // Build character context if we have child and pet data
  const character = child ? getCharacterById(child.characterId) : undefined;
  const characterContext: CharacterContext | undefined =
    child && pet
      ? {
          childName: child.name,
          petName: pet.displayName,
          userAvatarUrl: character?.avatarUrl ?? null,
          petAvatarUrl: pet.avatarUrl,
        }
      : undefined;

  // Collect all segments that need images
  const segmentsToGenerate: StorySegment[] = [];
  for (const chapter of storyArc.chapters) {
    for (const segment of chapter.segments) {
      const hasStoryboard = !!(segment.storyboardShotType || segment.storyboardLocationId || segment.storyboardFocus);
      if ((segment.imagePrompt || hasStoryboard) && !segment.imageUrl) {
        segmentsToGenerate.push(segment);
      }
    }
  }

  const total = segmentsToGenerate.length;
  let completed = 0;

  // Generate images sequentially to avoid rate limiting
  for (const segment of segmentsToGenerate) {
    onProgress?.({
      total,
      completed,
      currentSegment: segment.id,
    });

    const result = await generateImageForSegment(segment, undefined, characterContext, storyArc.storyBible, storyArc.references);
    if (result) {
      imageUrlMap.set(result.segmentId, result.imageUrl);
    }

    completed++;
    onProgress?.({
      total,
      completed,
      currentSegment: null,
    });
  }

  return imageUrlMap;
}

export async function generateImagesForChapter(
  chapterIndex: number,
  storyArc: StoryArc,
  onProgress?: (progress: ImageGenerationProgress) => void,
  child?: Child | null,
  pet?: Pet | null
): Promise<Map<string, string>> {
  console.log('[ImageGen] generateImagesForChapter called for chapter:', chapterIndex);
  const imageUrlMap = new Map<string, string>();
  const chapter = storyArc.chapters[chapterIndex];

  if (!chapter) {
    console.log('[ImageGen] No chapter found at index:', chapterIndex);
    return imageUrlMap;
  }

  // Build character context if we have child and pet data
  const character = child ? getCharacterById(child.characterId) : undefined;
  const characterContext: CharacterContext | undefined =
    child && pet
      ? {
          childName: child.name,
          petName: pet.displayName,
          userAvatarUrl: character?.avatarUrl ?? null,
          petAvatarUrl: pet.avatarUrl,
        }
      : undefined;

  // Filter segments that need images (have imagePrompt or storyboard data)
  const segmentsToGenerate = chapter.segments.filter((segment) => {
    const hasStoryboard = !!(segment.storyboardShotType || segment.storyboardLocationId || segment.storyboardFocus);
    return (segment.imagePrompt || hasStoryboard) && !segment.imageUrl;
  });

  const total = segmentsToGenerate.length;
  console.log('[ImageGen] Segments to generate:', total, 'out of', chapter.segments.length, 'total segments');

  let completed = 0;
  let previousImageUrl: string | undefined;

  for (const segment of segmentsToGenerate) {
    onProgress?.({
      total,
      completed,
      currentSegment: segment.id,
    });

    // Pass the previous image URL for style consistency, character context, and story bible
    const result = await generateImageForSegment(segment, previousImageUrl, characterContext, storyArc.storyBible, storyArc.references);
    if (result) {
      imageUrlMap.set(result.segmentId, result.imageUrl);
      // Use this image as reference for the next one
      previousImageUrl = result.imageUrl;
    }

    completed++;
    onProgress?.({
      total,
      completed,
      currentSegment: null,
    });
  }

  return imageUrlMap;
}
