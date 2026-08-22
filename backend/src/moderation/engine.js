/**
 * AnonEmote Hybrid AI Content Moderation Engine
 *
 * Three layers, evaluated in order:
 *
 *   Layer 1 — CRISIS (Aho-Corasick, built-in + admin crisis terms)
 *     Suicidal ideation / self-harm. Highest priority, overrides everything.
 *     → verdict 'crisis' (403 + emergency referral UI)
 *
 *   Layer 2 — VERNACULAR TOXICITY (Aho-Corasick, built-in + admin toxic terms)
 *     Perspective API does not support Filipino languages, so these are
 *     matched locally with word-boundary validation.
 *     → verdict 'toxic' (406) or 'review' (if ≥3 safe-context phrases)
 *
 *   Layer 3 — ML TOXICITY (Google Perspective API, English)
 *     Catches nuanced/novel toxicity that keyword lists miss.
 *     → verdict 'toxic' (406)
 *
 *   Fallback: if Perspective is unavailable, an Aho-Corasick scan against
 *   the English toxic list is used so moderation never silently fails open.
 *
 * Architecture changes (multilingual-word-filter spec):
 * - Built-in terms loaded from JSON lexicons at startup via lexiconLoader
 * - 10-step normalization pipeline from normalize.js
 * - Aho-Corasick multi-pattern matching from matcher.js
 * - Safe-context phrase suppression from safeContext.js
 * - Word-boundary validation prevents partial-word false positives
 * - Admin terms merged into automata; rebuildable via rebuildAutomata()
 */

import { scoreText, evaluateScores } from './perspective.js'
import { getLexiconSync } from '../lib/storage.js'
import { loadBuiltInLexicons } from './lexiconLoader.js'
import { normalize } from './normalize.js'
import { buildAutomaton, searchAll, hasWordBoundary } from './matcher.js'
import { findSafeContextMatches, isCoveredBySafeContext } from './safeContext.js'

// ── In-memory matcher state ──────────────────────────────────────────────────
// Built at startup and rebuilt when admin lexicon changes.

/** @type {import('./matcher.js').default|null} */
let crisisAutomaton = null
/** @type {import('./matcher.js').default|null} */
let toxicAutomaton = null
/** @type {import('./matcher.js').default|null} */
let safeContextAutomaton = null
/** @type {import('./matcher.js').default|null} */
let fallbackAutomaton = null
/** @type {Map<string, string>} term → source file or 'admin' */
let termSourceMap = new Map()
/** @type {{ crisis: string[], toxic: string[], safeContext: string[] }} */
let builtIn = { crisis: [], toxic: [], safeContext: [] }
/** @type {boolean} Whether initial startup build is complete */
let initialized = false

// ── Startup: Load built-in lexicons and build automata ───────────────────────

/**
 * Initialize the moderation engine by loading built-in lexicons and building
 * Aho-Corasick automata. Called once at module load time.
 *
 * After this completes, the engine is ready to accept moderation requests.
 */
function initializeEngine() {
  const loaded = loadBuiltInLexicons()

  builtIn = {
    crisis: [...loaded.crisis],
    toxic: [...loaded.toxic],
    safeContext: [...loaded.safeContext]
  }
  termSourceMap = loaded.termSourceMap

  // Build automata using built-in terms + current admin terms
  rebuildAutomata()
  initialized = true
}

/**
 * Rebuild all Aho-Corasick automata from current built-in + admin terms.
 *
 * Called at startup and whenever the admin lexicon changes. If rebuild fails,
 * the previous automata are preserved and the error is logged.
 *
 * @returns {boolean} true if rebuild succeeded, false otherwise
 */
export function rebuildAutomata() {
  try {
    const admin = getLexiconSync() || { crisis: [], toxic: [], allow: [] }

    // Crisis: built-in + admin crisis
    const adminCrisis = Array.isArray(admin.crisis) ? admin.crisis : []
    const adminToxic = Array.isArray(admin.toxic) ? admin.toxic : []
    const adminAllow = Array.isArray(admin.allow) ? admin.allow : []

    const allCrisis = [...builtIn.crisis, ...adminCrisis]
    crisisAutomaton = buildAutomaton(allCrisis)

    // Toxic: built-in toxic + admin toxic
    const allToxic = [...builtIn.toxic, ...adminToxic]
    toxicAutomaton = buildAutomaton(allToxic)

    // Safe-context: built-in safe-context + admin allow (allow terms act as safe-context spans)
    const allSafeContext = [...builtIn.safeContext, ...adminAllow]
    safeContextAutomaton = buildAutomaton(allSafeContext)

    // Fallback: only the built-in toxic list (for when Perspective is down)
    // This includes EN + TL + BCL terms since they're all in builtIn.toxic
    fallbackAutomaton = buildAutomaton([...builtIn.toxic])

    // Update term source map with admin terms
    for (const term of adminCrisis) {
      if (!termSourceMap.has(term)) termSourceMap.set(term, 'admin')
    }
    for (const term of adminToxic) {
      if (!termSourceMap.has(term)) termSourceMap.set(term, 'admin')
    }
    for (const term of adminAllow) {
      if (!termSourceMap.has(term)) termSourceMap.set(term, 'admin')
    }

    return true
  } catch (err) {
    console.error('[Moderation] Failed to rebuild automata:', err.message)
    return false
  }
}

// Re-export normalize for backward compatibility (existing imports still work)
export { normalize }

/**
 * Helper: Check if any term from a list appears in the raw or normalized text.
 * Used for admin allow-list checking (simple substring match, backward compat).
 *
 * @param {string[]} list - Terms to check
 * @param {string} raw - Lowercased trimmed raw text
 * @param {string} clean - Normalized text
 * @returns {string|undefined} The matching term, or undefined
 */
function matchesAny(list, raw, clean) {
  return list.find((kw) => raw.includes(kw) || clean.includes(kw))
}

/**
 * Determine the source label for a matched term.
 *
 * @param {string} term - The matched term
 * @returns {'built-in'|'admin'} The source label
 */
function getTermSource(term) {
  const source = termSourceMap.get(term)
  if (source === 'admin') return 'admin'
  return 'built-in'
}

/**
 * Internal evaluation core — shared by moderate() and moderateDryRun().
 *
 * @param {string} text - Raw post text
 * @param {{ dryRun?: boolean }} [options] - Options
 * @returns {Promise<{
 *   verdict: 'safe'|'toxic'|'crisis'|'review',
 *   reason?: string,
 *   layer?: string,
 *   scores?: Record<string, number>,
 *   matchedTerm?: string|null,
 *   matchedTerms?: string[],
 *   normalizedText?: string,
 *   lexiconSource?: 'built-in'|'admin'|'perspective-api'|null
 * }>}
 */
async function _evaluate(text, options = {}) {
  // ── Validation ──────────────────────────────────────────────────────────
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { verdict: 'toxic', reason: 'Empty submission.', layer: 'validation' }
  }
  if (text.length > 280) {
    return { verdict: 'toxic', reason: 'Message exceeds 280 characters.', layer: 'validation' }
  }

  // Lazy rebuild: if automata weren't built at startup (e.g., test mock timing),
  // rebuild now so they're ready for matching.
  if (!crisisAutomaton && !toxicAutomaton) {
    rebuildAutomata()
  }

  const raw = text.toLowerCase().trim()

  // ── Step 1: Normalize with the 10-step pipeline ─────────────────────────
  const clean = normalize(text)

  // ── Step 2: Safe-Context Pre-scan ───────────────────────────────────────
  // Find all safe-context phrase positions BEFORE toxic matching
  const safeContextMatches = findSafeContextMatches(clean, safeContextAutomaton)

  // Admin-managed lexicon for legacy allow-list behavior
  const custom = getLexiconSync()

  // ── Layer 1: Crisis (built-in + admin) — AC scan ────────────────────────
  // Crisis detection CANNOT be overridden by any allow-list or safe-context
  const crisisMatches = searchAll(crisisAutomaton, clean, 'built-in')
  // Also check raw text for multi-word phrases that might not survive normalization
  const crisisMatchesRaw = searchAll(crisisAutomaton, raw, 'built-in')

  const crisisHit = crisisMatches.length > 0 || crisisMatchesRaw.length > 0
  if (crisisHit) {
    const hitTerm = crisisMatches[0]?.term || crisisMatchesRaw[0]?.term
    return {
      verdict: 'crisis',
      reason: 'Crisis indicators detected.',
      layer: 'crisis-keywords',
      matchedTerm: hitTerm || null,
      lexiconSource: hitTerm ? getTermSource(hitTerm) : null
    }
  }

  // ── Admin Allow-list (legacy behavior) ──────────────────────────────────
  // If text matches an admin allow entry, skip toxic layers entirely.
  // This is the legacy short-circuit behavior for backward compatibility.
  const allowHit = matchesAny(custom.allow, raw, clean)
  if (allowHit) {
    return { verdict: 'safe', layer: 'admin-allowlist', matchedTerm: null, lexiconSource: null }
  }

  // ── Layer 2a: Admin-added toxic terms ───────────────────────────────────
  const adminToxicHit = matchesAny(custom.toxic, raw, clean)
  if (adminToxicHit) {
    return {
      verdict: 'toxic',
      reason: 'Your message was flagged for harmful language and cannot be posted.',
      layer: 'admin-lexicon',
      matchedTerm: adminToxicHit,
      lexiconSource: 'admin'
    }
  }

  // ── Layer 2b: Built-in Toxic — AC scan with word-boundary validation ────
  const toxicMatches = searchAll(toxicAutomaton, clean, 'built-in')
  // Also scan raw text for multi-word phrases
  const toxicMatchesRaw = searchAll(toxicAutomaton, raw, 'built-in')

  // Merge matches, preferring clean-text matches
  const allToxicMatches = [...toxicMatches, ...toxicMatchesRaw]

  // Validate with word-boundary detection and safe-context suppression
  const validToxicMatches = []

  for (const match of toxicMatches) {
    // Single-word terms need word-boundary validation
    if (!hasWordBoundary(clean, match)) {
      continue
    }
    // Check if this match is covered by a safe-context phrase
    if (isCoveredBySafeContext(match, safeContextMatches)) {
      continue
    }
    validToxicMatches.push(match)
  }

  // Also check raw-text matches for multi-word terms
  for (const match of toxicMatchesRaw) {
    // Multi-word terms from raw text (they auto-pass word-boundary)
    if (!match.term.includes(' ')) continue // single-word already checked on clean text
    // Check safe-context coverage using raw-text positions against safe-context on clean
    // For raw matches, we skip safe-context check since positions don't align with clean
    validToxicMatches.push(match)
  }

  if (validToxicMatches.length > 0) {
    // Apply the ≥3 safe-context "review" logic
    const distinctSafeContextCount = new Set(safeContextMatches.map(m => m.phrase)).size

    if (distinctSafeContextCount >= 3) {
      // Post held for admin review instead of rejected
      return {
        verdict: 'review',
        reason: 'Post held for review — toxic language detected alongside emotional expression.',
        layer: 'vernacular-keywords',
        matchedTerm: validToxicMatches[0].term,
        matchedTerms: [...new Set(validToxicMatches.map(m => m.term))],
        lexiconSource: getTermSource(validToxicMatches[0].term)
      }
    }

    return {
      verdict: 'toxic',
      reason: 'Your message was flagged for harmful language and cannot be posted.',
      layer: 'vernacular-keywords',
      matchedTerm: validToxicMatches[0].term,
      matchedTerms: [...new Set(validToxicMatches.map(m => m.term))],
      lexiconSource: getTermSource(validToxicMatches[0].term)
    }
  }

  // ── Layer 3: Perspective API (English ML scoring) ───────────────────────
  const result = await scoreText(text)

  if (result.ok) {
    const verdict = evaluateScores(result.scores)
    if (verdict.blocked) {
      return {
        verdict: 'toxic',
        reason: 'Your message was flagged by our AI moderation and cannot be posted.',
        layer: `perspective:${verdict.attribute}`,
        scores: result.scores,
        matchedTerm: verdict.attribute,
        lexiconSource: 'perspective-api'
      }
    }
    return { verdict: 'safe', layer: 'perspective', scores: result.scores, matchedTerm: null, lexiconSource: null }
  }

  // ── Fallback: Perspective unavailable → AC scan against built-in toxic ──
  console.warn('[Moderation] Perspective unavailable, using fallback:', result.error)

  const fallbackMatches = searchAll(fallbackAutomaton, clean, 'built-in')
  const fallbackMatchesRaw = searchAll(fallbackAutomaton, raw, 'built-in')

  // Validate fallback matches with word-boundary
  let fallbackHit = null
  for (const match of fallbackMatches) {
    if (!hasWordBoundary(clean, match)) continue
    if (isCoveredBySafeContext(match, safeContextMatches)) continue
    fallbackHit = match
    break
  }
  // Check raw-text multi-word matches
  if (!fallbackHit) {
    for (const match of fallbackMatchesRaw) {
      if (!match.term.includes(' ')) continue
      fallbackHit = match
      break
    }
  }

  if (fallbackHit) {
    return {
      verdict: 'toxic',
      reason: 'Your message was flagged for harmful language and cannot be posted.',
      layer: 'english-fallback',
      matchedTerm: fallbackHit.term,
      lexiconSource: getTermSource(fallbackHit.term)
    }
  }

  return { verdict: 'safe', layer: 'english-fallback', matchedTerm: null, lexiconSource: null }
}

/**
 * Run full hybrid moderation.
 *
 * @param {string} text
 * @returns {Promise<{
 *   verdict: 'safe'|'toxic'|'crisis'|'review',
 *   reason?: string,
 *   layer?: string,
 *   scores?: Record<string, number>,
 *   matchedTerm?: string|null,
 *   matchedTerms?: string[]
 * }>}
 */
export async function moderate(text) {
  return _evaluate(text)
}

/**
 * Dry-run evaluation — same logic as moderate() but never persists data.
 * Returns enriched metadata for the admin console.
 *
 * @param {string} text
 * @returns {Promise<{
 *   verdict: 'safe'|'toxic'|'crisis'|'review',
 *   matchedTerm: string|null,
 *   lexiconSource: 'built-in'|'admin'|'perspective-api'|null,
 *   layer: string,
 *   normalizedText: string,
 *   scores?: Record<string, number>
 * }>}
 */
export async function moderateDryRun(text) {
  const result = await _evaluate(text, { dryRun: true })

  // Compute normalized text for the response
  const normalizedText = (text && typeof text === 'string') ? normalize(text) : ''

  // Per Req 10.3: safe verdicts report layer as 'none' (no layer triggered)
  const layer = result.verdict === 'safe' ? 'none' : (result.layer || 'none')

  return {
    verdict: result.verdict,
    matchedTerm: result.matchedTerm ?? null,
    lexiconSource: result.lexiconSource ?? null,
    layer,
    normalizedText,
    ...(result.scores ? { scores: result.scores } : {}),
    ...(result.matchedTerms ? { matchedTerms: result.matchedTerms } : {})
  }
}

// ── Initialize engine at module load ─────────────────────────────────────────
// This ensures automata are ready before any HTTP requests arrive (Req 8.3).
try {
  initializeEngine()
} catch (err) {
  console.error('[Moderation] CRITICAL: Engine initialization failed:', err.message)
  console.error('[Moderation] Engine will operate with empty built-in lists. Admin terms may still work.')
}
