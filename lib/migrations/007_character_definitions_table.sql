-- Character definitions table to store avatar URLs in the database
-- This replaces the static src/data/characters.ts file

CREATE TABLE IF NOT EXISTS character_definitions (
  id VARCHAR(50) PRIMARY KEY, -- 'boy', 'girl', etc.
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed initial character definitions
INSERT INTO character_definitions (id, display_name, avatar_url) VALUES
('boy', 'Boy', 'https://lg4pns09v4lekjo7.public.blob.vercel-storage.com/pet-avatars/character-boy.png'),
('girl', 'Girl', 'https://lg4pns09v4lekjo7.public.blob.vercel-storage.com/pet-avatars/character-girl.png')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  avatar_url = COALESCE(character_definitions.avatar_url, EXCLUDED.avatar_url);
