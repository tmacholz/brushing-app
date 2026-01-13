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
  unlockCost: number;
  isStarter: boolean;
}

export interface StoryArc {
  id: string;
  worldId: string;
  petId: string;
  childName: string;
  title: string;
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
  segments: StorySegment[];
  cliffhanger: string;
  nextChapterTeaser: string;
  isRead: boolean;
  readAt: string | null;
}

export interface StorySegment {
  id: string;
  text: string;
  durationSeconds: number;
  brushingZone: BrushingZone | null;
  brushingPrompt: string | null;
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
  | 'story-history'
  | 'settings'
  | 'parent-dashboard';
