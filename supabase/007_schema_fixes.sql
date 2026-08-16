-- ============================================================================
-- 007: Schema fixes from audit
--
-- Fixes critical issues:
-- 1. Add 'doodle' to planet_id CHECK constraint
-- 2. Add missing columns (drawing, author_id, review_status, etc.)
-- 3. Add missing replies table if it doesn't exist
-- ============================================================================

-- ── Fix planet_id CHECK constraint (add 'doodle') ─────────────────────────
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_planet_id_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_planet_id_check
  CHECK (planet_id IN ('joy', 'vent', 'advice', 'grief', 'anxiety', 'neutral', 'doodle'));

-- ── Add missing columns to posts ──────────────────────────────────────────
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS drawing TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS report_score INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- ── Add missing columns to reports ────────────────────────────────────────
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reporter_hash TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 1;

-- ── Create replies table if missing ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 280),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for replies
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read replies" ON public.replies;
CREATE POLICY "Anyone can read replies"
  ON public.replies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can insert replies" ON public.replies;
CREATE POLICY "Service role can insert replies"
  ON public.replies FOR INSERT
  WITH CHECK (true);

-- ── Ensure posts content constraint allows drawings ───────────────────────
-- Drawings send '[drawing]' as content, so the 1-char minimum is fine.
-- But let's make content nullable for drawing-only posts in the future:
ALTER TABLE public.posts ALTER COLUMN content DROP NOT NULL;

COMMENT ON COLUMN public.posts.drawing IS 'Base64 PNG data URL for Doodle Drift planet posts';
COMMENT ON COLUMN public.posts.author_id IS 'Links to auth.users for accountability (hidden from other users)';
COMMENT ON COLUMN public.posts.review_status IS 'pending | protected | flagged';
