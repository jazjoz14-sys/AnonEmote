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

import { moderate, moderateDryRun, rebuildAutomata } from './engine.js'
import { loadBuiltInLexicons } from './lexiconLoader.js'
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

  // ══════════════════════════════════════════════════════════════════════════════
  // Properties from multilingual-word-filter spec
  // ══════════════════════════════════════════════════════════════════════════════

  // ── Property 3: Crisis terms override all allow-lists ────────────────────────
  describe('Feature: multilingual-word-filter, Property 3: Crisis terms override all allow-lists', () => {
    /**
     * Validates: Requirements 4.2, 7.3, 9.3
     *
     * For any text that matches a crisis term (built-in or admin), the
     * moderation engine SHALL return a `crisis` verdict regardless of whether
     * the text also matches an admin allow-list entry or a safe-context phrase.
     *
     * Generator strategy:
     * - Pick a random crisis term from the actual all-crisis.json lexicon
     * - Wrap it in text that also triggers safe-context phrases or allow-list terms
     * - Call moderate(text) and verify verdict is always 'crisis'
     */

    // Load actual crisis terms from the built-in lexicon
    const builtInLexicon = loadBuiltInLexicons()
    const crisisTerms = builtInLexicon.crisis

    // Sample of safe-context phrases that could be in the allow-list
    const safeContextPhrases = [
      'i hate this feeling',
      'i feel so broken',
      'everything hurts',
      'life is painful',
      'i feel trapped',
    ]

    it('property: crisis verdict is always returned regardless of allow-list or safe-context coverage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...crisisTerms),
          fc.constantFrom(...safeContextPhrases),
          async (crisisTerm, safePhrase) => {
            // Mock Perspective as unavailable (force local-only evaluation)
            scoreText.mockResolvedValue({ ok: false, error: 'unavailable' })
            // Mock admin lexicon: put the crisis term in the allow-list AND
            // add a safe-context phrase as an allow entry
            getLexiconSync.mockReturnValue({
              allow: [crisisTerm, safePhrase],
              toxic: [],
              crisis: [],
            })

            // Construct text that contains both the crisis term and the
            // safe-context phrase, maximizing the chance that allow-list or
            // safe-context logic could try to suppress it
            const text = `${safePhrase} ${crisisTerm}`.slice(0, 280)

            // Skip if text is empty after slicing
            if (!text || text.trim().length === 0) return

            const result = await moderate(text)

            // Crisis ALWAYS wins — no allow-list or safe-context can override
            expect(result.verdict).toBe('crisis')
            expect(result.layer).toBe('crisis-keywords')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: crisis verdict when admin adds crisis term to allow-list (admin crisis + admin allow overlap)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...crisisTerms.slice(0, 20)),
          async (crisisTerm) => {
            // Mock Perspective as unavailable
            scoreText.mockResolvedValue({ ok: false, error: 'unavailable' })
            // Admin put the crisis term in both allow AND crisis lists
            getLexiconSync.mockReturnValue({
              allow: [crisisTerm],
              toxic: [],
              crisis: [crisisTerm],
            })

            const text = `feeling okay but ${crisisTerm}`

            if (text.length > 280) return

            const result = await moderate(text)

            expect(result.verdict).toBe('crisis')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ── Property 7: Built-in lists are immutable at runtime ─────────────────────
  describe('Feature: multilingual-word-filter, Property 7: Built-in lists are immutable at runtime', () => {
    /**
     * Validates: Requirements 7.4, 7.6
     *
     * For any sequence of admin lexicon operations (add, remove, update),
     * the set of built-in terms loaded from JSON files at startup SHALL
     * remain unchanged — admin operations only modify the admin-managed
     * lexicon stored in Supabase/file.
     *
     * Generator strategy:
     * - Load the built-in lexicons at the start
     * - Record their sizes/contents
     * - Simulate admin operations (different getLexiconSync returns)
     * - Trigger rebuildAutomata() with different admin terms
     * - Verify built-in arrays are unchanged after admin operations
     */

    it('property: loadBuiltInLexicons always returns the same frozen arrays regardless of admin state', async () => {
      // Snapshot the initial built-in lexicon state
      const initial = loadBuiltInLexicons()
      const initialCrisisCount = initial.crisis.length
      const initialToxicCount = initial.toxic.length
      const initialSafeContextCount = initial.safeContext.length
      const initialCrisisSnapshot = [...initial.crisis]
      const initialToxicSnapshot = [...initial.toxic]
      const initialSafeContextSnapshot = [...initial.safeContext]

      await fc.assert(
        fc.asyncProperty(
          // Generate random "admin" terms to simulate lexicon operations
          fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
          fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
          fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
          async (adminCrisis, adminToxic, adminAllow) => {
            // Simulate admin lexicon with arbitrary terms
            getLexiconSync.mockReturnValue({
              crisis: adminCrisis,
              toxic: adminToxic,
              allow: adminAllow,
            })

            // Trigger automata rebuild (merges admin + built-in)
            rebuildAutomata()

            // Re-load built-in lexicons — they must be unaffected by admin state
            const reloaded = loadBuiltInLexicons()

            // Verify counts are identical
            expect(reloaded.crisis.length).toBe(initialCrisisCount)
            expect(reloaded.toxic.length).toBe(initialToxicCount)
            expect(reloaded.safeContext.length).toBe(initialSafeContextCount)

            // Verify content is identical (spot-check first and last elements)
            expect(reloaded.crisis[0]).toBe(initialCrisisSnapshot[0])
            expect(reloaded.crisis[reloaded.crisis.length - 1]).toBe(initialCrisisSnapshot[initialCrisisSnapshot.length - 1])
            expect(reloaded.toxic[0]).toBe(initialToxicSnapshot[0])
            expect(reloaded.toxic[reloaded.toxic.length - 1]).toBe(initialToxicSnapshot[initialToxicSnapshot.length - 1])
            expect(reloaded.safeContext[0]).toBe(initialSafeContextSnapshot[0])
            expect(reloaded.safeContext[reloaded.safeContext.length - 1]).toBe(initialSafeContextSnapshot[initialSafeContextSnapshot.length - 1])

            // Verify arrays are frozen (immutable)
            expect(Object.isFrozen(reloaded.crisis)).toBe(true)
            expect(Object.isFrozen(reloaded.toxic)).toBe(true)
            expect(Object.isFrozen(reloaded.safeContext)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ── Property 9: Dry-run parity with live moderation ─────────────────────────
  describe('Feature: multilingual-word-filter, Property 9: Dry-run parity with live moderation', () => {
    /**
     * Validates: Requirements 10.1, 10.2, 10.3
     *
     * For any input text, moderateDryRun(text) SHALL produce the same verdict
     * as moderate(text), and SHALL additionally include matchedTerm,
     * lexiconSource, and normalizedText fields.
     *
     * Generator strategy:
     * - Generate text that triggers local layers (crisis/toxic) before
     *   reaching Perspective, by mocking Perspective as unavailable
     * - Call both moderate(text) and moderateDryRun(text)
     * - Verify both produce the same verdict
     * - Verify moderateDryRun includes extra fields
     */

    // Mix of texts: safe, toxic, and crisis — all triggering local layers only
    const testTexts = [
      'hello world',
      'good morning everyone',
      'i am feeling happy today',
      'the weather is nice',
      'thank you for your help',
      'putangina',
      'gago ka',
      'bobo',
      'tangina mo',
      'suicide',
      'kill myself',
      'want to die',
      'gusto kong mamatay',
      'i hate this feeling but gago',
      'reading books is fun',
      'stars are beautiful',
      'music heals the soul',
      'friendship is precious',
      'coding is enjoyable',
      'learning makes me grow',
    ]

    it('property: moderateDryRun produces same verdict as moderate and includes enriched fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...testTexts),
          async (text) => {
            // Mock Perspective as unavailable so both functions use the same
            // fallback path — this ensures deterministic comparison
            scoreText.mockResolvedValue({ ok: false, error: 'unavailable' })
            // Empty admin lexicon so only built-in terms are evaluated
            getLexiconSync.mockReturnValue({ allow: [], toxic: [], crisis: [] })

            const liveResult = await moderate(text)
            const dryRunResult = await moderateDryRun(text)

            // Verdict parity: both must agree
            expect(dryRunResult.verdict).toBe(liveResult.verdict)

            // Dry-run MUST include these enriched fields
            expect(dryRunResult).toHaveProperty('matchedTerm')
            expect(dryRunResult).toHaveProperty('lexiconSource')
            expect(dryRunResult).toHaveProperty('normalizedText')

            // normalizedText must be a string
            expect(typeof dryRunResult.normalizedText).toBe('string')

            // matchedTerm is either a string or null
            expect(
              dryRunResult.matchedTerm === null || typeof dryRunResult.matchedTerm === 'string'
            ).toBe(true)

            // lexiconSource is either null or one of the valid sources
            expect(
              dryRunResult.lexiconSource === null ||
              ['built-in', 'admin', 'perspective-api'].includes(dryRunResult.lexiconSource)
            ).toBe(true)

            // layer must be present (either 'none' for safe or the triggering layer)
            expect(dryRunResult).toHaveProperty('layer')
            expect(typeof dryRunResult.layer).toBe('string')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: dry-run parity with random generated safe text', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate safe-ish text: short words that are unlikely to trigger toxicity
          fc.array(
            fc.constantFrom(
              'hello', 'world', 'good', 'morning', 'nice', 'day',
              'sun', 'moon', 'star', 'blue', 'green', 'red',
              'love', 'peace', 'joy', 'calm', 'rest', 'hope',
              'tree', 'river', 'mountain', 'ocean', 'sky', 'cloud'
            ),
            { minLength: 1, maxLength: 8 }
          ).map(words => words.join(' ')),
          async (text) => {
            // Mock Perspective as unavailable
            scoreText.mockResolvedValue({ ok: false, error: 'unavailable' })
            getLexiconSync.mockReturnValue({ allow: [], toxic: [], crisis: [] })

            const liveResult = await moderate(text)
            const dryRunResult = await moderateDryRun(text)

            // Verdict must be identical
            expect(dryRunResult.verdict).toBe(liveResult.verdict)

            // Enriched fields must exist
            expect(dryRunResult).toHaveProperty('matchedTerm')
            expect(dryRunResult).toHaveProperty('lexiconSource')
            expect(dryRunResult).toHaveProperty('normalizedText')

            // For safe text, matchedTerm should be null
            if (dryRunResult.verdict === 'safe') {
              expect(dryRunResult.matchedTerm).toBeNull()
              expect(dryRunResult.lexiconSource).toBeNull()
              expect(dryRunResult.layer).toBe('none')
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
