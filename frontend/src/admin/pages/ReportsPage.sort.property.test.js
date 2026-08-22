// Feature: admin-dashboard-overhaul, Property 8: Reports sort order stability

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { sortReports } from './ReportsPage.jsx'

/**
 * Validates: Requirements 4.7
 *
 * Property 8: Reports sort order stability
 * For any list of report groups and any selected sort criterion (priority, newest,
 * oldest, count), the displayed list SHALL be totally ordered according to that
 * criterion, with ties broken by a stable secondary key (post ID).
 */

// ─── Generators ─────────────────────────────────────────────────────────────────

/** Generate an ISO date string within a reasonable range (epoch ms to avoid invalid dates) */
const dateArb = fc.integer({
  min: new Date('2024-01-01T00:00:00.000Z').getTime(),
  max: new Date('2026-12-31T23:59:59.999Z').getTime(),
}).map((ms) => new Date(ms).toISOString())

/** Generate a priority value (1–5, with duplicates likely) */
const priorityArb = fc.integer({ min: 1, max: 5 })

/** Generate a report count value (small range to ensure duplicates) */
const reportCountArb = fc.integer({ min: 1, max: 20 })

/** Generate a unique post ID (short alphanumeric to ensure localeCompare is testable) */
const postIdArb = fc.uuid()

/** Generate a single report group object with the fields sortReports uses */
const reportGroupArb = fc.record({
  priority: priorityArb,
  reportCount: reportCountArb,
  post: fc.record({
    id: postIdArb,
    created_at: dateArb,
  }),
})

/** Generate arrays of report groups (2–30 items, enough for duplicates) */
const reportGroupsArb = fc.array(reportGroupArb, { minLength: 2, maxLength: 30 })

/** Valid sort criteria */
const sortCriterionArb = fc.constantFrom('priority', 'newest', 'oldest', 'reports')

// ─── Helper: verify total ordering ─────────────────────────────────────────────

/**
 * Check that the sorted array is totally ordered: no adjacent pair violates
 * the ordering for the given criterion, with ties broken by post ID.
 *
 * The comparator used by sortReports returns negative to place a before b.
 * So for a correctly sorted array, comparator(sorted[i], sorted[i+1]) <= 0.
 * A violation occurs when comparator(sorted[i], sorted[i+1]) > 0.
 */
function isTotallyOrdered(sorted, sortBy) {
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    let cmp

    switch (sortBy) {
      case 'priority':
        cmp = a.priority - b.priority
        break
      case 'newest':
        cmp = new Date(b.post.created_at) - new Date(a.post.created_at)
        break
      case 'oldest':
        cmp = new Date(a.post.created_at) - new Date(b.post.created_at)
        break
      case 'reports':
        cmp = b.reportCount - a.reportCount
        break
      default:
        cmp = 0
    }

    if (cmp > 0) return false // violation: a should have come after b
    if (cmp === 0) {
      // Tied on primary criterion — must be ordered by post ID ascending
      if (a.post.id.localeCompare(b.post.id) > 0) return false
    }
  }
  return true
}

// ─── Property Tests ─────────────────────────────────────────────────────────────

describe('Feature: admin-dashboard-overhaul, Property 8: Reports sort order stability', () => {
  it('result is totally ordered by the selected criterion with ties broken by post ID', () => {
    fc.assert(
      fc.property(reportGroupsArb, sortCriterionArb, (groups, sortBy) => {
        const sorted = sortReports(groups, sortBy)
        expect(isTotallyOrdered(sorted, sortBy)).toBe(true)
      }),
      { numRuns: 200 }
    )
  })

  it('result length always equals input length (no elements lost or added)', () => {
    fc.assert(
      fc.property(reportGroupsArb, sortCriterionArb, (groups, sortBy) => {
        const sorted = sortReports(groups, sortBy)
        expect(sorted.length).toBe(groups.length)
      }),
      { numRuns: 200 }
    )
  })

  it('sort is deterministic — same input always produces same output', () => {
    fc.assert(
      fc.property(reportGroupsArb, sortCriterionArb, (groups, sortBy) => {
        const result1 = sortReports(groups, sortBy)
        const result2 = sortReports(groups, sortBy)

        // Same order of post IDs
        const ids1 = result1.map((g) => g.post.id)
        const ids2 = result2.map((g) => g.post.id)
        expect(ids1).toEqual(ids2)
      }),
      { numRuns: 200 }
    )
  })

  it('sorting with all duplicate primary values produces valid order by post ID', () => {
    // Generate groups where the primary key is forced to be identical
    const samePriorityGroupsArb = fc.array(
      fc.record({
        priority: fc.constant(3),
        reportCount: fc.constant(10),
        post: fc.record({
          id: postIdArb,
          created_at: fc.constant('2025-06-15T12:00:00.000Z'),
        }),
      }),
      { minLength: 2, maxLength: 20 }
    )

    fc.assert(
      fc.property(samePriorityGroupsArb, sortCriterionArb, (groups, sortBy) => {
        const sorted = sortReports(groups, sortBy)

        // When all primary values are equal, order must be by post ID ascending
        for (let i = 0; i < sorted.length - 1; i++) {
          expect(
            sorted[i].post.id.localeCompare(sorted[i + 1].post.id)
          ).toBeLessThanOrEqual(0)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('original array is not mutated by sorting', () => {
    fc.assert(
      fc.property(reportGroupsArb, sortCriterionArb, (groups, sortBy) => {
        // Capture original order by post ID
        const originalIds = groups.map((g) => g.post.id)

        sortReports(groups, sortBy)

        // Original array unchanged
        const afterIds = groups.map((g) => g.post.id)
        expect(afterIds).toEqual(originalIds)
      }),
      { numRuns: 100 }
    )
  })
})
