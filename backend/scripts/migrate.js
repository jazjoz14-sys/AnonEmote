/**
 * One-off migration runner.
 *
 * Creates the reactions and reports tables directly over a Postgres
 * connection, bypassing the Supabase SQL Editor.
 *
 * Usage:
 *   1. Add SUPABASE_DB_PASSWORD=... to backend/.env
 *   2. npm run migrate
 *
 * The password is read from .env and never printed.
 */
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env') })

const password = process.env.SUPABASE_DB_PASSWORD
const supabaseUrl = process.env.SUPABASE_URL

if (!password) {
  console.error('✗ SUPABASE_DB_PASSWORD is not set in backend/.env')
  console.error('  Get it from: Supabase → Project Settings → Database → Reset database password')
  process.exit(1)
}
if (!supabaseUrl) {
  console.error('✗ SUPABASE_URL is not set in backend/.env')
  process.exit(1)
}

// Derive the project ref from the API URL: https://<ref>.supabase.co
const projectRef = new URL(supabaseUrl).hostname.split('.')[0]

const SQL = `
-- reactions
CREATE TABLE IF NOT EXISTS public.reactions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  session_id  text NOT NULL,
  emoji       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reactions_one_per_session UNIQUE (post_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON public.reactions (post_id);

-- reports
CREATE TABLE IF NOT EXISTS public.reports (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  session_id  text NOT NULL,
  reason      text NOT NULL,
  note        text,
  reviewed    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reports_one_per_session UNIQUE (post_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_reports_post ON public.reports (post_id);

-- is_hidden flag on posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- auto-hide after 3 distinct reports
CREATE OR REPLACE FUNCTION public.auto_hide_reported_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE report_total int;
BEGIN
  SELECT COUNT(*) INTO report_total FROM public.reports WHERE post_id = NEW.post_id;
  IF report_total >= 3 THEN
    UPDATE public.posts SET is_hidden = true WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_auto_hide_reported_post ON public.reports;
CREATE TRIGGER trg_auto_hide_reported_post
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.auto_hide_reported_post();

-- RLS on (backend uses service role, which bypasses it)
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports   ENABLE ROW LEVEL SECURITY;

-- make PostgREST pick up the new tables immediately
NOTIFY pgrst, 'reload schema';
`

// Supabase pooler connection (IPv4-friendly, works without IPv6)
const client = new pg.Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
})

try {
  console.log(`→ connecting to project ${projectRef} ...`)
  await client.connect()
  console.log('✓ connected')

  await client.query(SQL)
  console.log('✓ migration applied')

  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('posts','reactions','reports')
    ORDER BY table_name
  `)
  console.log('✓ tables present:', rows.map((r) => r.table_name).join(', '))
} catch (err) {
  console.error('✗ migration failed:', err.message)
  if (err.message.includes('password authentication failed')) {
    console.error('  → The password in SUPABASE_DB_PASSWORD is wrong. Reset it in the dashboard.')
  }
  if (err.message.includes('ENOTFOUND') || err.message.includes('ETIMEDOUT')) {
    console.error('  → Could not reach the pooler host. Check the region in this script')
    console.error('    against Project Settings → Database → Connection pooling → Host.')
  }
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
