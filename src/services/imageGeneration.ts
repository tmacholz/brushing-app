import type { StoryArc, StorySegment } from '../types';

interface GenerateImageResult {
  imageUrl: string;
  segmentId: string;
}

export async function generateImageForSegment(
  segment: StorySegment,
  referenceImageUrl?: string
): Promise<GenerateImageResult | null> {
  if (!segment.imagePrompt) {
    return null;
  }

  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: segment.imagePrompt,
        segmentId: segment.id,
        referenceImageUrl, // Pass previous image for style consistency
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to generate image for segment ${segment.id}:`, error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error generating image for segment ${segment.id}:`, error);
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
  onProgress?: (progress: ImageGenerationProgress) => void
): Promise<Map<string, string>> {
  const imageUrlMap = new Map<string, string>();

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

    const result = await generateImageForSegment(segment);
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
  onProgress?: (progress: ImageGenerationProgress) => void
): Promise<Map<string, string>> {
  const imageUrlMap = new Map<string, string>();
  const chapter = storyArc.chapters[chapterIndex];

  if (!chapter) {
    return imageUrlMap;
  }

  // Filter segments that need images
  const segmentsToGenerate = chapter.segments.filter(
    (segment) => segment.imagePrompt && !segment.imageUrl
  );

  const total = segmentsToGenerate.length;
  let completed = 0;
  let previousImageUrl: string | undefined;

  for (const segment of segmentsToGenerate) {
    onProgress?.({
      total,
      completed,
      currentSegment: segment.id,
    });

    // Pass the previous image URL for style/character consistency
    const result = await generateImageForSegment(segment, previousImageUrl);
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
