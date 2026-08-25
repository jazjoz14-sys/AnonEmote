/**
 * Property-based tests for landingCopy.js — no technical acronyms in hero subtitle
 *
 * Feature: landing-page-refresh, Property 8: Hero subtitle contains no technical acronyms
 * Validates: Requirements 1.6
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { HERO } from './landingCopy.js'

// Allowed acronyms — common in everyday Filipino-English usage
const ALLOWED_ACRONYMS = ['ID']

describe('landingCopy — Property 8: Hero subtitle contains no technical acronyms', () => {
  it('no word in hero subtitle is an all-caps 2+ char word unless in allowed list', () => {
    // Split subtitle into words, filter for uppercase-only words >= 2 chars
    const words = HERO.subtitle.split(/\s+/)

    fc.assert(
      fc.property(
        fc.constantFrom(...words),
        (word) => {
          // Strip punctuation for cleaner matching
          const cleanWord = word.replace(/[^A-Za-z]/g, '')
          if (cleanWord.length >= 2 && cleanWord === cleanWord.toUpperCase() && /^[A-Z]+$/.test(cleanWord)) {
            // All-caps word detected — must be in allowed list
            expect(ALLOWED_ACRONYMS).toContain(cleanWord)
          }
          // Words that aren't all-caps are always fine
        }
      ),
      { numRuns: 100 }
    )
  })
})
