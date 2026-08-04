import crypto from 'crypto'

/**
 * Privacy-preserving reporter fingerprint.
 *
 * Problem: session UUIDs live in sessionStorage, so closing a tab yields a new
 * one. Deduping reports by session alone lets one person report the same post
 * repeatedly and bury content they simply disagree with.
 *
 * Solution: derive a hash from the reporter's IP so repeat reports from the same
 * network are rejected regardless of session churn.
 *
 * Why this does not become a tracking identifier:
 *
 *   hash = HMAC(secret, ip + ':' + postId)
 *
 * The post id is part of the input, so the same IP produces a COMPLETELY
 * DIFFERENT hash for every post. The value can answer "has this network already
 * reported THIS post?" but cannot:
 *   - link one person's reports across different posts
 *   - be reversed to an IP (HMAC with a server-side secret)
 *   - be correlated against anything else in the database
 *
 * The raw IP is never stored, never logged, and never leaves this function.
 */

/** Lazily resolved so a missing env var fails loudly at first use, not import. */
function getSecret() {
  const secret = process.env.REPORT_HASH_SECRET
  if (secret && secret.length >= 16) return secret

  // Fall back to the service key, which is already a high-entropy server-side
  // secret, so the hash is never computed with a weak or empty key.
  const fallback = process.env.SUPABASE_SERVICE_KEY
  if (fallback) return fallback

  return null
}

/**
 * Extract the client IP, accounting for the proxy layer used by Render,
 * Railway, Vercel and similar hosts.
 */
export function getClientIp(req) {
  // Express populates req.ip correctly once 'trust proxy' is enabled
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    // Left-most entry is the original client
    return forwarded.split(',')[0].trim()
  }
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

/**
 * Compute the per-post reporter hash.
 *
 * @param {import('express').Request} req
 * @param {string} postId
 * @returns {string|null} hex digest, or null if no secret is configured
 */
export function reporterHash(req, postId) {
  const secret = getSecret()
  if (!secret) {
    console.warn('[reporterHash] No secret configured — IP dedupe disabled.')
    return null
  }

  const ip = getClientIp(req)
  if (!ip || ip === 'unknown') return null

  return crypto
    .createHmac('sha256', secret)
    .update(`${ip}:${postId}`)
    .digest('hex')
}
