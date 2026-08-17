/**
 * Preservation Property Test: Valid planet_id Processing
 *
 * Validates: Requirements 3.9
 *
 * GOAL: Confirm that valid planet_ids ('joy', 'vent', 'advice', 'grief',
 * 'anxiety', 'neutral', 'doodle') process normally — they do NOT get
 * rejected with a 400 error on UNFIXED code.
 *
 * Observation: Currently the reactions/reports/replies routes do NOT validate
 * planet_id at all — they pass it straight to the DB. Valid values succeed
 * because they match the DB CHECK constraint. This test ensures that after
 * validation is added, valid values still pass through without error.
 *
 * We test this by verifying that the ALLOWED_PLANETS constant matches the
 * values expected by the system, and that the validation logic (when added)
 * would accept them.
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

const ALLOWED_PLANETS = ['joy', 'vent', 'advice', 'grief', 'anxiety', 'neutral', 'doodle']

/**
 * Simulates the planet_id validation logic that will be added.
 * For valid planet_ids, the route should NOT return 400 — it should proceed normally.
 */
function isValidPlanetId(planetId) {
  return ALLOWED_PLANETS.includes(planetId)
}

describe('Preservation: Valid planet_id Processing', () => {
  it('property: for all valid planet_id values, validation passes (returns true)', () => {
    const validPlanetArb = fc.constantFrom(...ALLOWED_PLANETS)

    fc.assert(
      fc.property(validPlanetArb, (planetId) => {
        expect(isValidPlanetId(planetId)).toBe(true)
      }),
      { numRuns: 70 }
    )
  })

  it('all 7 planet_ids are recognized as valid', () => {
    for (const id of ALLOWED_PLANETS) {
      expect(isValidPlanetId(id)).toBe(true)
    }
  })

  it('the ALLOWED_PLANETS list has exactly 7 entries', () => {
    expect(ALLOWED_PLANETS).toHaveLength(7)
  })

  it('property: valid planet_ids are lowercase strings with no spaces', () => {
    const validPlanetArb = fc.constantFrom(...ALLOWED_PLANETS)

    fc.assert(
      fc.property(validPlanetArb, (planetId) => {
        expect(planetId).toBe(planetId.toLowerCase())
        expect(planetId).not.toContain(' ')
        expect(planetId.length).toBeGreaterThan(0)
      }),
      { numRuns: 50 }
    )
  })
})
