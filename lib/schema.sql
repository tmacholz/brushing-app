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
  unlock_cost INTEGER DEFAULT 0,
  is_starter BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Story templates table
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  cover_image_url TEXT,
  total_chapters INTEGER DEFAULT 5,
  status VARCHAR(20) DEFAULT 'draft',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  recap TEXT,
  cliffhanger TEXT,
  next_chapter_teaser TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

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
  narration_sequence JSONB DEFAULT NULL
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_world_id ON stories(world_id);
CREATE INDEX IF NOT EXISTS idx_chapters_story_id ON chapters(story_id);
CREATE INDEX IF NOT EXISTS idx_segments_chapter_id ON segments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_story_pitches_world_id ON story_pitches(world_id);
CREATE INDEX IF NOT EXISTS idx_pet_suggestions_is_approved ON pet_suggestions(is_approved);

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
