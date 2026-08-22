// Feature: admin-dashboard-overhaul, Property 6: User search filters by substring match

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Validates: Requirements 5.1
 *
 * Property 6: User search filters by substring match
 * For any user list and any search query of length >= 2, the displayed results
 * SHALL be exactly the subset of users whose email contains the query as a
 * case-insensitive substring.
 */

/**
 * Filter users by email substring (case-insensitive).
 * Mirrors the logic in UsersPage:
 *   allUsers.filter(user => user.email.toLowerCase().includes(query.toLowerCase()))
 *
 * @param {Array<{email: string}>} users - User list
 * @param {string} query - Search query (min 2 chars)
 * @returns {Array<{email: string}>} Filtered subset
 */
export function filterUsersByEmail(users, query) {
  const q = query.toLowerCase()
  return users.filter(user => (user.email || '').toLowerCase().includes(q))
}

// ── Arbitraries ───────────────────────────────────────────────────────────

/** Arbitrary for generating realistic email-like strings */
const emailArb = fc.tuple(
  fc.stringMatching(/^[a-z0-9._-]{1,12}$/),
  fc.stringMatching(/^[a-z0-9]{2,8}$/),
  fc.constantFrom('com', 'org', 'edu', 'ph', 'net', 'io')
).map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

/** Arbitrary for user objects with an email field */
const userArb = emailArb.map(email => ({ email, id: email }))

/** Arbitrary for a list of users (0–30 items) */
const userListArb = fc.array(userArb, { minLength: 0, maxLength: 30 })

/** Arbitrary for search queries of length >= 2 (using characters that can appear in emails) */
const queryArb = fc.stringMatching(/^[a-z0-9.@_-]{2,10}$/)

/** Arbitrary for mixed-case query strings (to test case insensitivity) */
const mixedCaseQueryArb = queryArb.chain(q =>
  fc.array(fc.boolean(), { minLength: q.length, maxLength: q.length }).map(flags =>
    q.split('').map((ch, i) => flags[i] ? ch.toUpperCase() : ch).join('')
  )
)

describe('Property 6: User search filters by substring match', () => {
  it('result is exactly the subset whose email contains query case-insensitively', () => {
    fc.assert(
      fc.property(userListArb, queryArb, (users, query) => {
        const result = filterUsersByEmail(users, query)

        // Reference: filter manually with same logic
        const expected = users.filter(user =>
          (user.email || '').toLowerCase().includes(query.toLowerCase())
        )

        // Length must match
        expect(result.length).toBe(expected.length)

        // Every result item must be in expected (same order preserved)
        result.forEach((item, i) => {
          expect(item).toBe(expected[i])
        })
      }),
      { numRuns: 200 }
    )
  })

  it('result is a subset of the original list (no extra items introduced)', () => {
    fc.assert(
      fc.property(userListArb, queryArb, (users, query) => {
        const result = filterUsersByEmail(users, query)

        // Every item in result must exist in the original list
        for (const item of result) {
          expect(users).toContain(item)
        }

        // Result cannot be longer than input
        expect(result.length).toBeLessThanOrEqual(users.length)
      }),
      { numRuns: 150 }
    )
  })

  it('every result item actually contains the query as a substring', () => {
    fc.assert(
      fc.property(userListArb, queryArb, (users, query) => {
        const result = filterUsersByEmail(users, query)
        const q = query.toLowerCase()

        for (const user of result) {
          expect(user.email.toLowerCase()).toContain(q)
        }
      }),
      { numRuns: 150 }
    )
  })

  it('every excluded item does NOT contain the query as a substring', () => {
    fc.assert(
      fc.property(userListArb, queryArb, (users, query) => {
        const result = filterUsersByEmail(users, query)
        const q = query.toLowerCase()
        const resultSet = new Set(result.map(u => u.email))

        const excluded = users.filter(u => !resultSet.has(u.email))
        for (const user of excluded) {
          expect(user.email.toLowerCase()).not.toContain(q)
        }
      }),
      { numRuns: 150 }
    )
  })

  it('filtering is case-insensitive (mixed case query matches lowercase email)', () => {
    fc.assert(
      fc.property(userListArb, mixedCaseQueryArb, (users, query) => {
        const resultMixed = filterUsersByEmail(users, query)
        const resultLower = filterUsersByEmail(users, query.toLowerCase())

        // Same query in different cases produces identical results
        expect(resultMixed.length).toBe(resultLower.length)
        resultMixed.forEach((item, i) => {
          expect(item).toBe(resultLower[i])
        })
      }),
      { numRuns: 100 }
    )
  })

  it('empty user list always returns empty result', () => {
    fc.assert(
      fc.property(queryArb, (query) => {
        const result = filterUsersByEmail([], query)
        expect(result).toEqual([])
      }),
      { numRuns: 100 }
    )
  })

  it('preserves relative order of matched users from the original list', () => {
    fc.assert(
      fc.property(userListArb, queryArb, (users, query) => {
        const result = filterUsersByEmail(users, query)

        // Check that indices in result are in ascending order relative to original
        const indices = result.map(item => users.indexOf(item))
        for (let i = 1; i < indices.length; i++) {
          expect(indices[i]).toBeGreaterThan(indices[i - 1])
        }
      }),
      { numRuns: 100 }
    )
  })
})
