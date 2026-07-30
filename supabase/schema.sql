-- AnonEmote Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.

-- ═══════════════════════════════════════════════════════════════════════════
-- POSTS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.posts (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  content     TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 280),
  planet_id   TEXT        NOT NULL CHECK (planet_id IN ('joy','vent','advice','grief','anxiety','neutral')),
  session_id  TEXT        NOT NULL,  -- anonymous UUID, not linked to any account
  is_hidden   BOOLEAN     NOT NULL DEFAULT FALSE,  -- auto-hidden after N reports
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Older databases: add the column if the table already existed
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_posts_planet_id  ON public.posts (planet_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visible    ON public.posts (planet_id, created_at DESC)
  WHERE is_hidden = FALSE;

-- ═══════════════════════════════════════════════════════════════════════════
-- REACTIONS  (emoji only — no likes, no ranking)
-- ═══════════════════════════════════════════════════════════════════════════
-- Allowed emoji are constrained at the DB level so no arbitrary text can be
-- injected as a "reaction". Empathy-oriented set only.
CREATE TABLE IF NOT EXISTS public.reactions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  session_id  TEXT        NOT NULL,
  emoji       TEXT        NOT NULL CHECK (emoji IN ('🫂','💙','😢','🌱','✨')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One reaction per session per post. Reacting again replaces/removes it.
  CONSTRAINT reactions_one_per_session UNIQUE (post_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_post ON public.reactions (post_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- REPORTS
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.reports (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  session_id  TEXT        NOT NULL,
  reason      TEXT        NOT NULL CHECK (reason IN
                            ('harassment','hate_speech','self_harm','spam','other')),
  note        TEXT        CHECK (note IS NULL OR char_length(note) <= 300),
  reviewed    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One report per session per post — prevents a single user inflating counts
  CONSTRAINT reports_one_per_session UNIQUE (post_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_post     ON public.reports (post_id);
CREATE INDEX IF NOT EXISTS idx_reports_unreviewed ON public.reports (created_at DESC)
  WHERE reviewed = FALSE;

-- ═══════════════════════════════════════════════════════════════════════════
-- AUTO-HIDE TRIGGER
-- Hides a post once 3 distinct sessions have reported it.
-- ═══════════════════════════════════════════════════════════════════════════
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
  FROM public.reports
  WHERE post_id = NEW.post_id;

  IF report_total >= 3 THEN
    UPDATE public.posts
    SET is_hidden = TRUE
    WHERE id = NEW.post_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_hide_reported_post ON public.reports;
CREATE TRIGGER trg_auto_hide_reported_post
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_hide_reported_post();

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports   ENABLE ROW LEVEL SECURITY;

-- ── Posts: readable by anyone, but only visible ones ────────────────────────
DROP POLICY IF EXISTS "Visible posts are readable by all" ON public.posts;
CREATE POLICY "Visible posts are readable by all"
  ON public.posts FOR SELECT
  USING (is_hidden = FALSE);

-- Inserts go through the backend service role (which bypasses RLS) after
-- moderation. No direct anon insert — this closes the moderation bypass.
DROP POLICY IF EXISTS "Anon users can insert posts" ON public.posts;

-- ── Reactions: anyone can read counts and manage their own ──────────────────
DROP POLICY IF EXISTS "Reactions readable by all" ON public.reactions;
CREATE POLICY "Reactions readable by all"
  ON public.reactions FOR SELECT USING (TRUE);

-- ── Reports: write-only from the client's perspective ───────────────────────
-- Nobody can read reports from the anon key (prevents seeing who reported what).
-- Backend service role handles all report reads.

-- ═══════════════════════════════════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- OPTIONAL CLEANUP (enable via pg_cron if desired)
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT cron.schedule(
--   'cleanup-old-posts', '0 3 * * *',
--   $$DELETE FROM public.posts WHERE created_at < NOW() - INTERVAL '30 days'$$
-- );
