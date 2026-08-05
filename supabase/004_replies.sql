-- AnonEmote — replies for the Seek Advice planet only.
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.replies (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 280),
  session_id  TEXT        NOT NULL,
  is_hidden   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_post ON public.replies (post_id, created_at ASC);

-- RLS: anyone can read visible replies, inserts go through the service role
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;

-- Realtime so new replies appear instantly for all clients
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.replies;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
