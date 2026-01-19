-- BrushQuest Content Admin Schema
-- Run this in your Neon SQL Editor to set up the database

-- Worlds table
CREATE TABLE IF NOT EXISTS worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  theme VARCHAR(50),
  background_image_url TEXT,
  background_music_url TEXT,
  unlock_cost INTEGER DEFAULT 0,
  is_starter BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Migration: Add background_music_url to worlds if table already exists
-- ALTER TABLE worlds ADD COLUMN IF NOT EXISTS background_music_url TEXT;

-- Story templates table
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  cover_image_url TEXT,
  background_music_url TEXT,
  story_bible JSONB DEFAULT NULL, -- Story Bible for consistent narrative/visuals
  total_chapters INTEGER DEFAULT 5,
  status VARCHAR(20) DEFAULT 'draft',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Migration: Add background_music_url if table already exists
-- ALTER TABLE stories ADD COLUMN IF NOT EXISTS background_music_url TEXT;
-- Migration: Add story_bible column
-- ALTER TABLE stories ADD COLUMN IF NOT EXISTS story_bible JSONB DEFAULT NULL;

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  recap TEXT,
  cliffhanger TEXT,
  next_chapter_teaser TEXT,
  -- Pre-recorded audio narration sequences
  -- Array of {type: 'audio', url: string} | {type: 'name', placeholder: 'CHILD'|'PET'}
  recap_narration_sequence JSONB DEFAULT NULL,
  cliffhanger_narration_sequence JSONB DEFAULT NULL,
  teaser_narration_sequence JSONB DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Migration: Add chapter narration columns if table already exists
-- ALTER TABLE chapters ADD COLUMN IF NOT EXISTS recap_narration_sequence JSONB DEFAULT NULL;
-- ALTER TABLE chapters ADD COLUMN IF NOT EXISTS cliffhanger_narration_sequence JSONB DEFAULT NULL;
-- ALTER TABLE chapters ADD COLUMN IF NOT EXISTS teaser_narration_sequence JSONB DEFAULT NULL;

-- Segments table (individual story beats with brushing prompts)
CREATE TABLE IF NOT EXISTS segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  segment_order INTEGER NOT NULL,
  text TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 15,
  brushing_zone VARCHAR(20),
  brushing_prompt TEXT,
  image_prompt TEXT,
  image_url TEXT,
  -- Audio narration as sequence of clips and name placeholders
  -- Array of {type: 'audio', url: string} | {type: 'name', placeholder: 'CHILD'|'PET'}
  narration_sequence JSONB DEFAULT NULL,
  -- Character overlay system fields
  child_pose VARCHAR(50) DEFAULT 'happy',
  pet_pose VARCHAR(50) DEFAULT 'happy',
  child_position VARCHAR(20) DEFAULT 'center',
  pet_position VARCHAR(20) DEFAULT 'right',
  background_prompt TEXT,
  -- Storyboard fields for intentional visual planning
  storyboard_location VARCHAR(100),          -- References Story Bible keyLocations.name
  storyboard_characters TEXT[],              -- NPC names from Story Bible recurringCharacters
  storyboard_shot_type VARCHAR(50),          -- 'wide', 'medium', 'close-up', etc.
  storyboard_camera_angle VARCHAR(50),       -- 'eye-level', 'low-angle', 'high-angle', etc.
  storyboard_focus TEXT,                     -- What to emphasize visually
  storyboard_continuity TEXT,                -- Notes about visual continuity
  storyboard_exclude TEXT[]                  -- Elements to explicitly exclude from image
);

-- Pre-generated name audio for pets (static, generated once)
CREATE TABLE IF NOT EXISTS pet_name_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id VARCHAR(50) NOT NULL UNIQUE,
  audio_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Story pitches (AI-generated suggestions)
CREATE TABLE IF NOT EXISTS story_pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  outline JSONB,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pets table (managed content for unlockable companions)
CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  story_personality TEXT NOT NULL,
  image_url TEXT,
  avatar_url TEXT,
  unlock_cost INTEGER DEFAULT 0,
  is_starter BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pet suggestions (AI-generated pet ideas for approval)
CREATE TABLE IF NOT EXISTS pet_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  story_personality TEXT NOT NULL,
  unlock_cost INTEGER DEFAULT 0,
  is_starter BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Children (user profiles)
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 4 AND age <= 10),
  character_id VARCHAR(20) NOT NULL DEFAULT 'boy',
  active_pet_id VARCHAR(50) NOT NULL,
  active_brush_id VARCHAR(50) NOT NULL,
  active_world_id VARCHAR(50) NOT NULL,
  points INTEGER DEFAULT 0,
  total_brush_sessions INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  unlocked_pets TEXT[] DEFAULT ARRAY['sparkle', 'bubbles'],
  unlocked_brushes TEXT[] DEFAULT ARRAY['star-swirl'],
  unlocked_worlds TEXT[] DEFAULT ARRAY['magical-forest', 'space-station'],
  current_story_arc JSONB DEFAULT NULL,
  completed_story_arcs TEXT[] DEFAULT ARRAY[]::TEXT[],
  last_brush_date TIMESTAMP DEFAULT NULL,
  name_audio_url TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Character Overlay System (Pose Sprites)
-- =====================================================

-- Pose definitions (admin-configurable templates for sprite generation)
CREATE TABLE IF NOT EXISTS pose_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_type VARCHAR(20) NOT NULL, -- 'child' or 'pet'
  pose_key VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  generation_prompt TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(character_type, pose_key)
);

-- Generated character sprites (actual transparent PNG images)
-- For children: owner_id is the characterId ('boy', 'girl') - shared across all children of that type
-- For pets: owner_id is the pet's UUID
CREATE TABLE IF NOT EXISTS character_sprites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type VARCHAR(20) NOT NULL, -- 'child' or 'pet'
  owner_id VARCHAR(100) NOT NULL, -- For children: characterId ('boy', 'girl'); For pets: UUID
  pose_key VARCHAR(50) NOT NULL,
  sprite_url TEXT NOT NULL,
  generation_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'generating', 'complete', 'failed'
  generated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner_type, owner_id, pose_key)
);

-- Migration: Add character overlay columns to segments if table already exists
-- ALTER TABLE segments ADD COLUMN IF NOT EXISTS child_pose VARCHAR(50) DEFAULT 'happy';
-- ALTER TABLE segments ADD COLUMN IF NOT EXISTS pet_pose VARCHAR(50) DEFAULT 'happy';
-- ALTER TABLE segments ADD COLUMN IF NOT EXISTS child_position VARCHAR(20) DEFAULT 'center';
-- ALTER TABLE segments ADD COLUMN IF NOT EXISTS pet_position VARCHAR(20) DEFAULT 'right';
-- ALTER TABLE segments ADD COLUMN IF NOT EXISTS background_prompt TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_character_sprites_owner ON character_sprites(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_pose_definitions_type ON pose_definitions(character_type, is_active);
CREATE INDEX IF NOT EXISTS idx_stories_world_id ON stories(world_id);
CREATE INDEX IF NOT EXISTS idx_chapters_story_id ON chapters(story_id);
CREATE INDEX IF NOT EXISTS idx_segments_chapter_id ON segments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_story_pitches_world_id ON story_pitches(world_id);
CREATE INDEX IF NOT EXISTS idx_pet_suggestions_is_approved ON pet_suggestions(is_approved);
CREATE INDEX IF NOT EXISTS idx_children_name ON children(name);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_worlds_updated_at ON worlds;
CREATE TRIGGER update_worlds_updated_at
    BEFORE UPDATE ON worlds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stories_updated_at ON stories;
CREATE TRIGGER update_stories_updated_at
    BEFORE UPDATE ON stories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pets_updated_at ON pets;
CREATE TRIGGER update_pets_updated_at
    BEFORE UPDATE ON pets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_children_updated_at ON children;
CREATE TRIGGER update_children_updated_at
    BEFORE UPDATE ON children
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Seed Data: Initial Pose Definitions (5 Core Poses)
-- Run this after creating the tables to initialize poses
-- =====================================================

-- Child poses
INSERT INTO pose_definitions (character_type, pose_key, display_name, generation_prompt, sort_order) VALUES
('child', 'happy', 'Happy', 'Standing with warm friendly smile, relaxed content posture, arms at sides', 1),
('child', 'excited', 'Excited', 'Jumping or bouncing with wide smile, raised eyebrows, arms up, energetic body language', 2),
('child', 'surprised', 'Surprised', 'Eyes wide with wonder, mouth slightly open in amazement, hands raised slightly', 3),
('child', 'worried', 'Worried', 'Concerned expression with slight frown, hands together nervously in front', 4),
('child', 'walking', 'Walking', 'Mid-stride walking pose, side profile view, one foot forward, arms swinging', 5)
ON CONFLICT (character_type, pose_key) DO NOTHING;

-- Pet poses
INSERT INTO pose_definitions (character_type, pose_key, display_name, generation_prompt, sort_order) VALUES
('pet', 'happy', 'Happy', 'Joyful expression, bouncy or wagging posture, bright eyes', 1),
('pet', 'excited', 'Excited', 'Extra bouncy with sparkles of excitement, very energetic, tail wagging or equivalent', 2),
('pet', 'alert', 'Alert', 'Attentive posture, ears or appendages perked up, looking forward intently', 3),
('pet', 'worried', 'Worried', 'Droopy posture, concerned expression, ears down or equivalent', 4),
('pet', 'following', 'Following', 'Moving alongside pose, loyal companion gesture, looking up adoringly', 5)
ON CONFLICT (character_type, pose_key) DO NOTHING;

-- =====================================================
-- Collectibles System
-- =====================================================

-- Collectibles catalog (stickers + accessories)
CREATE TABLE IF NOT EXISTS collectibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('sticker', 'accessory')),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  rarity VARCHAR(20) NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare')),
  world_id VARCHAR(50),       -- null = universal, references world name
  pet_id VARCHAR(50),         -- for accessories, references pet name
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collectibles_type ON collectibles(type);
CREATE INDEX IF NOT EXISTS idx_collectibles_world_id ON collectibles(world_id);
CREATE INDEX IF NOT EXISTS idx_collectibles_rarity ON collectibles(rarity);

-- Add collectibles columns to children table
-- Run these as migrations if table already exists:
-- ALTER TABLE children ADD COLUMN IF NOT EXISTS collected_stickers TEXT[] DEFAULT ARRAY[]::TEXT[];
-- ALTER TABLE children ADD COLUMN IF NOT EXISTS collected_accessories TEXT[] DEFAULT ARRAY[]::TEXT[];
-- ALTER TABLE children ADD COLUMN IF NOT EXISTS equipped_accessories JSONB DEFAULT '{}';

-- =====================================================
-- Story Reference Images (for visual consistency)
-- =====================================================

-- Visual reference images for consistent story illustrations
-- Characters, objects, and locations that appear across multiple segments
CREATE TABLE IF NOT EXISTS story_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('character', 'object', 'location')),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,           -- Detailed visual description for image generation
  image_url TEXT,                       -- Generated reference image (null until generated)
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_references_story_id ON story_references(story_id);
CREATE INDEX IF NOT EXISTS idx_story_references_type ON story_references(type);

DROP TRIGGER IF EXISTS update_story_references_updated_at ON story_references;
CREATE TRIGGER update_story_references_updated_at
    BEFORE UPDATE ON story_references
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
