-- AnonEmote — Doodle Drift planet
-- Adds 'doodle' as an allowed planet_id and a drawing column for image data.

-- 1. Allow 'doodle' in the planet_id constraint
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_planet_id_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_planet_id_check
  CHECK (planet_id IN ('joy','vent','advice','grief','anxiety','neutral','doodle'));

-- 2. Drawing column — stores base64 data URL of the canvas PNG.
--    Only populated for doodle planet posts; NULL for text posts.
--    Max ~500KB base64 which covers a 400x400 canvas comfortably.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS drawing TEXT;

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'drawing';
