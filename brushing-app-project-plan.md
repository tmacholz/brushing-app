# BrushQuest - Kids Brushing App Project Plan

## Overview
Build a mobile-first web app that makes toothbrushing fun for kids (ages 4-10) through AI-generated serialized stories and a collectible pet/rewards system. Each 2-minute brushing session reveals one "chapter" of an ongoing adventure, with the child's virtual pet as their story companion.

## Core Concept
- Kids brush for 2 minutes while a story chapter unfolds
- Stories are AI-generated, personalized, and continue across sessions
- Virtual pets accompany the child in their stories
- Points/streaks unlock new pets, story worlds, and collectible toothbrushes
- Parents get a simple dashboard to track consistency

---

## Tech Stack
- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Audio**: Howler.js (for sound effects and narration)
- **Storage**: localStorage initially (no backend for MVP)
- **AI Stories**: Anthropic Claude API (pre-generated batches, not real-time)
- **Future**: Could migrate to React Native or PWA for app stores

---

## Data Models

```typescript
interface Child {
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
  createdAt: Date;
}

interface Pet {
  id: string;
  name: string;
  displayName: string;
  description: string;
  imageUrl: string;
  storyPersonality: string; // Used in AI prompts: "brave and funny", "shy but clever"
  unlockCost: number;
  isStarter: boolean;
}

interface ToothBrush {
  id: string;
  name: string;
  displayName: string;
  description: string;
  imageUrl: string;
  storyPower: string; // "grants invisibility", "glows in dark caves"
  unlockCost: number;
  isStarter: boolean;
}

interface StoryWorld {
  id: string;
  name: string;
  displayName: string;
  description: string;
  theme: string; // "space", "underwater", "magical-forest", "dinosaurs", "pirates"
  backgroundImageUrl: string;
  unlockCost: number;
  isStarter: boolean;
}

interface StoryArc {
  id: string;
  worldId: string;
  petId: string;
  childName: string;
  title: string;
  totalChapters: number; // Usually 5-7
  chapters: StoryChapter[];
  currentChapterIndex: number;
  isComplete: boolean;
  createdAt: Date;
}

interface StoryChapter {
  id: string;
  chapterNumber: number;
  title: string;
  segments: StorySegment[];
  cliffhanger: string;
  nextChapterTeaser: string;
  isRead: boolean;
  readAt: Date | null;
}

interface StorySegment {
  id: string;
  text: string;
  durationSeconds: number; // How long this segment displays
  brushingZone: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'tongue' | null;
  brushingPrompt: string | null; // "Now brush your top teeth!"
}

interface BrushingSession {
  id: string;
  childId: string;
  startedAt: Date;
  completedAt: Date | null;
  durationSeconds: number;
  chapterId: string | null;
  pointsEarned: number;
  streakBonus: number;
}
```

---

## App Structure & Screens

```
/src
  /components
    /ui              # Buttons, cards, modals, progress bars
    /brushing        # Timer, story display, brushing prompts
    /pets            # Pet cards, pet selector, pet animations
    /shop            # Store items, purchase flows
    /stories         # Story display, chapter list
  /screens
    HomeScreen.tsx           # Main hub - start brushing, see pet, streak
    BrushingScreen.tsx       # The 2-min brushing experience
    PetSelectScreen.tsx      # Choose/view pets
    ShopScreen.tsx           # Spend points on pets, brushes, worlds
    StoryWorldSelectScreen.tsx  # Pick adventure theme
    StoryHistoryScreen.tsx   # Re-read completed stories
    SettingsScreen.tsx       # Child name, age, parent controls
    ParentDashboardScreen.tsx # Stats, streak history
  /hooks
    useBrushingTimer.ts
    useStoryProgression.ts
    usePoints.ts
    useLocalStorage.ts
  /context
    ChildContext.tsx         # Current child state
    AudioContext.tsx         # Sound management
  /data
    pets.ts                  # Starter pet definitions
    brushes.ts               # Starter brush definitions
    worlds.ts                # Story world definitions
    starterStories.ts        # Pre-generated story arcs for MVP
  /utils
    storyGenerator.ts        # AI prompt templates
    pointsCalculator.ts
    streakCalculator.ts
  /styles
    theme.ts                 # Kid-friendly colors, fonts
```

---

## Screen Details

### 1. HomeScreen (Main Hub)
- Big friendly greeting: "Good morning, [Name]!"
- Current pet displayed prominently (animated idle state)
- Current streak displayed with flame icon
- Points balance shown
- Big "START BRUSHING" button
- Bottom nav: Home, Pets, Shop, Stories, Settings
- If story arc in progress, show "Continue your adventure!" prompt

### 2. BrushingScreen (Core Experience)
**Layout:**
- Top: Progress bar (0-2 minutes)
- Center: Story text area with gentle animations
- Background: Current world theme
- Small pet companion in corner (reacts to story)
- Subtle brushing zone indicator

**2-Minute Flow:**
```
0:00-0:15  → "Previously on [Story Title]..." recap (if not chapter 1)
0:15-0:25  → Chapter title reveal with fanfare
0:25-1:45  → Main story segments (4-6 segments, ~15-20 sec each)
           → Brushing prompts woven between segments
1:45-1:55  → Cliffhanger moment
1:55-2:00  → "To be continued..." + tomorrow teaser
2:00       → Celebration! Points awarded, streak updated
```

**Brushing Prompts (appear between story segments):**
- "Quick! Brush your top teeth while [Pet] looks for clues!"
- "Scrub the bottom ones - we need to hurry!"
- "Don't forget your tongue - [Pet] is counting on you!"

**Completion:**
- Confetti animation
- Points breakdown: Base (10) + Streak bonus (streak × 2)
- "Come back tonight/tomorrow morning for Chapter 4!"
- Option to go home or view pets

### 3. PetSelectScreen
- Grid of pet cards
- Locked pets shown grayed with point cost
- Active pet highlighted
- Tap pet to see details + "Make Active" button
- Each pet has personality blurb affecting stories

### 4. ShopScreen
- Tabs: Pets | Brushes | Worlds
- Cards showing locked items with costs
- Current points balance prominent
- Purchase confirmation modal
- Celebration animation on unlock

### 5. StoryWorldSelectScreen
- Visual cards for each world (space, underwater, etc.)
- Locked worlds grayed with cost
- Selecting a world starts a NEW story arc in that setting
- Warning if current story arc incomplete: "You're in the middle of an adventure! Start a new one?"

### 6. ParentDashboardScreen (PIN protected)
- Brushing calendar heatmap
- Current streak + longest streak
- Average session length
- Total brushing sessions
- Reset child option
- Manage notifications (future)

---

## Story Generation System

### Pre-Generation Strategy (MVP)
Don't generate real-time. Instead:
1. Create story arc templates for each world
2. Use Claude API to batch-generate 10-20 story arcs per world
3. Store in `starterStories.ts`
4. Personalize at runtime by injecting child name + pet name

### Claude Prompt Template

```typescript
const generateStoryArc = (world: StoryWorld, pet: Pet, childName: string) => `
You are writing a children's story for a toothbrushing app. The story will be revealed across 5 chapters, with each chapter taking about 1.5 minutes to read aloud.

CONTEXT:
- Reader age: 4-10 years old
- Setting: ${world.displayName} - ${world.description}
- Main character: A child named ${childName}
- Companion: ${pet.displayName}, a ${pet.storyPersonality} sidekick
- Tone: Fun, adventurous, age-appropriate, encouraging

REQUIREMENTS:
- Each chapter must end with a cliffhanger
- Include moments where the child "helps" by brushing (you'll indicate these)
- Keep vocabulary simple but not condescending
- No scary content, villains should be silly not threatening
- Pet should have meaningful role, not just tagalong
- Resolve the story satisfyingly in chapter 5

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "title": "The [Adventure Name]",
  "chapters": [
    {
      "chapterNumber": 1,
      "title": "Chapter title",
      "segments": [
        {
          "text": "Story segment text (2-3 sentences)",
          "durationSeconds": 15,
          "brushingPrompt": null
        },
        {
          "text": "Another segment",
          "durationSeconds": 15,
          "brushingPrompt": "Brush your top teeth while Luna searches the cave!"
        }
      ],
      "cliffhanger": "But just then, they heard a strange noise behind them...",
      "nextChapterTeaser": "What could be making that sound? Find out next time!"
    }
  ]
}

Generate a complete 5-chapter story arc now.
`;
```

### Story Personalization at Runtime
```typescript
const personalizeStory = (
  story: StoryArc, 
  childName: string, 
  petName: string
): StoryArc => {
  // Replace placeholder tokens with actual names
  // [CHILD] → "Emma"
  // [PET] → "Sparkle"
  // etc.
};
```

---

## Gamification Details

### Points Economy
| Action | Points |
|--------|--------|
| Complete brushing session | 10 |
| Streak bonus | +2 per day in streak |
| Complete story arc | 25 bonus |
| First brush of the day (AM) | +5 |
| Second brush (PM) | +5 |

### Unlock Costs (Suggested)
| Item Type | Range |
|-----------|-------|
| New pets | 50-200 points |
| New brushes | 30-100 points |
| New worlds | 100-300 points |

### Streak System
- Streak = consecutive days with at least 1 brush
- Missing a day resets streak to 0
- Visual: Flame icon that grows/intensifies with longer streaks
- Milestones: 7 days, 30 days, 100 days (special unlocks?)

---

## Starter Content

### Starter Pets (Free)
1. **Sparkle** - A cheerful star who fell from the sky (brave and optimistic)
2. **Bubbles** - A giggly fish who learned to float in air (silly and curious)

### Unlockable Pets
3. **Cosmo** - A mini robot from the future (smart and helpful) - 75 pts
4. **Fern** - A tiny forest dragon (shy but fierce) - 100 pts
5. **Captain Whiskers** - A cat who dreams of sailing (dramatic and bold) - 150 pts

### Starter Brushes
1. **Basic Brush** - A trusty blue toothbrush (free)
2. **Sparkle Brush** - Leaves a trail of stars (50 pts)
3. **Bubble Brush** - Makes magic bubbles (50 pts)
4. **Dino Brush** - Shaped like a T-Rex (75 pts)
5. **Rainbow Brush** - Paints rainbows as you brush (100 pts)

### Starter Worlds (1 free, rest unlock)
1. **Magical Forest** - Talking trees and friendly creatures (free)
2. **Space Station Omega** - Adventures among the stars (100 pts)
3. **Underwater Kingdom** - Mermaids and sunken treasure (100 pts)
4. **Dinosaur Valley** - Time travel to prehistoric times (150 pts)
5. **Pirate Cove** - Treasure maps and sea adventures (150 pts)

---

## MVP Scope (Phase 1)

Build this first:
- [ ] HomeScreen with greeting, pet display, streak, start button
- [ ] BrushingScreen with 2-min timer and story segments
- [ ] 3 pre-written story arcs (hardcoded, one per starter world)
- [ ] Basic pet selection (2 starter pets)
- [ ] Points system (earn + display)
- [ ] Streak tracking
- [ ] localStorage persistence
- [ ] Simple, delightful animations
- [ ] Sound effects for key moments

Skip for MVP:
- Shop/unlocking (just show starter content)
- Parent dashboard
- Multiple children
- AI generation (use pre-written stories)
- Accounts/sync

---

## Phase 2 (Post-MVP)
- [ ] Shop with unlockable pets, brushes, worlds
- [ ] Parent dashboard with PIN
- [ ] More pre-generated stories
- [ ] Push notifications / reminders
- [ ] PWA for home screen install

## Phase 3 (Scale)
- [ ] Claude API integration for dynamic story generation
- [ ] Backend for accounts + cross-device sync
- [ ] Multiple child profiles
- [ ] Monetization (premium pets/worlds or subscription)

---

## Design Guidelines

### Colors (Kid-Friendly)
- Primary: Bright teal (#06B6D4)
- Secondary: Warm coral (#FB7185) 
- Accent: Sunny yellow (#FBBF24)
- Success: Mint green (#34D399)
- Background: Soft cream (#FEF3E2) or themed per world
- Text: Soft black (#1F2937)

### Typography
- Headers: Rounded, playful sans-serif (Nunito, Quicksand, or Baloo)
- Body: Clear, readable (Inter, Nunito Sans)
- Large text sizes (kids + reading while brushing)

### Animation Principles
- Bouncy, springy movements (framer motion spring physics)
- Celebrate everything (confetti, stars, bounces)
- Pet should feel alive (idle animations, reactions)
- Never jarring or sudden

### Sound Design
- Cheerful startup jingle
- Gentle "ding" for segment transitions
- Encouraging sounds for brushing prompts
- Victory fanfare for completion
- Keep sounds soft (bathroom acoustics)

---

## Getting Started

1. Initialize React project with Vite + TypeScript
2. Install dependencies: tailwindcss, framer-motion, howler, lucide-react
3. Set up folder structure as outlined above
4. Create theme and design tokens
5. Build HomeScreen with mock data
6. Build BrushingScreen with timer logic
7. Add one hardcoded story to test flow
8. Implement localStorage persistence
9. Add animations and polish
10. Test with actual 2-minute brushing sessions!

---

## Key Success Metrics
- Kids ASK to brush (the ultimate goal)
- Session completion rate >90%
- Return rate (brush again same day / next day)
- Streak length trends upward over time
- Parents report less nagging

---

## Notes
- Offline-first is important (no loading spinners before brushing)
- Keep bundle size small for fast load
- Test on actual tablets/phones kids use
- Consider accessibility (dyslexia-friendly fonts, good contrast)
- Stories should work without audio (text primary, audio enhancement)
