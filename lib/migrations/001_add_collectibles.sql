-- Migration: Add collectibles support to BrushQuest
-- Run this in your Neon SQL Editor to add collectibles features

-- 1. Create collectibles catalog table
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

-- 2. Add collectibles columns to children table
ALTER TABLE children ADD COLUMN IF NOT EXISTS collected_stickers TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE children ADD COLUMN IF NOT EXISTS collected_accessories TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE children ADD COLUMN IF NOT EXISTS equipped_accessories JSONB DEFAULT '{}';

-- 3. Verify the migration
SELECT 'Migration completed successfully!' as status;
