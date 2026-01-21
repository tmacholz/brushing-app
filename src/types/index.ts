// Info about a just-completed story for prompting next action
export interface CompletedStoryInfo {
  storyTemplateId: string;
  worldId: string;
  title: string;
  completedAt: string;
}

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
  lastCompletedStoryInfo: CompletedStoryInfo | null; // Track just-finished story for prompting next action
  lastBrushDate: string | null;
  createdAt: string;
  characterId: string; // Selected character ('boy' or 'girl')
  nameAudioUrl: string | null; // Pre-generated TTS of child's name for audio splicing
  namePossessiveAudioUrl: string | null; // Pre-generated TTS of child's name possessive (e.g., "Tim's")
  // Collectibles
  collectedStickers: string[]; // Array of collectible IDs
  collectedAccessories: string[]; // Array of collectible IDs
  equippedAccessories: EquippedAccessories; // Pet ID -> array of accessory IDs
  // Task bonus feature
  taskConfig: TaskConfig; // Parent-configured tasks for check-in
}

// =====================================================
// Task Bonus System Types
// =====================================================

export interface TaskConfig {
  enabled: boolean;
  tasks: TaskDefinition[];
}

export interface TaskDefinition {
  id: string;
  question: string; // e.g., "Did you go potty today?"
  shortLabel: string; // e.g., "Potty"
  emoji: string; // e.g., "🚽"
  enabled: boolean;
}

// Default tasks available for parents to configure
export const DEFAULT_TASKS: TaskDefinition[] = [
  { id: 'potty', question: 'Did you go potty?', shortLabel: 'Potty', emoji: '🚽', enabled: true },
  { id: 'toys', question: 'Did you clean up your toys?', shortLabel: 'Toys', emoji: '🧸', enabled: true },
  { id: 'hands', question: 'Did you wash your hands?', shortLabel: 'Hands', emoji: '🧼', enabled: false },
  { id: 'dressed', question: 'Did you get dressed?', shortLabel: 'Dressed', emoji: '👕', enabled: false },
  { id: 'polite', question: 'Did you say please and thank you?', shortLabel: 'Polite', emoji: '🙏', enabled: false },
];

export interface TaskCheckInResult {
  taskId: string;
  completed: boolean;
}

// Result from bonus wheel spin (same structure as ChestReward for compatibility)
export type WheelReward = ChestReward;

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
  namePossessiveAudioUrl: string | null; // Pre-generated TTS of pet's name possessive (e.g., "Sparkle's")
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
  // Pre-recorded audio narration sequences for chapter intro/outro
  recapNarrationSequence: NarrationSequenceItem[] | null;
  cliffhangerNarrationSequence: NarrationSequenceItem[] | null;
  teaserNarrationSequence: NarrationSequenceItem[] | null;
}

// Item in the narration sequence - either an audio clip or a name placeholder
// Possessive forms (e.g., "Tim's") are separate placeholders to avoid splicing issues
export type NarrationSequenceItem =
  | { type: 'audio'; url: string }
  | { type: 'name'; placeholder: 'CHILD' | 'PET' | 'CHILD_POSSESSIVE' | 'PET_POSSESSIVE' };

// Character expression for portrait overlay circles
export type Expression = 'happy' | 'sad' | 'surprised' | 'worried' | 'determined' | 'excited';

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
  // Character portrait overlay system (circle portraits in fixed corners)
  childPose: Expression | null; // Child expression: happy, sad, surprised, worried, determined, excited
  petPose: Expression | null; // Pet expression: happy, sad, surprised, worried, determined, excited
  backgroundPrompt: string | null; // Prompt for background-only image (no main characters)
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
  | 'parent-dashboard'
  | 'collection';

// =====================================================
// Character Overlay System Types
// =====================================================

export type CharacterType = 'child' | 'pet';

export interface PoseDefinition {
  id: string;
  characterType: CharacterType;
  poseKey: string;
  displayName: string;
  generationPrompt: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CharacterSprite {
  id: string;
  ownerType: CharacterType;
  ownerId: string;
  poseKey: string;
  spriteUrl: string;
  generationStatus: 'pending' | 'generating' | 'complete' | 'failed';
  generatedAt: string | null;
}

// Map of pose key to sprite URL for easy lookup
export type SpriteMap = Record<string, string>;

// =====================================================
// Collectibles System Types
// =====================================================

export type CollectibleType = 'sticker' | 'accessory';
export type CollectibleRarity = 'common' | 'uncommon' | 'rare';

export interface Collectible {
  id: string;
  type: CollectibleType;
  name: string;
  displayName: string;
  description: string;
  imageUrl: string;
  rarity: CollectibleRarity;
  worldId: string | null;  // null = universal, otherwise world-specific
  petId: string | null;    // for accessories - which pet can wear it
  createdAt: string;
}

// Reward result from mystery chest
export type ChestReward =
  | { type: 'points'; amount: number }
  | { type: 'sticker'; collectible: Collectible; isNew: boolean }
  | { type: 'accessory'; collectible: Collectible; isNew: boolean };

// Equipped accessories per pet
export type EquippedAccessories = Record<string, string[]>;
