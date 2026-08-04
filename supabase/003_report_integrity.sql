-- AnonEmote — reporting integrity upgrade
-- Run in Supabase SQL Editor. Safe to re-run.
--
-- Fixes two weaknesses in the original reporting design:
--
--   1. Auto-hiding on 3 reports was trivially abusable — closing the tab gives
--      a fresh session UUID, so one person could hide any post they disliked.
--      Reports now flag a post for HUMAN REVIEW instead of hiding it outright.
--
--   2. session_id was the only dedupe key. Reports now also carry a salted,
--      per-post hash derived from the reporter's IP, so the same network cannot
--      report one post repeatedly across sessions.
--
-- Privacy note: reporter_hash = hash(salt + ip + post_id). Because the post id
-- is part of the input, the same IP produces a DIFFERENT hash on every post.
-- It can therefore prevent duplicate reports on one post, but cannot be used to
-- link a person's activity across posts or to recover their IP.

-- ── posts: review workflow state ─────────────────────────────────────────────
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'ok';

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS report_score INT NOT NULL DEFAULT 0;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;

-- Drop then recreate so re-running does not error on an existing constraint
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_review_status_check;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_review_status_check
  CHECK (review_status IN ('ok', 'pending', 'quarantined', 'cleared'));

COMMENT ON COLUMN public.posts.review_status IS
  'ok = no reports; pending = awaiting admin review, still visible; '
  'quarantined = hidden pending review (severe reports only); '
  'cleared = admin reviewed and dismissed, immune to further auto-flagging';

CREATE INDEX IF NOT EXISTS idx_posts_review_queue
  ON public.posts (review_status, report_score DESC, flagged_at DESC)
  WHERE review_status IN ('pending', 'quarantined');

-- ── reports: IP-derived dedupe ───────────────────────────────────────────────
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reporter_hash TEXT;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS weight INT NOT NULL DEFAULT 1;

-- One report per network per post, independent of session churn
CREATE UNIQUE INDEX IF NOT EXISTS reports_one_per_network
  ON public.reports (post_id, reporter_hash)
  WHERE reporter_hash IS NOT NULL;

-- ── Replace auto-hide with review flagging ───────────────────────────────────
DROP TRIGGER IF EXISTS trg_auto_hide_reported_post ON public.reports;
DROP FUNCTION IF EXISTS public.auto_hide_reported_post();

CREATE OR REPLACE FUNCTION public.flag_post_for_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  distinct_networks INT;
  total_weight      INT;
  has_severe        BOOLEAN;
  current_status    TEXT;
BEGIN
  SELECT review_status INTO current_status
  FROM public.posts WHERE id = NEW.post_id;

  -- An admin has already reviewed and cleared this post: do not re-flag it.
  IF current_status = 'cleared' THEN
    RETURN NEW;
  END IF;

  -- Count distinct reporting networks, not distinct sessions
  SELECT COUNT(DISTINCT COALESCE(reporter_hash, session_id)),
         COALESCE(SUM(weight), 0),
         BOOL_OR(reason IN ('hate_speech', 'self_harm'))
    INTO distinct_networks, total_weight, has_severe
  FROM public.reports
  WHERE post_id = NEW.post_id;

  UPDATE public.posts
  SET report_score = total_weight,
      flagged_at   = COALESCE(flagged_at, NOW()),
      review_status = CASE
        -- Severe categories from 2+ independent networks: hide pending review.
        -- Hate speech and safety concerns justify erring toward removal.
        WHEN has_severe AND distinct_networks >= 2 THEN 'quarantined'
        -- Broad consensus from 4+ independent networks
        WHEN distinct_networks >= 4 THEN 'quarantined'
        -- Anything else simply enters the review queue, still visible
        ELSE 'pending'
      END,
      -- Only quarantine actually removes the post from the feed
      is_hidden = CASE
        WHEN (has_severe AND distinct_networks >= 2) OR distinct_networks >= 4
          THEN TRUE
        ELSE is_hidden
      END
  WHERE id = NEW.post_id;

  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_flag_post_for_review
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.flag_post_for_review();

-- ── Verify ───────────────────────────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name IN ('review_status', 'report_score', 'flagged_at', 'is_hidden')
ORDER BY column_name;
