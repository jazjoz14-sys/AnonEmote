-- 009_security_fixes.sql
-- Fixes Supabase security linter warnings (items 1-5)
-- Item 6 (leaked password protection) requires a dashboard toggle.
--
-- Run in Supabase SQL Editor after 008_evaluations.sql

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Function search_path mutable
-- Sets an immutable search_path on handle_new_user to prevent injection
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. RLS policy: posts INSERT always true
-- All post inserts go through the backend (service_role key) after moderation.
-- Anon/authenticated clients should never insert directly.
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anon users can insert posts" ON public.posts;
CREATE POLICY "Service role can insert posts"
  ON public.posts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. RLS policy: replies INSERT always true
-- Same rationale — replies go through the backend moderation pipeline.
-- ═══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Service role can insert replies" ON public.replies;
CREATE POLICY "Service role can insert replies"
  ON public.replies
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4+5. SECURITY DEFINER function callable by anon/authenticated
-- handle_new_user() is triggered by auth.users INSERT, never called via RPC.
-- Revoking EXECUTE prevents abuse via /rest/v1/rpc/handle_new_user.
-- ═══════════════════════════════════════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTE: Item 6 (Leaked Password Protection) is a dashboard setting.
-- Enable it in: Supabase Dashboard → Authentication → Settings → Security
-- Toggle "Enable Leaked Password Protection" to ON.
-- ═══════════════════════════════════════════════════════════════════════════════
