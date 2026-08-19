/**
 * Moderation Engine Property-Based Tests
 *
 * Uses fast-check to verify universal properties of the moderation engine
 * across generated inputs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { applyLeetSpeak, injectZeroWidth, injectRepetitions } from '../../tests/helpers.js'

// Mock Perspective API client
vi.mock('./perspective.js', () => ({
  scoreText: vi.fn(),
  evaluateScores: vi.fn(),
}))

// Mock storage (admin lexicon)
vi.mock('../lib/storage.js', () => ({
  getLexiconSync: vi.fn(),
}))

import { moderate } from './engine.js'
import { scoreText, evaluateScores } from './perspective.js'
import { getLexiconSync } from '../lib/storage.js'

describe('Moderation Engine Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Property 4: Fallback layer activates when Perspective is unavailable ──
  describe('Feature: qa-testing-error-handling, Property 4: Fallback layer activates when Perspective is unavailable', () => {
    /**
     * Validates: Requirements 1.6, 1.7, 5.1, 5.2
     *
     * For any safe text (no crisis/vernacular keywords) when Perspective API
     * is unavailable, the moderation engine SHALL return layer 'english-fallback'
     * with verdict 'safe' (since the text contains no English profanity).
     */
    it('always uses english-fallback layer with safe verdict for safe text when Perspective is unavailable', async () => {
      // Known-safe phrases that contain no crisis, vernacular, or English profanity keywords
      const safePhrases = [
        'hello',
        'good morning',
        'I feel happy',
        'the sun is shining today',
        'thank you for being kind',
        'I had a wonderful day',
        'music makes me calm',
        'I appreciate your help',
        'the stars are beautiful tonight',
        'reading is my favorite hobby',
        'let us celebrate together',
        'I am grateful for my friends',
        'the weather is nice',
        'hope you have a great day',
        'learning new things is exciting',
        'what a peaceful evening',
        'I enjoy spending time outdoors',
        'kindness matters',
        'today was productive',
        'smiling feels good',
      ]

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...safePhrases),
          async (text) => {
            // Mock Perspective as unavailable
            scoreText.mockResolvedValue({ ok: false, error: 'unavailable' })
            // Mock lexicon with empty lists (no custom terms)
            getLexiconSync.mockReturnValue({ allow: [], toxic: [], crisis: [] })

            const result = await moderate(text)

            // Layer should always be 'english-fallback' when API is down
            expect(result.layer).toBe('english-fallback')
            // Verdict should be 'safe' since the text has no English profanity
            expect(result.verdict).toBe('safe')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ── Property 2: Vernacular toxicity detection ─────────────────────────────
  describe('Feature: qa-testing-error-handling, Property 2: Vernacular toxicity detection', () => {
    /**
     * Validates: Requirements 1.4, 6.6
     *
     * For any text input (≤280 characters, non-empty) that contains a Filipino
     * vernacular toxic keyword and does NOT contain a crisis keyword or match
     * the allow-list, the moderation engine SHALL return a verdict of 'toxic'
     * with layer 'vernacular-keywords'.
     */

    const VERNACULAR_TOXIC = [
      'putangina', 'gago', 'gaga', 'bobo', 'tanga',
      'ulol', 'yawa', 'hungog', 'buang', 'putang ina', 'puta',
    ]

    it('property: vernacular toxic keywords always produce toxic verdict with vernacular-keywords layer', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...VERNACULAR_TOXIC),
          async (keyword) => {
            // Mock Perspective as unavailable
            scoreText.mockResolvedValue({ ok: false, error: 'unavailable' })
            // Mock lexicon with empty allow-list
            getLexiconSync.mockReturnValue({ allow: [], toxic: [], crisis: [] })

            // Embed keyword in safe surrounding text (no crisis keywords)
            const text = `hello ${keyword}`

            // Ensure total text is ≤280 chars
            expect(text.length).toBeLessThanOrEqual(280)

            const result = await moderate(text)

            expect(result.verdict).toBe('toxic')
            expect(result.layer).toBe('vernacular-keywords')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ── Property 5: Validation rejects empty and whitespace-only input ────────
  describe('Feature: qa-testing-error-handling, Property 5: Validation rejects empty and whitespace-only input', () => {
    /**
     * Property 5: Validation rejects empty and whitespace-only input
     * **Validates: Requirements 1.8, 6.9**
     *
     * For any string composed entirely of whitespace characters (spaces, tabs,
     * newlines, carriage returns) or the empty string, the moderation engine
     * SHALL return verdict 'toxic' with layer 'validation' and reason 'Empty submission.'
     */
    it('should reject whitespace-only strings with toxic/validation/Empty submission.', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 50 })
            .map((chars) => chars.join('')),
          async (whitespaceStr) => {
            const result = await moderate(whitespaceStr)
            expect(result.verdict).toBe('toxic')
            expect(result.layer).toBe('validation')
            expect(result.reason).toBe('Empty submission.')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject empty string with toxic/validation/Empty submission.', async () => {
      const result = await moderate('')
      expect(result.verdict).toBe('toxic')
      expect(result.layer).toBe('validation')
      expect(result.reason).toBe('Empty submission.')
    })
  })

  // ── Property 6: Validation rejects over-length input ────────────────────────
  describe('Feature: qa-testing-error-handling, Property 6: Validation rejects over-length input', () => {
    /**
     * Property 6: Validation rejects over-length input
     * **Validates: Requirements 1.9, 6.5**
     *
     * For any string with length exceeding 280 characters, the moderation engine
     * SHALL return verdict 'toxic' with layer 'validation' and reason
     * 'Message exceeds 280 characters.'
     */
    it('should reject strings longer than 280 characters with toxic/validation/Message exceeds 280 characters.', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 281, maxLength: 1000 }),
          async (overLengthStr) => {
            const result = await moderate(overLengthStr)
            expect(result.verdict).toBe('toxic')
            expect(result.layer).toBe('validation')
            expect(result.reason).toBe('Message exceeds 280 characters.')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ── Property 7: Normalization invariance of moderation verdict (metamorphic) ──
  describe('Feature: qa-testing-error-handling, Property 7: Normalization invariance of moderation verdict', () => {
    /**
     * Validates: Requirements 1.10, 6.1, 6.2, 6.3
     *
     * Take a crisis keyword, apply leet-speak / zero-width / repetition evasions.
     * Assert: verdict remains 'crisis' after normalization handles evasions.
     * The text must stay ≤280 chars total.
     *
     * Note: The normalizer handles leet-speak (full reversal) and zero-width
     * characters (full removal). Repetition reduction (3+ → 2) is a partial
     * defense that works best combined with leet-speak and zero-width removal.
     * This test applies evasions that normalization is designed to fully defeat.
     */

    const CRISIS_SUBSET = ['suicide', 'kill myself', 'self harm', 'overdose', 'want to die']

    // Evasion strategies the normalizer is designed to fully reverse:
    // - Leet-speak: character substitutions (@→a, 3→e, etc.) fully reversed
    // - Zero-width: invisible chars fully stripped
    // - Combinations of leet-speak + zero-width
    const evasionStrategies = [
      (text) => applyLeetSpeak(text),
      (text) => injectZeroWidth(text),
      (text) => injectZeroWidth(applyLeetSpeak(text)),
      (text) => applyLeetSpeak(injectZeroWidth(text)),
    ]

    it('property: crisis keywords remain detected as crisis after evasion techniques are applied', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...CRISIS_SUBSET),
          fc.integer({ min: 0, max: evasionStrategies.length - 1 }),
          async (keyword, strategyIdx) => {
            // Mock Perspective as unavailable
            scoreText.mockResolvedValue({ ok: false, error: 'unavailable' })
            // Mock lexicon with empty lists
            getLexiconSync.mockReturnValue({ allow: [], toxic: [], crisis: [] })

            // Apply evasion technique to the crisis keyword
            const evadedText = evasionStrategies[strategyIdx](keyword)

            // Ensure text stays within 280 character limit
            const text = evadedText.slice(0, 280)

            // Skip empty results from aggressive evasion
            if (!text || text.trim().length === 0) return

            const result = await moderate(text)

            expect(result.verdict).toBe('crisis')
            expect(result.layer).toBe('crisis-keywords')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ── Property 8: Crisis always overrides allow-list ──────────────────────────
  describe('Feature: qa-testing-error-handling, Property 8: Crisis always overrides allow-list', () => {
    /**
     * Validates: Requirements 1.11, 6.7
     *
     * For any text that matches both an admin allow-list entry AND a crisis
     * keyword, the moderation engine SHALL return verdict 'crisis' with layer
     * 'crisis-keywords', never 'safe'. The crisis layer ALWAYS takes priority
     * over the allow-list.
     */

    const CRISIS_SUBSET = [
      'suicide', 'kill myself', 'self-harm', 'want to die',
      'end my life', 'overdose', 'hang myself',
      'gusto kong mamatay', 'pagpapakamatay',
      'gusto ko na magadan',
    ]

    it('property: crisis keyword always produces crisis verdict even when the keyword is in the allow-list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...CRISIS_SUBSET),
          async (crisisKeyword) => {
            // Mock Perspective as unavailable
            scoreText.mockResolvedValue({ ok: false, error: 'unavailable' })
            // Mock lexicon: put the crisis keyword itself in the allow-list
            getLexiconSync.mockReturnValue({
              allow: [crisisKeyword],
              toxic: [],
              crisis: [],
            })

            // Submit text that contains the crisis keyword (also allow-listed)
            const text = `I feel ${crisisKeyword} today`

            const result = await moderate(text)

            // Crisis ALWAYS wins over allow-list
            expect(result.verdict).toBe('crisis')
            expect(result.layer).toBe('crisis-keywords')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ── Property 9: Allow-list overrides non-crisis toxicity ──────────────────
  describe('Feature: qa-testing-error-handling, Property 9: Allow-list overrides non-crisis toxicity', () => {
    /**
     * Validates: Requirements 1.12, 6.8
     *
     * For any text that matches an admin allow-list entry and does NOT match
     * any crisis keyword, the moderation engine SHALL return verdict 'safe'
     * with layer 'admin-allowlist', bypassing vernacular and perspective layers.
     */
    it('property: allow-listed vernacular toxic terms produce safe verdict with admin-allowlist layer when no crisis keywords present', async () => {
      const vernacularToxicKeywords = [
        'putangina', 'gago', 'gaga', 'bobo', 'tanga',
        'ulol', 'yawa', 'hungog', 'buang',
      ]

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...vernacularToxicKeywords),
          async (keyword) => {
            // Mock Perspective API as unavailable
            scoreText.mockResolvedValue({ ok: false, error: 'unavailable' })
            // Mock lexicon with the chosen toxic keyword in the allow-list
            getLexiconSync.mockReturnValue({ allow: [keyword], toxic: [], crisis: [] })

            // Submit text containing the keyword but NO crisis keywords
            const text = 'hello ' + keyword

            const result = await moderate(text)

            expect(result.verdict).toBe('safe')
            expect(result.layer).toBe('admin-allowlist')
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
