-- Migration: Add storyboard fields to segments table
-- These fields enable intentional visual planning for each segment

-- Location reference (matches Story Bible keyLocations.name)
ALTER TABLE segments ADD COLUMN IF NOT EXISTS storyboard_location VARCHAR(100);

-- NPCs that should appear (matches Story Bible recurringCharacters.name)
ALTER TABLE segments ADD COLUMN IF NOT EXISTS storyboard_characters TEXT[];

-- Shot type for camera framing
-- Values: 'wide', 'medium', 'close-up', 'extreme-close-up', 'over-shoulder'
ALTER TABLE segments ADD COLUMN IF NOT EXISTS storyboard_shot_type VARCHAR(50);

-- Camera angle for perspective
-- Values: 'eye-level', 'low-angle', 'high-angle', 'birds-eye', 'worms-eye', 'dutch-angle'
ALTER TABLE segments ADD COLUMN IF NOT EXISTS storyboard_camera_angle VARCHAR(50);

-- Visual focus - what should be emphasized in the image
ALTER TABLE segments ADD COLUMN IF NOT EXISTS storyboard_focus TEXT;

-- Continuity notes - how this segment visually connects to adjacent segments
ALTER TABLE segments ADD COLUMN IF NOT EXISTS storyboard_continuity TEXT;

-- Index for querying by location
CREATE INDEX IF NOT EXISTS idx_segments_storyboard_location ON segments(storyboard_location);
