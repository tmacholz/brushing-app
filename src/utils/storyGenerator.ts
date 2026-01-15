import type { StoryArc, StoryChapter, StorySegment, StoryTemplate } from '../types';
import { getStoryById, getStoriesForWorld } from '../data/starterStories';

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
  };
};

// Create a story arc from a specific story template
export const createStoryArc = (
  storyId: string,
  childName: string,
  petId: string,
  petName: string = 'Friend'
): StoryArc | null => {
  const template = getStoryById(storyId);
  if (!template) return null;

  return personalizeStory(template, childName, petId, petName);
};

// Legacy function for backwards compatibility - creates first story from world
// TODO: Remove after migration to story selection
export const createStoryArcForWorld = (
  worldId: string,
  childName: string,
  petId: string,
  petName: string = 'Friend'
): StoryArc | null => {
  const stories = getStoriesForWorld(worldId);
  if (stories.length === 0) return null;

  // Default to first story in the world
  return personalizeStory(stories[0], childName, petId, petName);
};

export const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};
