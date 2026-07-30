-- AnonEmote — move admin state off local disk into Postgres.
--
-- The moderation lexicon and audit log previously lived in backend/data/ as
-- files. Hosts like Render use an ephemeral filesystem, so those reset on every
-- redeploy and cannot be shared across multiple instances. Storing them in
-- Postgres makes them durable and consistent.
--
-- Run in Supabase → SQL Editor → New query. Click once to place the cursor;
-- do NOT leave text selected, or only the selection executes.

-- ═══════════════════════════════════════════════════════════════════════════
-- FILTER LEXICON  (admin-editable moderation terms)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.filter_lexicon (
  category    text PRIMARY KEY CHECK (category IN ('crisis', 'toxic', 'allow')),
  terms       text[] NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed the three categories so updates are simple upserts
INSERT INTO public.filter_lexicon (category, terms)
VALUES ('crisis', '{}'), ('toxic', '{}'), ('allow', '{}')
ON CONFLICT (category) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- AUDIT LOG
-- ═══════════════════════════════════════════════════════════════════════════
-- Records moderation verdicts and admin actions. Deliberately stores NO post
-- content and NO session ids, so administrators can review system behaviour
-- without being able to read or attribute what students wrote.
CREATE TABLE IF NOT EXISTS public.audit_log (
  id       bigserial PRIMARY KEY,
  ts       timestamptz NOT NULL DEFAULT now(),
  type     text NOT NULL,
  payload  jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_ts   ON public.audit_log (ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_type ON public.audit_log (type, ts DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
-- Both tables are backend-only. RLS is enabled with no anon policies, so the
-- browser's anon key cannot read or write either one. The backend uses the
-- service role key, which bypasses RLS.
ALTER TABLE public.filter_lexicon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log      ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- RETENTION (optional)
-- ═══════════════════════════════════════════════════════════════════════════
-- Audit entries older than 90 days can be trimmed via pg_cron:
--
-- SELECT cron.schedule(
--   'trim-audit-log', '0 4 * * *',
--   $$DELETE FROM public.audit_log WHERE ts < now() - interval '90 days'$$
-- );

-- Verify — expect 3 lexicon rows and the audit_log table to exist
SELECT category, cardinality(terms) AS term_count FROM public.filter_lexicon ORDER BY category;
