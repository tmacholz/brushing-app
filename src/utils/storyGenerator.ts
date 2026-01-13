import type { StoryArc, StoryChapter, StorySegment } from '../types';
import { starterStories } from '../data/starterStories';
import { getPetById } from '../data/pets';

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
  segments: chapter.segments.map((segment) =>
    personalizeSegment(segment, childName, petName)
  ),
  cliffhanger: replaceTokens(chapter.cliffhanger, childName, petName),
  nextChapterTeaser: replaceTokens(chapter.nextChapterTeaser, childName, petName),
});

export const personalizeStory = (
  storyTemplate: Omit<StoryArc, 'childName' | 'petId' | 'createdAt'>,
  childName: string,
  petId: string
): StoryArc => {
  const pet = getPetById(petId);
  const petName = pet?.displayName ?? 'Friend';

  return {
    ...storyTemplate,
    childName,
    petId,
    createdAt: new Date().toISOString(),
    title: replaceTokens(storyTemplate.title, childName, petName),
    chapters: storyTemplate.chapters.map((chapter) =>
      personalizeChapter(chapter, childName, petName)
    ),
  };
};

export const createStoryArcForWorld = (
  worldId: string,
  childName: string,
  petId: string
): StoryArc | null => {
  const template = starterStories.find((story) => story.worldId === worldId);
  if (!template) return null;

  return personalizeStory(template, childName, petId);
};

export const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};
