-- Migration: Add name audio variant arrays for natural variety
-- This stores multiple versions of name audio to reduce monotony in audio splicing

-- Add audio URL arrays to children table
ALTER TABLE children
ADD COLUMN IF NOT EXISTS name_audio_urls TEXT[];

ALTER TABLE children
ADD COLUMN IF NOT EXISTS name_possessive_audio_urls TEXT[];

-- Add audio URL arrays to pet_name_audio table
ALTER TABLE pet_name_audio
ADD COLUMN IF NOT EXISTS audio_urls TEXT[];

ALTER TABLE pet_name_audio
ADD COLUMN IF NOT EXISTS possessive_audio_urls TEXT[];

-- Note: The existing single URL columns (name_audio_url, name_possessive_audio_url, etc.)
-- are kept for backwards compatibility. The arrays provide 3 versions for variety.
