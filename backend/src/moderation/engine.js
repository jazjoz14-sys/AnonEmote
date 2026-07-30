/**
 * AnonEmote Hybrid AI Content Moderation Engine
 *
 * Three layers, evaluated in order:
 *
 *   Layer 1 — CRISIS (local keywords, all languages)
 *     Suicidal ideation / self-harm. Highest priority, overrides everything.
 *     → verdict 'crisis' (403 + emergency referral UI)
 *
 *   Layer 2 — VERNACULAR TOXICITY (local keywords, Tagalog + Bicolano)
 *     Perspective API does not support Filipino languages, so these are
 *     matched locally.
 *     → verdict 'toxic' (406)
 *
 *   Layer 3 — ML TOXICITY (Google Perspective API, English)
 *     Catches nuanced/novel toxicity that keyword lists miss.
 *     → verdict 'toxic' (406)
 *
 *   Fallback: if Perspective is unavailable, a local English profanity list
 *   is used so moderation never silently fails open.
 */

import { scoreText, evaluateScores } from './perspective.js'
import { getLexiconSync } from '../lib/storage.js'

// ── Layer 1: Crisis keywords ─────────────────────────────────────────────────
const CRISIS_KEYWORDS = [
  // English
  'suicide', 'suicidal', 'kill myself', 'killing myself',
  'want to die', 'wanna die', 'end my life', 'end this life',
  'no reason to live', "can't go on", 'cant go on',
  "don't want to live", 'dont want to live',
  'self harm', 'self-harm', 'selfharm',
  'cut myself', 'cutting myself', 'overdose', 'hang myself',
  'wish i was dead', 'wish i were dead', 'better off dead',
  'take my own life', 'not worth living',
  // Tagalog
  'gusto kong mamatay', 'gusto ko na mamatay', 'ayaw ko na mabuhay',
  'ayaw ko na ng buhay', 'pagpapakamatay', 'magpapakamatay',
  'mamatay na ako', 'patayin ang sarili', 'sawa na akong mabuhay',
  'wala na akong dahilan para mabuhay',
  // Bicolano
  'gusto ko na magadan', 'magadan na ako', 'sukay na ako sa buhay',
  'dili na ako gusto mabuhay',
]

// ── Layer 2: Filipino vernacular toxicity ────────────────────────────────────
const VERNACULAR_TOXIC = [
  // Tagalog
  'putang ina', 'putangina', 'putang-ina', 'puta ka', 'puta',
  'gago', 'gaga', 'bobo', 'boba', 'tanga', 'ulol',
  'inutil', 'pakyu', 'pak yu', 'pokpok', 'hindot',
  'hayop ka', 'animal ka', 'leche', 'letse',
  'patayin kita', 'papatayin kita', 'papatayin ko ikaw',
  'walang kwenta', 'walang silbi', 'walang hiya',
  'punyeta', 'kupal', 'tarantado', 'siraulo', 'bwisit', 'bwiset',
  // Bicolano
  'yawa ka', 'yawa mo', 'yawa', 'hungog', 'buang', 'buanga',
  'papatayon taka', 'papatayon kita', 'patayon ta ka',
]

// ── Layer 3 fallback: local English profanity (used only if API is down) ─────
const ENGLISH_FALLBACK = [
  'fuck', 'fucking', 'fucker', 'fucked', 'motherfucker',
  'shit', 'bullshit', 'shitty', 'bitch', 'asshole', 'bastard',
  'cunt', 'slut', 'whore', 'dick', 'cock', 'pussy',
  'retard', 'retarded', 'faggot', 'nigger', 'nigga', 'chink',
  'kill yourself', 'kys', 'go die', 'you should die',
  'you deserve to die', "i'll kill you", 'ill kill you',
]

/** Normalize text to defeat leet-speak and spacing evasions. */
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/3/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7+]/g, 't')
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Does any keyword in `list` appear in raw or normalized text? */
function matchesAny(list, raw, clean) {
  return list.find((kw) => raw.includes(kw) || clean.includes(kw))
}

/**
 * Run full hybrid moderation.
 *
 * @param {string} text
 * @returns {Promise<{
 *   verdict: 'safe'|'toxic'|'crisis',
 *   reason?: string,
 *   layer?: string,
 *   scores?: Record<string, number>
 * }>}
 */
export async function moderate(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { verdict: 'toxic', reason: 'Empty submission.', layer: 'validation' }
  }
  if (text.length > 280) {
    return { verdict: 'toxic', reason: 'Message exceeds 280 characters.', layer: 'validation' }
  }

  const raw = text.toLowerCase().trim()
  const clean = normalize(text)

  // Admin-managed lexicon, editable from the admin console
  const custom = getLexiconSync()

  // ── Layer 0: Admin allow-list ─────────────────────────────────────────────
  // Lets an administrator clear a false positive without a code change.
  // Checked before everything except nothing — crisis still wins below.
  const allowHit = matchesAny(custom.allow, raw, clean)

  // ── Layer 1: Crisis (built-in + admin terms) ──────────────────────────────
  const crisisHit =
    matchesAny(CRISIS_KEYWORDS, raw, clean) ||
    matchesAny(custom.crisis, raw, clean)

  if (crisisHit) {
    return { verdict: 'crisis', reason: 'Crisis indicators detected.', layer: 'crisis-keywords' }
  }

  // An allow-listed phrase bypasses the remaining toxicity layers, but never
  // the crisis check above — safety must not be overridable.
  if (allowHit) {
    return { verdict: 'safe', layer: 'admin-allowlist' }
  }

  // ── Layer 2a: Admin-added toxic terms ─────────────────────────────────────
  if (matchesAny(custom.toxic, raw, clean)) {
    return {
      verdict: 'toxic',
      reason: 'Your message was flagged for harmful language and cannot be posted.',
      layer: 'admin-lexicon',
    }
  }

  // ── Layer 2b: Filipino vernacular toxicity ────────────────────────────────
  const vernacularHit = matchesAny(VERNACULAR_TOXIC, raw, clean)
  if (vernacularHit) {
    return {
      verdict: 'toxic',
      reason: 'Your message was flagged for harmful language and cannot be posted.',
      layer: 'vernacular-keywords',
    }
  }

  // ── Layer 3: Perspective API (English ML scoring) ──────────────────────────
  const result = await scoreText(text)

  if (result.ok) {
    const verdict = evaluateScores(result.scores)
    if (verdict.blocked) {
      return {
        verdict: 'toxic',
        reason: 'Your message was flagged by our AI moderation and cannot be posted.',
        layer: `perspective:${verdict.attribute}`,
        scores: result.scores,
      }
    }
    return { verdict: 'safe', layer: 'perspective', scores: result.scores }
  }

  // ── Fallback: Perspective unavailable → local English list ────────────────
  console.warn('[Moderation] Perspective unavailable, using fallback:', result.error)

  const fallbackHit = matchesAny(ENGLISH_FALLBACK, raw, clean)
  if (fallbackHit) {
    return {
      verdict: 'toxic',
      reason: 'Your message was flagged for harmful language and cannot be posted.',
      layer: 'english-fallback',
    }
  }

  return { verdict: 'safe', layer: 'english-fallback' }
}
