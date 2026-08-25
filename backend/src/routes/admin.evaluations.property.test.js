/**
 * Property-Based Test: Feedback Area Statistics Sorted Descending
 *
 * Feature: user-evaluation, Property 10: Feedback Area Statistics Sorted Descending
 *
 * **Validates: Requirements 8.3**
 *
 * Property 10: For any collection of evaluations with feedback_areas arrays,
 * the admin statistics response SHALL list feedback areas sorted in descending
 * order by selection count — each item's count must be >= the next item's count.
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Feedback area labels — mirrors FEEDBACK_AREA_LABELS in admin.js
 */
const FEEDBACK_AREA_LABELS = {
  navigation: 'Easy to navigate',
  visuals: 'Visuals are appealing',
  safety: 'I feel safe here',
  support: 'Emotionally supportive',
  exploration: 'Fun to explore',
}

/** The 5 valid feedback area identifiers */
const VALID_AREAS = ['navigation', 'visuals', 'safety', 'support', 'exploration']

/**
 * Pure extraction of the counting + sorting logic from GET /api/admin/evaluations.
 * This exactly replicates the code in admin.js:
 *
 *   const areaCounts = {}
 *   for (const row of areaRows || []) {
 *     const areas = row.feedback_areas
 *     if (Array.isArray(areas)) {
 *       for (const area of areas) {
 *         areaCounts[area] = (areaCounts[area] || 0) + 1
 *       }
 *     }
 *   }
 *   const feedbackAreas = Object.entries(areaCounts)
 *     .map(([id, count]) => ({ id, label: FEEDBACK_AREA_LABELS[id] || id, count }))
 *     .sort((a, b) => b.count - a.count)
 *
 * @param {Array<{ feedback_areas: string[] }>} areaRows
 * @returns {Array<{ id: string, label: string, count: number }>}
 */
function computeFeedbackAreaStats(areaRows) {
  const areaCounts = {}
  for (const row of areaRows || []) {
    const areas = row.feedback_areas
    if (Array.isArray(areas)) {
      for (const area of areas) {
        areaCounts[area] = (areaCounts[area] || 0) + 1
      }
    }
  }

  const feedbackAreas = Object.entries(areaCounts)
    .map(([id, count]) => ({
      id,
      label: FEEDBACK_AREA_LABELS[id] || id,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return feedbackAreas
}

describe('Property 10: Feedback Area Statistics Sorted Descending', () => {
  // Feature: user-evaluation, Property 10: Feedback Area Statistics Sorted Descending
  // **Validates: Requirements 8.3**

  it('result is sorted by count in descending order for any collection of evaluations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            feedback_areas: fc.shuffledSubarray(VALID_AREAS),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (evaluations) => {
          const result = computeFeedbackAreaStats(evaluations)

          // Property: each item's count >= the next item's count (descending)
          for (let i = 0; i < result.length - 1; i++) {
            expect(result[i].count).toBeGreaterThanOrEqual(result[i + 1].count)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('result contains no duplicate area IDs', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            feedback_areas: fc.shuffledSubarray(VALID_AREAS),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (evaluations) => {
          const result = computeFeedbackAreaStats(evaluations)

          const ids = result.map((item) => item.id)
          const uniqueIds = new Set(ids)
          expect(ids.length).toBe(uniqueIds.size)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('counts are mathematically correct for any collection', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            feedback_areas: fc.shuffledSubarray(VALID_AREAS),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (evaluations) => {
          const result = computeFeedbackAreaStats(evaluations)

          // Independently compute expected counts
          const expectedCounts = {}
          for (const eval_ of evaluations) {
            for (const area of eval_.feedback_areas) {
              expectedCounts[area] = (expectedCounts[area] || 0) + 1
            }
          }

          // Verify each result entry has the correct count
          for (const item of result) {
            expect(item.count).toBe(expectedCounts[item.id])
          }

          // Verify all areas with non-zero counts are represented
          const resultIds = new Set(result.map((item) => item.id))
          for (const [area, count] of Object.entries(expectedCounts)) {
            if (count > 0) {
              expect(resultIds.has(area)).toBe(true)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('each result item has a valid label from FEEDBACK_AREA_LABELS', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            feedback_areas: fc.shuffledSubarray(VALID_AREAS),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (evaluations) => {
          const result = computeFeedbackAreaStats(evaluations)

          for (const item of result) {
            // Since we generate only valid area IDs, all labels should come from the map
            expect(item.label).toBe(FEEDBACK_AREA_LABELS[item.id])
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('empty evaluations produce an empty result', () => {
    const result = computeFeedbackAreaStats([])
    expect(result).toEqual([])
  })

  it('evaluations with empty feedback_areas produce an empty result', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constant({ feedback_areas: [] }),
          { minLength: 1, maxLength: 20 }
        ),
        (evaluations) => {
          const result = computeFeedbackAreaStats(evaluations)
          expect(result).toEqual([])
        }
      ),
      { numRuns: 50 }
    )
  })
})
