-- Migration 012: child progress fields and date fixes
--
-- 1. task_config and last_completed_story_info were sent by the app but never
--    stored (the columns did not exist), so parent task settings were lost on
--    reload.
-- 2. mode / mode_progress prepare the child record for alternative ways to
--    play (story, puzzle, ...) without another schema change.
-- 3. last_brush_date was a TIMESTAMP that round-tripped to the app as an ISO
--    timestamp, which never matched the app's YYYY-MM-DD comparison, so
--    streaks reset after every reload. It is a plain DATE now.
-- 4. completed_story_arcs used to hold per-arc random ids instead of story
--    template ids, so no story was ever recognized as completed. Those ids
--    cannot be mapped back to a template, so they are removed.

ALTER TABLE children ADD COLUMN IF NOT EXISTS task_config JSONB DEFAULT NULL;
ALTER TABLE children ADD COLUMN IF NOT EXISTS last_completed_story_info JSONB DEFAULT NULL;
ALTER TABLE children ADD COLUMN IF NOT EXISTS mode VARCHAR(20) NOT NULL DEFAULT 'story';
ALTER TABLE children ADD COLUMN IF NOT EXISTS mode_progress JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE children ALTER COLUMN last_brush_date TYPE DATE USING last_brush_date::date;

UPDATE children
SET completed_story_arcs = ARRAY(
  SELECT x FROM unnest(completed_story_arcs) AS x
  WHERE x !~ '^[0-9]{13}-[a-z0-9]+$'
)
WHERE completed_story_arcs IS NOT NULL;
