-- Migration: Add possessive name audio URLs
-- This adds support for possessive forms of names (e.g., "Tim's", "Sparkle's")
-- to fix audio splicing issues with possessives

-- Add possessive audio URL column to children table
ALTER TABLE children
ADD COLUMN IF NOT EXISTS name_possessive_audio_url TEXT;

-- Add possessive audio URL column to pet_name_audio table
ALTER TABLE pet_name_audio
ADD COLUMN IF NOT EXISTS possessive_audio_url TEXT;

-- Note: After running this migration, you'll need to regenerate name audio
-- for existing children and pets to include possessive forms.
-- This can be done via:
-- 1. Admin UI: Re-upload/regenerate name audio for each profile
-- 2. Or run a script to call the TTS API for "Name's" variants
