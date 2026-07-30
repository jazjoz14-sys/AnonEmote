-- AnonEmote — reactions + reports only.
-- Run this in the Supabase SQL Editor if the full schema.sql failed.
-- Each statement is independent, so you can run them one block at a time.

-- 1. is_hidden column on posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. reactions table
CREATE TABLE IF NOT EXISTS public.reactions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_post ON public.reactions (post_id);

-- 3. reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  reason      TEXT NOT NULL,
  note        TEXT,
  reviewed    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_post ON public.reports (post_id);

-- 4. Auto-hide a post after 3 distinct reports
CREATE OR REPLACE FUNCTION public.auto_hide_reported_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_total INT;
BEGIN
  SELECT COUNT(*) INTO report_total
  FROM public.reports WHERE post_id = NEW.post_id;

  IF report_total >= 3 THEN
    UPDATE public.posts SET is_hidden = TRUE WHERE id = NEW.post_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_hide_reported_post ON public.reports;
CREATE TRIGGER trg_auto_hide_reported_post
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.auto_hide_reported_post();

-- 5. RLS — the backend uses the service role key, which bypasses RLS.
--    Reads of reaction counts happen through the backend, so SELECT for anon
--    is optional. Enable RLS with no anon policies = backend-only access.
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports   ENABLE ROW LEVEL SECURITY;

-- 6. Verify — should return 2 rows
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('reactions', 'reports');
