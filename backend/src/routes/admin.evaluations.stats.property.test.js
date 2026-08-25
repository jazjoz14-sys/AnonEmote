/**
 * Property-Based Test: Aggregated Statistics Mathematical Correctness
 *
 * Feature: user-evaluation, Property 11: Aggregated Statistics Mathematical Correctness
 *
 * **Validates: Requirements 8.6**
 *
 * Property 11: For any collection of N evaluations with ratings r₁, r₂, ..., rₙ:
 * - total = N
 * - average = round(sum(r₁..rₙ) / N, 1) (or 0.0 if N = 0)
 * - distribution[k] = count of evaluations where rating = k, for k ∈ {1,2,3,4,5}
 * - sum of all distribution values = N
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Pure extraction of the statistics computation logic from GET /api/admin/evaluations.
 * This exactly replicates the code in admin.js:
 *
 *   const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
 *   let ratingSum = 0
 *   for (const row of ratingRows || []) {
 *     distribution[String(row.rating)] = (distribution[String(row.rating)] || 0) + 1
 *     ratingSum += row.rating
 *   }
 *   const average = total > 0 ? Math.round((ratingSum / total) * 10) / 10 : 0.0
 *
 * @param {Array<{ rating: number }>} ratingRows - Array of rating rows from the database
 * @returns {{ total: number, average: number, distribution: Record<string, number> }}
 */
function computeRatingStats(ratingRows) {
  const total = ratingRows.length

  if (total === 0) {
    return {
      total: 0,
      average: 0.0,
      distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    }
  }

  const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  let ratingSum = 0
  for (const row of ratingRows) {
    distribution[String(row.rating)] = (distribution[String(row.rating)] || 0) + 1
    ratingSum += row.rating
  }

  const average = Math.round((ratingSum / total) * 10) / 10

  return { total, average, distribution }
}

describe('Property 11: Aggregated Statistics Mathematical Correctness', () => {
  // Feature: user-evaluation, Property 11: Aggregated Statistics Mathematical Correctness
  // **Validates: Requirements 8.6**

  it('total equals the number of ratings in the collection', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 100 }),
        (ratings) => {
          const rows = ratings.map((r) => ({ rating: r }))
          const result = computeRatingStats(rows)

          expect(result.total).toBe(ratings.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('average equals Math.round((sum / total) * 10) / 10', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 100 }),
        (ratings) => {
          const rows = ratings.map((r) => ({ rating: r }))
          const result = computeRatingStats(rows)

          const sum = ratings.reduce((acc, r) => acc + r, 0)
          const expectedAverage = Math.round((sum / ratings.length) * 10) / 10

          expect(result.average).toBe(expectedAverage)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('distribution values sum to total', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 100 }),
        (ratings) => {
          const rows = ratings.map((r) => ({ rating: r }))
          const result = computeRatingStats(rows)

          const distributionSum = Object.values(result.distribution).reduce(
            (acc, count) => acc + count,
            0
          )

          expect(distributionSum).toBe(result.total)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('each distribution bucket correctly counts the occurrences of that rating', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 100 }),
        (ratings) => {
          const rows = ratings.map((r) => ({ rating: r }))
          const result = computeRatingStats(rows)

          // Independently compute expected counts per rating level
          const expectedCounts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
          for (const r of ratings) {
            expectedCounts[String(r)]++
          }

          for (const key of ['1', '2', '3', '4', '5']) {
            expect(result.distribution[key]).toBe(expectedCounts[key])
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('empty array produces total=0, average=0.0, all distribution=0', () => {
    const result = computeRatingStats([])

    expect(result.total).toBe(0)
    expect(result.average).toBe(0.0)
    expect(result.distribution).toEqual({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 })
  })

  it('average is always between 1.0 and 5.0 for non-empty collections', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 100 }),
        (ratings) => {
          const rows = ratings.map((r) => ({ rating: r }))
          const result = computeRatingStats(rows)

          expect(result.average).toBeGreaterThanOrEqual(1.0)
          expect(result.average).toBeLessThanOrEqual(5.0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('distribution contains exactly keys 1 through 5', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 0, maxLength: 100 }),
        (ratings) => {
          const rows = ratings.map((r) => ({ rating: r }))
          const result = computeRatingStats(rows)

          const keys = Object.keys(result.distribution).sort()
          expect(keys).toEqual(['1', '2', '3', '4', '5'])
        }
      ),
      { numRuns: 100 }
    )
  })

  it('all distribution values are non-negative integers', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 0, maxLength: 100 }),
        (ratings) => {
          const rows = ratings.map((r) => ({ rating: r }))
          const result = computeRatingStats(rows)

          for (const count of Object.values(result.distribution)) {
            expect(Number.isInteger(count)).toBe(true)
            expect(count).toBeGreaterThanOrEqual(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
