/**
 * Storage for the admin-editable lexicon and the audit log.
 *
 * Primary store is Postgres (Supabase), so state survives redeploys and is
 * shared across instances. If the database is unavailable the module degrades
 * to the local files it used previously, which keeps development working
 * without a configured database and prevents moderation from failing hard.
 *
 * The lexicon is cached in memory because it is read on every moderation call.
 */
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { promises as fs } from 'fs'
import { existsSync, mkdirSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { emitAudit } from './eventBus.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '..', 'data')
const LEXICON_PATH = join(DATA_DIR, 'lexicon.json')
const AUDIT_PATH = join(DATA_DIR, 'audit-log.jsonl')

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

const EMPTY_LEXICON = { crisis: [], toxic: [], allow: [] }
const CATEGORIES = ['crisis', 'toxic', 'allow']

let lexiconCache = null
let _supabase = null
/**
 * Set true when a DB call fails. Retries every 5 minutes instead of
 * permanently falling back to file storage after one blip.
 */
let dbUnavailable = false
let dbUnavailableSince = 0
const DB_RETRY_INTERVAL = 5 * 60 * 1000 // 5 minutes

function shouldRetryDb() {
  if (!dbUnavailable) return true
  if (Date.now() - dbUnavailableSince > DB_RETRY_INTERVAL) {
    dbUnavailable = false // Reset — allow one retry
    return true
  }
  return false
}

/**
 * Mark the database as temporarily unavailable. Retries after DB_RETRY_INTERVAL.
 *
 * KNOWN LIMITATION: When the DB is unavailable, audit entries fall back to the
 * local file system (backend/data/audit-log.jsonl). On Render's free tier this
 * file is EPHEMERAL — it is lost on every redeploy. To ensure persistent audit
 * storage, make sure the `audit_log` table exists in Supabase.
 */
function markDbUnavailable() {
  dbUnavailable = true
  dbUnavailableSince = Date.now()
}

function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  _supabase = createClient(url, key)
  return _supabase
}

/** Which backing store is in use — surfaced on the admin dashboard. */
export function storageMode() {
  if (!shouldRetryDb() || !getSupabase()) return 'file'
  return 'database'
}

/* ── Lexicon ──────────────────────────────────────────────────────────────── */

export function normaliseTerms(arr) {
  return [...new Set(
    (Array.isArray(arr) ? arr : [])
      .map((t) => String(t).toLowerCase().trim())
      .filter((t) => t.length > 0 && t.length <= 100)
  )]
}

/**
 * Read the lexicon, preferring the database.
 * @returns {Promise<{crisis:string[], toxic:string[], allow:string[]}>}
 */
export async function getLexicon() {
  if (lexiconCache) return lexiconCache

  const supabase = getSupabase()

  if (supabase && shouldRetryDb()) {
    const { data, error } = await supabase
      .from('filter_lexicon')
      .select('category, terms')

    if (!error && data) {
      const next = { ...EMPTY_LEXICON }
      for (const row of data) {
        if (CATEGORIES.includes(row.category)) {
          next[row.category] = Array.isArray(row.terms) ? row.terms : []
        }
      }
      lexiconCache = next
      return lexiconCache
    }

    console.warn('[Storage] lexicon DB read failed, falling back to file:', error?.message)
    markDbUnavailable()
  }

  // File fallback
  try {
    const raw = await fs.readFile(LEXICON_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    lexiconCache = {
      crisis: normaliseTerms(parsed.crisis),
      toxic: normaliseTerms(parsed.toxic),
      allow: normaliseTerms(parsed.allow),
    }
  } catch {
    lexiconCache = { ...EMPTY_LEXICON }
  }
  return lexiconCache
}

/** Synchronous cache read for the moderation hot path. */
export function getLexiconSync() {
  return lexiconCache || EMPTY_LEXICON
}

/**
 * Persist the lexicon and refresh the cache.
 * Writes to the database when available, otherwise to disk.
 */
export async function saveLexicon(next) {
  const payload = {
    crisis: normaliseTerms(next.crisis),
    toxic: normaliseTerms(next.toxic),
    allow: normaliseTerms(next.allow),
    updatedAt: new Date().toISOString(),
  }

  const supabase = getSupabase()
  let persisted = false

  if (supabase && shouldRetryDb()) {
    const rows = CATEGORIES.map((category) => ({
      category,
      terms: payload[category],
      updated_at: payload.updatedAt,
    }))

    const { error } = await supabase
      .from('filter_lexicon')
      .upsert(rows, { onConflict: 'category' })

    if (error) {
      console.warn('[Storage] lexicon DB write failed, falling back to file:', error.message)
      markDbUnavailable()
    } else {
      persisted = true
    }
  }

  if (!persisted) {
    await fs.writeFile(LEXICON_PATH, JSON.stringify(payload, null, 2), 'utf8')
  }

  lexiconCache = {
    crisis: payload.crisis,
    toxic: payload.toxic,
    allow: payload.allow,
  }
  return payload
}

/* ── Audit log ────────────────────────────────────────────────────────────── */

/**
 * Append an audit entry.
 *
 * Never records post content, session ids, or anything that could identify a
 * user — only verdicts, layers, counts and ids. This preserves anonymity even
 * from administrators.
 *
 * Fire-and-forget: callers do not await, so a slow write never delays a user.
 */
export async function appendAudit(entry) {
  const { type = 'event', ...payload } = entry || {}
  const supabase = getSupabase()

  if (supabase && shouldRetryDb()) {
    const { error } = await supabase
      .from('audit_log')
      .insert({ type, payload })

    if (!error) {
      // Broadcast to SSE listeners (fire-and-forget)
      try { emitAudit({ ts: new Date().toISOString(), type, ...payload }) } catch { /* never block persist */ }
      return
    }
    console.warn('[Storage] audit DB write failed, falling back to file:', error.message)
    markDbUnavailable()
  }

  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), type, ...payload })
    await fs.appendFile(AUDIT_PATH, line + '\n', 'utf8')
  } catch (err) {
    console.error('[Storage] audit write failed entirely:', err.message)
  }

  // Broadcast to SSE listeners (fire-and-forget)
  try { emitAudit({ ts: new Date().toISOString(), type, ...payload }) } catch { /* never block persist */ }
}

/**
 * Read recent audit entries, newest first.
 * @param {{limit?: number, type?: string}} opts
 */
export async function readAudit({ limit = 200, type } = {}) {
  const capped = Math.min(limit, 1000)
  const supabase = getSupabase()

  if (supabase && shouldRetryDb()) {
    let query = supabase
      .from('audit_log')
      .select('ts, type, payload')
      .order('ts', { ascending: false })
      .limit(capped)

    if (type) query = query.eq('type', type)

    const { data, error } = await query

    if (!error && data) {
      // Flatten payload up to the top level so the admin UI shape is unchanged
      return data.map((row) => ({ ts: row.ts, type: row.type, ...(row.payload || {}) }))
    }

    console.warn('[Storage] audit DB read failed, falling back to file:', error?.message)
    markDbUnavailable()
  }

  let raw
  try {
    raw = await fs.readFile(AUDIT_PATH, 'utf8')
  } catch {
    return []
  }

  const entries = raw
    .split('\n')
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) } catch { return null } })
    .filter(Boolean)

  const filtered = type ? entries.filter((e) => e.type === type) : entries
  return filtered.reverse().slice(0, capped)
}

// Warm the lexicon cache at startup so the first moderation call is not delayed
getLexicon().catch(() => {})
