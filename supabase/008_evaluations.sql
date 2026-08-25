-- ============================================================================
-- 008: User Evaluations table
--
-- Stores in-app feedback from authenticated users:
-- - Cosmic-themed 1–5 experience rating (required)
-- - Optional planet topic suggestion (moderated, max 140 chars)
-- - Optional quick feedback area selections (text array)
-- - Admin review tracking
--
-- Privacy: RLS enabled with NO policies for anon/authenticated roles.
-- All access goes through the backend service_role which bypasses RLS.
-- ============================================================================

-- ── Create evaluations table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evaluations (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating            INTEGER     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  suggestion        TEXT        CHECK (suggestion IS NULL OR char_length(suggestion) <= 140),
  moderation_status TEXT        NOT NULL DEFAULT 'approved'
                                CHECK (moderation_status IN ('approved', 'pending_review', 'rejected')),
  feedback_areas    TEXT[]      DEFAULT '{}',
  reviewed          BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON public.evaluations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluations_author     ON public.evaluations (author_id);

-- ── Row Level Security ────────────────────────────────────────────────────
-- Enable RLS with no policies for anon or authenticated roles.
-- This means zero direct table access from the client.
-- Only the backend's service_role (which bypasses RLS) can read/write.
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.evaluations IS 'User feedback evaluations — anonymous in social layer, author_id for admin investigation only';
COMMENT ON COLUMN public.evaluations.author_id IS 'Links to auth.users for admin accountability (never exposed to clients)';
COMMENT ON COLUMN public.evaluations.moderation_status IS 'approved | pending_review (moderation timeout) | rejected (toxic suggestion)';
COMMENT ON COLUMN public.evaluations.feedback_areas IS 'Array of selected feedback area IDs in selection order';
COMMENT ON COLUMN public.evaluations.reviewed IS 'Whether an admin has marked this evaluation as reviewed';
