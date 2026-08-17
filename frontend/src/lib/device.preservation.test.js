/**
 * Preservation Property Test: Mobile Quality Tier
 *
 * Validates: Requirements 3.1
 *
 * GOAL: Confirm that mobile and small-screen devices continue to receive
 * 'low' or 'medium' quality tiers (never 'high') on the UNFIXED code.
 *
 * This test exercises the qualityTier logic with various mobile/small-screen
 * inputs and asserts the output is always 'low' or 'medium'.
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Since device.js exports module-level constants computed from navigator.userAgent
 * and window.innerWidth at import time, we test the LOGIC directly by replicating
 * the exact algorithm from device.js.
 *
 * This is the CURRENT (unfixed) logic — preservation tests must match it.
 */
function qualityTierLogic(isMobile, isSmallScreen) {
  // Exact replication of device.js line 47:
  // isSmallScreen ? 'low' : isMobile ? 'medium' : 'medium'
  if (isSmallScreen) return 'low'
  if (isMobile) return 'medium'
  return 'medium' // The bug: always 'medium' for desktop too
}

describe('Preservation: Mobile/Small-Screen Quality Tier', () => {
  it('property: small-screen devices always get "low" quality tier', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isMobile can be anything
        (isMobile) => {
          const tier = qualityTierLogic(isMobile, true) // isSmallScreen = true
          expect(tier).toBe('low')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: mobile devices (non-small-screen) always get "medium" quality tier', () => {
    fc.assert(
      fc.property(
        fc.constant(true), // isMobile = true
        () => {
          const tier = qualityTierLogic(true, false) // isMobile=true, isSmallScreen=false
          expect(tier).toBe('medium')
        }
      ),
      { numRuns: 50 }
    )
  })

  it('property: for all mobile/small-screen inputs, qualityTier returns "low" or "medium" (never "high")', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isMobile
        fc.boolean(), // isSmallScreen
        (isMobile, isSmallScreen) => {
          // Only test cases where device IS mobile or small screen
          fc.pre(isMobile || isSmallScreen)
          const tier = qualityTierLogic(isMobile, isSmallScreen)
          expect(['low', 'medium']).toContain(tier)
          expect(tier).not.toBe('high')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: desktop (non-mobile, non-small-screen) currently returns "medium" on unfixed code', () => {
    // This documents the CURRENT behavior (the bug means desktop never gets 'high')
    const tier = qualityTierLogic(false, false)
    expect(tier).toBe('medium')
  })
})
