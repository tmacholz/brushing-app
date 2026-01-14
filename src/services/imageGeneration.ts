import type { StoryArc, StorySegment, Child, Pet } from '../types';
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

export async function generateImageForSegment(
  segment: StorySegment,
  referenceImageUrl?: string,
  characterContext?: CharacterContext
): Promise<GenerateImageResult | null> {
  if (!segment.imagePrompt) {
    console.log('[ImageGen] Segment has no imagePrompt, skipping:', segment.id);
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
        segmentId: segment.id,
        referenceImageUrl,
        userAvatarUrl,
        petAvatarUrl,
        includeUser,
        includePet,
        childName,
        petName,
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
      if (segment.imagePrompt && !segment.imageUrl) {
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

    const result = await generateImageForSegment(segment, undefined, characterContext);
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

  // Filter segments that need images
  const segmentsToGenerate = chapter.segments.filter(
    (segment) => segment.imagePrompt && !segment.imageUrl
  );

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

    // Pass the previous image URL for style consistency plus character context
    const result = await generateImageForSegment(segment, previousImageUrl, characterContext);
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
