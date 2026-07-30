/**
 * File-backed storage for the admin-editable lexicon and the audit log.
 *
 * Deliberately file-based rather than a new Postgres table: the lexicon is
 * small, read on every moderation call, and needs to survive restarts without
 * requiring another schema migration.
 */
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { promises as fs } from 'fs'
import { existsSync, mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '..', 'data')
const LEXICON_PATH = join(DATA_DIR, 'lexicon.json')
const AUDIT_PATH = join(DATA_DIR, 'audit-log.jsonl')

// Ensure the data directory exists at startup
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

/** Shape of the admin-editable lexicon. */
const EMPTY_LEXICON = { crisis: [], toxic: [], allow: [] }

// In-memory cache so the moderation hot path never touches disk
let lexiconCache = null

/**
 * Read the custom lexicon, caching in memory.
 * @returns {Promise<{crisis:string[], toxic:string[], allow:string[]}>}
 */
export async function getLexicon() {
  if (lexiconCache) return lexiconCache
  try {
    const raw = await fs.readFile(LEXICON_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    lexiconCache = {
      crisis: Array.isArray(parsed.crisis) ? parsed.crisis : [],
      toxic: Array.isArray(parsed.toxic) ? parsed.toxic : [],
      allow: Array.isArray(parsed.allow) ? parsed.allow : [],
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
 * Terms are lowercased, trimmed and de-duplicated.
 */
export async function saveLexicon(next) {
  const clean = (arr) =>
    [...new Set(
      (Array.isArray(arr) ? arr : [])
        .map((t) => String(t).toLowerCase().trim())
        .filter((t) => t.length > 0 && t.length <= 100)
    )]

  const payload = {
    crisis: clean(next.crisis),
    toxic: clean(next.toxic),
    allow: clean(next.allow),
    updatedAt: new Date().toISOString(),
  }

  await fs.writeFile(LEXICON_PATH, JSON.stringify(payload, null, 2), 'utf8')
  lexiconCache = {
    crisis: payload.crisis,
    toxic: payload.toxic,
    allow: payload.allow,
  }
  return payload
}

/**
 * Append an entry to the audit log (newline-delimited JSON).
 *
 * Never store post content or anything that could identify a user — only
 * verdicts, ids and counts. This preserves the zero-knowledge guarantee even
 * for administrators.
 */
export async function appendAudit(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry })
  try {
    await fs.appendFile(AUDIT_PATH, line + '\n', 'utf8')
  } catch (err) {
    console.error('[Audit] write failed:', err.message)
  }
}

/**
 * Read recent audit entries, newest first.
 * @param {{limit?: number, type?: string}} opts
 */
export async function readAudit({ limit = 200, type } = {}) {
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
  return filtered.reverse().slice(0, Math.min(limit, 1000))
}

// Warm the cache at startup
getLexicon().catch(() => {})
