export interface Child {
  id: string;
  name: string;
  age: number;
  activePetId: string;
  activeBrushId: string;
  activeWorldId: string;
  points: number;
  totalBrushSessions: number;
  currentStreak: number;
  longestStreak: number;
  unlockedPets: string[];
  unlockedBrushes: string[];
  unlockedWorlds: string[];
  currentStoryArc: StoryArc | null;
  completedStoryArcs: string[];
  lastBrushDate: string | null;
  createdAt: string;
  characterId: string; // Selected character ('boy' or 'girl')
  nameAudioUrl: string | null; // Pre-generated TTS of child's name for audio splicing
}

export interface Pet {
  id: string;
  name: string;
  displayName: string;
  description: string;
  imageUrl: string;
  storyPersonality: string;
  unlockCost: number;
  isStarter: boolean;
  avatarUrl: string | null; // Illustrated pet avatar for story consistency
  nameAudioUrl: string | null; // Pre-generated TTS of pet's name for audio splicing
}

export interface ToothBrush {
  id: string;
  name: string;
  displayName: string;
  description: string;
  imageUrl: string;
  storyPower: string;
  unlockCost: number;
  isStarter: boolean;
}

export interface StoryWorld {
  id: string;
  name: string;
  displayName: string;
  description: string;
  theme: 'magical-forest' | 'space' | 'underwater' | 'dinosaurs' | 'pirates';
  backgroundImageUrl: string;
  backgroundMusicUrl: string | null;
  unlockCost: number;
  isStarter: boolean;
}

// Story template - static data for story definitions
export interface StoryTemplate {
  id: string;
  worldId: string;
  title: string;
  description: string;
  coverImageUrl: string;
  backgroundMusicUrl?: string | null;
  totalChapters: number;
  chapters: StoryChapter[];
}

// Active story instance - created when user starts a story
export interface StoryArc {
  id: string;
  storyTemplateId: string; // Reference to the template this was created from
  worldId: string;
  petId: string;
  childName: string;
  title: string;
  backgroundMusicUrl?: string | null;
  totalChapters: number;
  chapters: StoryChapter[];
  currentChapterIndex: number;
  isComplete: boolean;
  createdAt: string;
}

export interface StoryChapter {
  id: string;
  chapterNumber: number;
  title: string;
  recap: string | null; // Summary of previous chapter for "Last time..." intro
  segments: StorySegment[];
  cliffhanger: string;
  nextChapterTeaser: string;
  isRead: boolean;
  readAt: string | null;
}

// Item in the narration sequence - either an audio clip or a name placeholder
export type NarrationSequenceItem =
  | { type: 'audio'; url: string }
  | { type: 'name'; placeholder: 'CHILD' | 'PET' };

export interface StorySegment {
  id: string;
  text: string;
  durationSeconds: number;
  brushingZone: BrushingZone | null;
  brushingPrompt: string | null;
  imageUrl: string | null;
  imagePrompt: string | null; // Prompt used to generate the image
  // Audio narration as a sequence of clips and name placeholders for gapless playback
  narrationSequence: NarrationSequenceItem[] | null;
}

export type BrushingZone =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'tongue';

export interface BrushingSession {
  id: string;
  childId: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number;
  chapterId: string | null;
  pointsEarned: number;
  streakBonus: number;
}

export type ScreenName =
  | 'home'
  | 'brushing'
  | 'pet-select'
  | 'profile-select'
  | 'shop'
  | 'story-world-select'
  | 'story-select'
  | 'story-history'
  | 'settings'
  | 'parent-dashboard';
