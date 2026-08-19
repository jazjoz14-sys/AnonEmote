// Feature: onboarding-terms-qol, Property 10: Hint dismissal round-trip
// Validates: Requirements 8.1, 8.2

import { describe, it, beforeEach } from 'vitest'
import fc from 'fast-check'
import { isHintDismissed, dismissHint, resetAllHints } from './hintStore.js'

/**
 * Arbitrary that generates realistic hint keys prefixed with `anonemote_hint_`
 * to match the key format used by the hint store.
 */
const hintKeyArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => /^[a-z0-9_]+$/.test(s))
  .map((s) => `anonemote_hint_${s}`)

describe('hintStore — Property 10: Hint dismissal round-trip', () => {
  beforeEach(() => {
    // Reset all hint state between each test
    resetAllHints()
    sessionStorage.clear()
  })

  it('dismissHint(key) followed by isHintDismissed(key) returns true', () => {
    fc.assert(
      fc.property(hintKeyArb, (key) => {
        // Reset state for this run
        resetAllHints()
        sessionStorage.clear()

        // Dismiss the hint
        dismissHint(key)

        // Verify it reads back as dismissed
        return isHintDismissed(key) === true
      }),
      { numRuns: 100 }
    )
  })

  it('isHintDismissed(key) returns false for undismissed keys', () => {
    fc.assert(
      fc.property(hintKeyArb, (key) => {
        // Reset state for this run
        resetAllHints()
        sessionStorage.clear()

        // Without dismissing, the key should not be dismissed
        return isHintDismissed(key) === false
      }),
      { numRuns: 100 }
    )
  })

  it('dismissed keys remain true while undismissed keys remain false (two distinct keys)', () => {
    fc.assert(
      fc.property(
        hintKeyArb,
        hintKeyArb.filter((k) => k.length > 16), // ensure second key is different enough
        (keyA, keyB) => {
          // Skip if keys happen to be the same
          if (keyA === keyB) return true

          // Reset state for this run
          resetAllHints()
          sessionStorage.clear()

          // Dismiss only keyA
          dismissHint(keyA)

          // keyA should be dismissed, keyB should not
          return isHintDismissed(keyA) === true && isHintDismissed(keyB) === false
        }
      ),
      { numRuns: 100 }
    )
  })
})
