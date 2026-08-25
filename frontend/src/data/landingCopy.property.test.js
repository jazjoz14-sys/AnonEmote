/**
 * Property-based tests for landingCopy.js — character limits
 *
 * Feature: landing-page-refresh, Property 1: Copy character limits are respected
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.4
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { HERO, STATEMENT, CTA, PLANET_DESCRIPTIONS } from './landingCopy.js'

describe('landingCopy - Property 1: Copy character limits are respected', () => {
  it('HERO.eyebrow is at most 60 characters', () => {
    fc.assert(
      fc.property(
        fc.constant(HERO.eyebrow),
        (text) => {
          expect(text.length).toBeLessThanOrEqual(60)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('HERO.subtitle is at most 120 characters', () => {
    fc.assert(
      fc.property(
        fc.constant(HERO.subtitle),
        (text) => {
          expect(text.length).toBeLessThanOrEqual(120)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('STATEMENT.eyebrow is at most 50 characters', () => {
    fc.assert(
      fc.property(
        fc.constant(STATEMENT.eyebrow),
        (text) => {
          expect(text.length).toBeLessThanOrEqual(50)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('STATEMENT.headline is at most 140 characters', () => {
    fc.assert(
      fc.property(
        fc.constant(STATEMENT.headline),
        (text) => {
          expect(text.length).toBeLessThanOrEqual(140)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('STATEMENT.subtitle is at most 180 characters', () => {
    fc.assert(
      fc.property(
        fc.constant(STATEMENT.subtitle),
        (text) => {
          expect(text.length).toBeLessThanOrEqual(180)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('CTA.eyebrow is at most 50 characters', () => {
    fc.assert(
      fc.property(
        fc.constant(CTA.eyebrow),
        (text) => {
          expect(text.length).toBeLessThanOrEqual(50)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('CTA.headline is at most 60 characters', () => {
    fc.assert(
      fc.property(
        fc.constant(CTA.headline),
        (text) => {
          expect(text.length).toBeLessThanOrEqual(60)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('CTA.buttonLabel is at most 25 characters', () => {
    fc.assert(
      fc.property(
        fc.constant(CTA.buttonLabel),
        (text) => {
          expect(text.length).toBeLessThanOrEqual(25)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('all planet taglines are between 40 and 120 characters', () => {
    const planetIds = Object.keys(PLANET_DESCRIPTIONS)

    fc.assert(
      fc.property(
        fc.constantFrom(...planetIds),
        (id) => {
          const tagline = PLANET_DESCRIPTIONS[id].tagline
          expect(tagline.length).toBeGreaterThanOrEqual(40)
          expect(tagline.length).toBeLessThanOrEqual(120)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('all planet purposes are at most 160 characters', () => {
    const planetIds = Object.keys(PLANET_DESCRIPTIONS)

    fc.assert(
      fc.property(
        fc.constantFrom(...planetIds),
        (id) => {
          const purpose = PLANET_DESCRIPTIONS[id].purpose
          expect(purpose.length).toBeLessThanOrEqual(160)
        }
      ),
      { numRuns: 100 }
    )
  })
})
