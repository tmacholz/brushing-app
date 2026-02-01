-- Migration 011: Add visual asset metadata columns to story_references
-- Part of the consolidation of visualAssets into story_references as single source of truth

ALTER TABLE story_references ADD COLUMN IF NOT EXISTS mood TEXT;
ALTER TABLE story_references ADD COLUMN IF NOT EXISTS personality TEXT;
ALTER TABLE story_references ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE story_references ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
