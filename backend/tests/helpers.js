/**
 * Shared Test Helpers — Mock factories and PBT utilities for AnonEmote backend tests.
 *
 * Provides:
 * - createMockSupabase(overrides) — configurable Supabase client mock
 * - createMockReq(options) — Express request mock
 * - createMockRes() — Express response mock with spies
 * - applyLeetSpeak(text) — random leet-speak substitutions for PBT generators
 * - injectZeroWidth(text) — insert zero-width characters at random positions
 * - injectRepetitions(text) — triple random characters for evasion testing
 */

import { vi } from 'vitest'

// ── Mock Supabase Client ─────────────────────────────────────────────────────

/**
 * Create a mock Supabase client with chainable query methods.
 *
 * Each method in the chain returns a thenable object so tests can
 * await or chain further. Override specific methods via the overrides param.
 *
 * @param {Object} overrides - Method overrides for customizing responses.
 * @param {Object} [overrides.selectResult] - Result for .select() calls: { data, error }
 * @param {Object} [overrides.insertResult] - Result for .insert() calls: { data, error }
 * @param {Object} [overrides.upsertResult] - Result for .upsert() calls: { data, error }
 * @param {Object} [overrides.deleteResult] - Result for .delete() calls: { data, error }
 * @param {Object} [overrides.updateResult] - Result for .update() calls: { data, error }
 * @param {Function} [overrides.authGetUser] - Custom auth.getUser implementation
 * @returns {Object} Mock Supabase client
 */
export function createMockSupabase(overrides = {}) {
  const defaultResult = { data: null, error: null }

  const selectResult = overrides.selectResult ?? defaultResult
  const insertResult = overrides.insertResult ?? defaultResult
  const upsertResult = overrides.upsertResult ?? defaultResult
  const deleteResult = overrides.deleteResult ?? defaultResult
  const updateResult = overrides.updateResult ?? defaultResult

  // Build a chainable query builder that resolves to a configured result
  function createChain(result) {
    const chain = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      upsert: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      update: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      neq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      is: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: vi.fn(() => Promise.resolve(result)),
      maybeSingle: vi.fn(() => Promise.resolve(result)),
      then: (resolve) => resolve(result),
    }
    return chain
  }

  const fromFn = vi.fn((table) => {
    // Return a chain that dispatches to the correct result based on the terminal method
    const chain = {
      select: vi.fn(() => {
        const selectChain = createChain(selectResult)
        return selectChain
      }),
      insert: vi.fn((data) => {
        const insertChain = createChain(insertResult)
        return insertChain
      }),
      upsert: vi.fn((data) => {
        const upsertChain = createChain(upsertResult)
        return upsertChain
      }),
      delete: vi.fn(() => {
        const deleteChain = createChain(deleteResult)
        return deleteChain
      }),
      update: vi.fn((data) => {
        const updateChain = createChain(updateResult)
        return updateChain
      }),
    }
    return chain
  })

  const authGetUser = overrides.authGetUser ?? vi.fn(() =>
    Promise.resolve({ data: { user: null }, error: { message: 'invalid token' } })
  )

  return {
    from: fromFn,
    auth: {
      getUser: authGetUser,
    },
  }
}

// ── Mock Express Request ─────────────────────────────────────────────────────

/**
 * Create a mock Express request object.
 *
 * @param {Object} options
 * @param {Object} [options.body] - Request body (POST/PUT data)
 * @param {Object} [options.headers] - Request headers (lowercased keys)
 * @param {Object} [options.query] - URL query parameters
 * @param {Object} [options.params] - Route params (e.g., :id)
 * @param {string} [options.ip] - Client IP address
 * @param {string} [options.method] - HTTP method
 * @param {string} [options.path] - Request path
 * @param {Object} [options.socket] - Socket object with remoteAddress
 * @returns {Object} Mock request object
 */
export function createMockReq(options = {}) {
  const ip = options.ip ?? '127.0.0.1'
  return {
    body: options.body ?? {},
    headers: options.headers ?? {},
    query: options.query ?? {},
    params: options.params ?? {},
    ip,
    method: options.method ?? 'GET',
    path: options.path ?? '/',
    socket: options.socket ?? { remoteAddress: ip },
    isAuthenticated: options.isAuthenticated ?? false,
    userId: options.userId ?? null,
    get: vi.fn((header) => {
      const key = header.toLowerCase()
      return (options.headers ?? {})[key] ?? null
    }),
  }
}

// ── Mock Express Response ────────────────────────────────────────────────────

/**
 * Create a mock Express response object with spy methods.
 * Methods are chainable (status returns the res, so .status(400).json({}) works).
 *
 * @returns {Object} Mock response with status(), json(), end(), set(), header() spies
 */
export function createMockRes() {
  const res = {
    statusCode: 200,
    _json: null,
    _headers: {},
  }

  res.status = vi.fn((code) => {
    res.statusCode = code
    return res
  })

  res.json = vi.fn((data) => {
    res._json = data
    return res
  })

  res.end = vi.fn(() => res)

  res.send = vi.fn((data) => {
    res._body = data
    return res
  })

  res.set = vi.fn((key, value) => {
    if (typeof key === 'object') {
      Object.assign(res._headers, key)
    } else {
      res._headers[key] = value
    }
    return res
  })

  res.header = vi.fn((key, value) => {
    res._headers[key] = value
    return res
  })

  res.setHeader = vi.fn((key, value) => {
    res._headers[key] = value
    return res
  })

  res.getHeader = vi.fn((key) => res._headers[key])

  return res
}

// ── PBT Generators / Text Evasion Utilities ──────────────────────────────────

/** Leet-speak substitution map (character → possible leet replacements) */
const LEET_MAP = {
  a: ['@', '4'],
  e: ['3'],
  i: ['1', '!', '|'],
  o: ['0'],
  s: ['$', '5'],
  t: ['7', '+'],
}

/**
 * Apply random leet-speak substitutions to a string.
 * Each eligible character has a ~50% chance of being substituted.
 *
 * @param {string} text - Input text
 * @returns {string} Text with random leet-speak substitutions applied
 */
export function applyLeetSpeak(text) {
  return text
    .split('')
    .map((ch) => {
      const lower = ch.toLowerCase()
      const replacements = LEET_MAP[lower]
      if (replacements && Math.random() < 0.5) {
        return replacements[Math.floor(Math.random() * replacements.length)]
      }
      return ch
    })
    .join('')
}

/** Zero-width characters used for evasion */
const ZERO_WIDTH_CHARS = [
  '\u200B', // zero-width space
  '\u200C', // zero-width non-joiner
  '\u200D', // zero-width joiner
  '\uFEFF', // byte order mark
]

/**
 * Insert zero-width characters at random positions in the text.
 * Inserts 1–3 zero-width characters at random indices.
 *
 * @param {string} text - Input text
 * @returns {string} Text with zero-width characters injected
 */
export function injectZeroWidth(text) {
  if (text.length === 0) return text
  const chars = text.split('')
  const insertions = Math.floor(Math.random() * 3) + 1
  for (let i = 0; i < insertions; i++) {
    const pos = Math.floor(Math.random() * (chars.length + 1))
    const zwc = ZERO_WIDTH_CHARS[Math.floor(Math.random() * ZERO_WIDTH_CHARS.length)]
    chars.splice(pos, 0, zwc)
  }
  return chars.join('')
}

/**
 * Triple random characters in the text to simulate repetition evasion.
 * Selects 1–2 random alphabetic character positions and repeats that character 3 times total.
 *
 * @param {string} text - Input text
 * @returns {string} Text with character repetitions injected
 */
export function injectRepetitions(text) {
  if (text.length === 0) return text
  const chars = text.split('')
  const positions = []
  // Find alphabetic character positions
  for (let i = 0; i < chars.length; i++) {
    if (/[a-zA-Z]/.test(chars[i])) {
      positions.push(i)
    }
  }
  if (positions.length === 0) return text
  // Pick 1-2 random positions to triple
  const count = Math.min(positions.length, Math.floor(Math.random() * 2) + 1)
  const chosen = []
  const available = [...positions]
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * available.length)
    chosen.push(available[idx])
    available.splice(idx, 1)
  }
  // Sort in reverse order so splicing doesn't shift indices
  chosen.sort((a, b) => b - a)
  for (const pos of chosen) {
    const ch = chars[pos]
    // Insert 2 extra copies (making 3 total)
    chars.splice(pos + 1, 0, ch, ch)
  }
  return chars.join('')
}
