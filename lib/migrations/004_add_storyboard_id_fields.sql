-- Migration 004: Add ID-based storyboard fields
-- These fields reference Story Bible visualAssets by ID for more precise lookups

-- Add storyboard_location_id to store visual asset ID instead of name
ALTER TABLE segments ADD COLUMN IF NOT EXISTS storyboard_location_id VARCHAR(100);

-- Add storyboard_character_ids to store visual asset IDs instead of names
ALTER TABLE segments ADD COLUMN IF NOT EXISTS storyboard_character_ids TEXT[];

-- Note: The old storyboard_location and storyboard_characters fields are kept for backwards compatibility
-- New storyboards will populate both the name-based and ID-based fields
-- Image generation will prefer ID-based lookups when available
