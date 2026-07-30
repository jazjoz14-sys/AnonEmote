/**
 * Google Perspective API client.
 *
 * Provides ML-based toxicity scoring. Perspective does NOT support Tagalog or
 * Bicolano, so this module is used for the English layer only — the local
 * keyword engine handles Filipino vernaculars and crisis detection.
 *
 * Docs: https://developers.perspectiveapi.com/s/about-the-api-methods
 */

const ENDPOINT =
  'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze'

// Attributes we request from Perspective, each with a block threshold.
// Scores are 0..1 probabilities that a reader would perceive the attribute.
export const THRESHOLDS = {
  SEVERE_TOXICITY: 0.6,
  TOXICITY: 0.75,
  IDENTITY_ATTACK: 0.65,
  INSULT: 0.7,
  PROFANITY: 0.75,
  THREAT: 0.6,
}

/**
 * Score text with Perspective API.
 *
 * @param {string} text
 * @returns {Promise<{ ok: boolean, scores?: Record<string, number>, error?: string }>}
 */
export async function scoreText(text) {
  const apiKey = process.env.PERSPECTIVE_API_KEY

  if (!apiKey) {
    return { ok: false, error: 'PERSPECTIVE_API_KEY not configured' }
  }

  const body = {
    comment: { text },
    languages: ['en'],
    requestedAttributes: Object.keys(THRESHOLDS).reduce((acc, attr) => {
      acc[attr] = {}
      return acc
    }, {}),
    doNotStore: true, // privacy — never let Google retain user text
  }

  try {
    // 4s timeout so a slow API never blocks a user's post
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)

    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: `Perspective ${res.status}: ${errText.slice(0, 200)}` }
    }

    const data = await res.json()

    // Flatten attributeScores → { TOXICITY: 0.83, INSULT: 0.42, ... }
    const scores = {}
    for (const [attr, val] of Object.entries(data.attributeScores || {})) {
      scores[attr] = val?.summaryScore?.value ?? 0
    }

    return { ok: true, scores }
  } catch (err) {
    const reason = err.name === 'AbortError' ? 'timeout' : err.message
    return { ok: false, error: `Perspective request failed: ${reason}` }
  }
}

/**
 * Decide whether Perspective scores exceed any block threshold.
 *
 * @param {Record<string, number>} scores
 * @returns {{ blocked: boolean, attribute?: string, score?: number }}
 */
export function evaluateScores(scores) {
  for (const [attr, threshold] of Object.entries(THRESHOLDS)) {
    const score = scores[attr]
    if (typeof score === 'number' && score >= threshold) {
      return { blocked: true, attribute: attr, score }
    }
  }
  return { blocked: false }
}
