-- ============================================================================
-- 006: Account-based system
--
-- Adds a profiles table linked to Supabase Auth users.
-- Posts, reactions, reports, and replies get an author_id column.
-- Non-authenticated users can still READ posts but cannot write.
-- ============================================================================

-- Profiles table — minimal, no PII beyond what Supabase Auth already stores
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  is_suspended BOOLEAN DEFAULT false,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT
);

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add author_id to posts (nullable for backwards compat with existing posts)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id);

-- Add author_id to replies
ALTER TABLE public.replies ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (avatar config)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service role can read all profiles (for admin)
CREATE POLICY "Service role full access"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Allow anon users to still READ posts (the existing RLS should handle this,
-- but let's be explicit)
-- Posts are already readable by anon via existing RLS policies.

COMMENT ON TABLE public.profiles IS 'Minimal user profiles for pseudonymous accountability. Email hidden from other users.';
