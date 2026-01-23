import type { StoryArc, StoryChapter, StorySegment, StoryTemplate } from '../types';

const CHILD_PLACEHOLDER = '[CHILD]';
const PET_PLACEHOLDER = '[PET]';

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const replaceTokens = (
  text: string,
  childName: string,
  petName: string
): string => {
  return text
    .replace(new RegExp(escapeRegex(CHILD_PLACEHOLDER), 'g'), childName)
    .replace(new RegExp(escapeRegex(PET_PLACEHOLDER), 'g'), petName);
};

const personalizeSegment = (
  segment: StorySegment,
  childName: string,
  petName: string
): StorySegment => ({
  ...segment,
  text: replaceTokens(segment.text, childName, petName),
  brushingPrompt: segment.brushingPrompt
    ? replaceTokens(segment.brushingPrompt, childName, petName)
    : null,
});

const personalizeChapter = (
  chapter: StoryChapter,
  childName: string,
  petName: string
): StoryChapter => ({
  ...chapter,
  recap: chapter.recap ? replaceTokens(chapter.recap, childName, petName) : null,
  segments: chapter.segments.map((segment) =>
    personalizeSegment(segment, childName, petName)
  ),
  cliffhanger: replaceTokens(chapter.cliffhanger, childName, petName),
  nextChapterTeaser: replaceTokens(chapter.nextChapterTeaser, childName, petName),
});

export const personalizeStory = (
  storyTemplate: StoryTemplate,
  childName: string,
  petId: string,
  petName: string = 'Friend'
): StoryArc => {
  return {
    id: generateUniqueId(),
    storyTemplateId: storyTemplate.id,
    worldId: storyTemplate.worldId,
    childName,
    petId,
    createdAt: new Date().toISOString(),
    title: replaceTokens(storyTemplate.title, childName, petName),
    backgroundMusicUrl: storyTemplate.backgroundMusicUrl ?? null,
    totalChapters: storyTemplate.totalChapters,
    currentChapterIndex: 0,
    isComplete: false,
    chapters: storyTemplate.chapters.map((chapter) =>
      personalizeChapter(chapter, childName, petName)
    ),
    storyBible: storyTemplate.storyBible ?? null,
  };
};

export const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Re-personalize a story arc's chapters from the original template.
 * Used to fix story arcs that were created with incorrect names.
 */
export const rePersonalizeStoryArc = (
  storyArc: StoryArc,
  storyTemplate: StoryTemplate,
  childName: string,
  petName: string
): StoryArc => {
  // Re-personalize chapters from the template, preserving read state and generated images
  const rePersonalizedChapters = storyTemplate.chapters.map((templateChapter, idx) => {
    const existingChapter = storyArc.chapters[idx];
    const personalizedChapter = personalizeChapter(templateChapter, childName, petName);

    // Preserve existing chapter state (read status, images, etc.)
    return {
      ...personalizedChapter,
      isRead: existingChapter?.isRead ?? false,
      readAt: existingChapter?.readAt ?? null,
      // Preserve any generated images in segments
      segments: personalizedChapter.segments.map((segment, segIdx) => ({
        ...segment,
        imageUrl: existingChapter?.segments[segIdx]?.imageUrl ?? segment.imageUrl,
      })),
    };
  });

  return {
    ...storyArc,
    title: replaceTokens(storyTemplate.title, childName, petName),
    chapters: rePersonalizedChapters,
  };
};

/**
 * Refresh a story arc's content from the latest template data.
 * Preserves progress (isRead, readAt, currentChapterIndex) while updating
 * segment content (imageUrl, narrationSequence) and chapter narration from the template.
 *
 * Use this when admin has added new audio/images after a story was started.
 */
export const refreshStoryArcContent = (
  storyArc: StoryArc,
  storyTemplate: StoryTemplate,
  childName: string,
  petName: string
): StoryArc => {
  const refreshedChapters = storyTemplate.chapters.map((templateChapter, idx) => {
    const existingChapter = storyArc.chapters[idx];
    const personalizedChapter = personalizeChapter(templateChapter, childName, petName);

    return {
      ...personalizedChapter,
      // Preserve progress state only
      isRead: existingChapter?.isRead ?? false,
      readAt: existingChapter?.readAt ?? null,
      // Use TEMPLATE data for chapter narration sequences (latest from admin)
      recapNarrationSequence: templateChapter.recapNarrationSequence ?? null,
      cliffhangerNarrationSequence: templateChapter.cliffhangerNarrationSequence ?? null,
      teaserNarrationSequence: templateChapter.teaserNarrationSequence ?? null,
      // Use TEMPLATE data for segment content (not existing) - this gets latest audio/images
      segments: personalizedChapter.segments.map((segment, segIdx) => {
        const templateSegment = templateChapter.segments[segIdx];
        return {
          ...segment,
          // Use template's imageUrl and narrationSequence (latest from admin)
          imageUrl: templateSegment?.imageUrl ?? null,
          narrationSequence: templateSegment?.narrationSequence ?? null,
        };
      }),
    };
  });

  return {
    ...storyArc,
    title: replaceTokens(storyTemplate.title, childName, petName),
    backgroundMusicUrl: storyTemplate.backgroundMusicUrl ?? storyArc.backgroundMusicUrl,
    chapters: refreshedChapters,
    storyBible: storyTemplate.storyBible ?? storyArc.storyBible ?? null,
  };
};
