-- Migration: Add title_narration_sequence to chapters table
-- Allows pre-recorded audio for chapter title announcements

ALTER TABLE chapters ADD COLUMN IF NOT EXISTS title_narration_sequence JSONB;
