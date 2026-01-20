-- Add storyboard_object_ids column to segments table
-- This allows tagging specific objects from visualAssets to each segment

ALTER TABLE segments ADD COLUMN IF NOT EXISTS storyboard_object_ids TEXT[];
