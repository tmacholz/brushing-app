# Story Image Generation System

This document explains how images are generated for stories in BrushQuest.

## Overview

Images are generated using the **Gemini API** (`gemini-2.5-flash-image`) and stored in **Vercel Blob Storage**. The system supports multiple image types with a consistent children's book illustration style.

## API Endpoint

All image generation goes through: `POST /api/generate`

The `type` field in the request body determines what kind of image to generate.

## Image Types

### 1. Story Scene Images (`type: 'image'`)

Used for segment illustrations in stories.

```typescript
{
  type: 'image',
  prompt: string,           // Scene description (BACKGROUND ONLY - no child/pet)
  segmentId: string,        // For storage path
  referenceImageUrl?: string,      // Previous scene for style consistency
  storyBible?: StoryBible,         // Visual style guide
  visualReferences?: VisualReference[], // Character/location reference sheets

  // Character inclusion (overlay system)
  includeUser?: boolean,
  includePet?: boolean,
  userAvatarUrl?: string,
  petAvatarUrl?: string,
  childName?: string,
  petName?: string
}
```

**Key Points:**
- The `prompt` should describe the BACKGROUND/SCENE only (no child or pet)
- Child and pet are composited as sprite overlays at runtime
- `storyBible` provides color palette, lighting, location descriptions for consistency
- `visualReferences` are reference sheets for NPCs/objects that should appear consistently

### 2. Reference Images (`type: 'referenceImage'`)

Character/object/location reference sheets for visual consistency across scenes.

```typescript
{
  type: 'referenceImage',
  referenceId: string,
  referenceType: 'character' | 'object' | 'location',
  name: string,
  description: string,
  storyBible?: StoryBible
}
```

**Output by type:**
- **character**: 2x2 grid with FRONT, SIDE, BACK, HEADSHOT views
- **object**: 3-panel row with FRONT, SIDE, BACK views
- **location**: Single establishing shot of the environment

### 3. Cover Images (`type: 'coverImage'`)

Story cover art for the story selection screen.

```typescript
{
  type: 'coverImage',
  storyId: string,
  storyTitle: string,
  storyDescription: string,
  referenceImageUrls?: string[],  // Existing segment images for style matching
  storyBible?: StoryBible
}
```

### 4. Character Sprites (`type: 'sprite'`)

Transparent PNG sprites for the character overlay system.

```typescript
{
  type: 'sprite',
  ownerType: 'child' | 'pet',
  ownerId: string,
  poseKey: string,          // e.g., 'happy', 'excited', 'worried'
  sourceAvatarUrl: string,  // Base avatar to match appearance
  posePrompt: string        // Pose description from pose_definitions table
}
```

**Process:**
1. Generate character on pure white background
2. Post-process to remove white background (threshold detection)
3. Save as transparent PNG for compositing

### 5. World Images (`type: 'worldImage'`)

Planet-like icons for world selection.

```typescript
{
  type: 'worldImage',
  worldId: string,
  worldName: string,
  worldDescription: string,
  theme?: string
}
```

### 6. User Avatars (`type: 'userAvatar'`)

Transform child's photo into illustrated character.

```typescript
{
  type: 'userAvatar',
  photoDataUrl: string,  // Base64 photo
  childId: string,
  childName: string,
  childAge: number
}
```

### 7. Pet Avatars (`type: 'petAvatar'`)

Generate illustrated pet companions.

```typescript
{
  type: 'petAvatar',
  petId: string,
  petName: string,
  petDescription: string,
  petPersonality: string
}
```

## Style System

### Base Style Prefix

All images use this consistent style:

```
Children's book illustration style, soft watercolor and digital art hybrid,
warm and inviting colors, gentle lighting, whimsical and magical atmosphere,
suitable for ages 4-8, no text in image, dreamlike quality,
Studio Ghibli inspired soft aesthetic, rounded friendly shapes,
pastel color palette with vibrant accents.
```

### Story Bible Visual Guide

When a `storyBible` is provided, images include:
- **Color Palette**: Dominant colors for the story
- **Lighting Style**: Consistent lighting approach
- **Art Direction**: Additional style notes
- **Key Locations**: Visual descriptions for specific places
- **Recurring Characters**: NPC appearance descriptions

## Character Overlay System

Instead of generating the child and pet in every scene image, we use a compositing approach:

1. **Scene images** are BACKGROUND ONLY (no main characters)
2. **Character sprites** are pre-generated transparent PNGs
3. **At runtime**, sprites are overlayed on backgrounds based on:
   - `childPose` / `petPose`: Which sprite to use (happy, excited, worried, etc.)
   - `childPosition` / `petPosition`: Where to place them (left, center, right, off-screen)

**Benefits:**
- Reduces image generation costs (reuse sprites across scenes)
- Consistent character appearance (same sprite used everywhere)
- Faster story generation (only generate backgrounds)

### Available Poses

**Child poses:** `happy`, `excited`, `surprised`, `worried`, `walking`

**Pet poses:** `happy`, `excited`, `alert`, `worried`, `following`

### Positions

`left`, `center`, `right`, `off-screen`

## Image Prompt Flow

### During Story Generation (`lib/ai.ts`)

1. **Story Bible Created** - Defines visual style, locations, NPCs
2. **Chapters Generated** - Each segment gets an `imagePrompt` field
3. **Image Prompts** are BACKGROUND-ONLY descriptions that reference the Story Bible

Example prompt in chapter generation:
```
"imagePrompt": A BACKGROUND-ONLY scene description. Do NOT include [CHILD] or [PET]
in the image prompt. Other NPCs/recurring characters CAN appear - use their visual
descriptions from the Story Bible. Include the color palette and lighting style
from the bible. Focus on environment, setting, atmosphere.
```

### During Image Generation (`api/generate.ts`)

1. Fetch reference images (previous scene, visual references, avatars)
2. Build prompt with:
   - Base style prefix
   - Story Bible guidelines (if provided)
   - Reference image descriptions
   - Character requirements (if including user/pet)
   - Scene description
3. Call Gemini API
4. Upload to Vercel Blob
5. Return URL

## Storage Paths

| Type | Path Pattern |
|------|--------------|
| Story images | `story-images/{segmentId}-{timestamp}.png` |
| Reference images | `story-references/{referenceId}-{timestamp}.png` |
| Cover images | `story-covers/{storyId}-{timestamp}.png` |
| Sprites | `sprites/{ownerType}/{ownerId}/{poseKey}.png` |
| World images | `world-images/{worldId}-{timestamp}.png` |
| User avatars | `avatars/{childId}.png` |
| Pet avatars | `pet-avatars/{petId}.png` |

## Rate Limiting

The Gemini image generation API has rate limits. The text generation in `lib/ai.ts` includes:
- 1.5 second minimum interval between calls
- Exponential backoff with jitter on 429 errors
- Up to 5 retry attempts

## Files

| File | Purpose |
|------|---------|
| `api/generate.ts` | Main generation endpoint, handles all image types |
| `lib/imageGeneration.ts` | Direct generation helper for world images |
| `lib/ai.ts` | Story/chapter generation with image prompts |
| `src/admin/screens/StoryEditor.tsx` | Admin UI for triggering image generation |
