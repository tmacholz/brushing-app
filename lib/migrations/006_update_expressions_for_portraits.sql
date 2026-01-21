-- Update pose definitions to use expressions for portrait-style generation
-- These are now facial expressions (shoulders-up portraits) instead of full-body poses

-- Clear existing pose definitions
DELETE FROM pose_definitions;

-- Child expressions (portrait style - focus on facial expression)
INSERT INTO pose_definitions (character_type, pose_key, display_name, generation_prompt, sort_order) VALUES
('child', 'happy', 'Happy', 'Warm genuine smile, bright cheerful eyes, relaxed happy expression, content and friendly', 1),
('child', 'sad', 'Sad', 'Downturned mouth, droopy eyes looking down, melancholic expression, slightly pouty', 2),
('child', 'surprised', 'Surprised', 'Wide eyes, raised eyebrows, mouth forming an O shape, amazed and astonished expression', 3),
('child', 'worried', 'Worried', 'Furrowed brow, concerned eyes, slight frown, anxious and uncertain expression', 4),
('child', 'determined', 'Determined', 'Confident focused expression, slight smile, eyes looking forward with resolve, brave and ready', 5),
('child', 'excited', 'Excited', 'Big wide smile, sparkling eyes, raised eyebrows, overjoyed and thrilled expression', 6)
ON CONFLICT (character_type, pose_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  generation_prompt = EXCLUDED.generation_prompt,
  sort_order = EXCLUDED.sort_order;

-- Pet expressions (portrait style - focus on facial expression)
INSERT INTO pose_definitions (character_type, pose_key, display_name, generation_prompt, sort_order) VALUES
('pet', 'happy', 'Happy', 'Joyful expression, bright friendly eyes, warm content look, tail or ears showing happiness', 1),
('pet', 'sad', 'Sad', 'Droopy eyes, downcast expression, ears lowered (if applicable), melancholic look', 2),
('pet', 'surprised', 'Surprised', 'Wide startled eyes, alert expression, ears perked up (if applicable), amazed look', 3),
('pet', 'worried', 'Worried', 'Concerned expression, worried eyes, ears back or flattened (if applicable), anxious look', 4),
('pet', 'determined', 'Determined', 'Focused intent expression, confident eyes, alert and ready posture, brave loyal look', 5),
('pet', 'excited', 'Excited', 'Extremely happy expression, sparkling eyes, big smile, ears up, thrilled and energetic', 6)
ON CONFLICT (character_type, pose_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  generation_prompt = EXCLUDED.generation_prompt,
  sort_order = EXCLUDED.sort_order;

-- Remove old poses that are no longer used
DELETE FROM pose_definitions WHERE pose_key IN ('walking', 'following', 'alert');
