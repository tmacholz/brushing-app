-- Add image_history column to segments for gallery feature
-- Stores array of {url: string, created_at: string} objects

ALTER TABLE segments ADD COLUMN IF NOT EXISTS image_history JSONB DEFAULT '[]';

-- Add image_history to story_references too
ALTER TABLE story_references ADD COLUMN IF NOT EXISTS image_history JSONB DEFAULT '[]';

-- Add cover_image_history to stories
ALTER TABLE stories ADD COLUMN IF NOT EXISTS cover_image_history JSONB DEFAULT '[]';

-- Add reference_ids to segments for explicit reference tagging
-- Stores array of reference UUIDs that should be used for this segment's image generation
ALTER TABLE segments ADD COLUMN IF NOT EXISTS reference_ids UUID[] DEFAULT '{}';
