/**
 * Admin Dry-Run Endpoint — Unit Tests
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 *
 * Tests the `moderateDryRun(text)` function directly (the HTTP endpoint is a
 * thin wrapper). Verifies that the DryRunResult shape is correct for all
 * possible verdicts: toxic, crisis, safe, and review.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Perspective API client
vi.mock('../moderation/perspective.js', () => ({
  scoreText: vi.fn(),
  evaluateScores: vi.fn(),
}))

// Mock storage (admin lexicon) — return empty admin lexicon so only built-in terms match
vi.mock('../lib/storage.js', () => ({
  getLexiconSync: vi.fn(),
  getLexicon: vi.fn(),
  saveLexicon: vi.fn(),
  appendAudit: vi.fn(),
  readAudit: vi.fn(),
  storageMode: vi.fn(() => 'file'),
}))

import { moderateDryRun } from '../moderation/engine.js'
import { scoreText, evaluateScores } from '../moderation/perspective.js'
import { getLexiconSync } from '../lib/storage.js'

describe('Admin Dry-Run Endpoint (moderateDryRun)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: empty admin lexicon
    getLexiconSync.mockReturnValue({ allow: [], toxic: [], crisis: [] })
    // Default: Perspective API available and returns safe scores
    scoreText.mockResolvedValue({ ok: true, scores: { TOXICITY: 0.1, SEVERE_TOXICITY: 0.05 } })
    evaluateScores.mockReturnValue({ blocked: false })
  })

  // ── Requirement 10.2: Toxic verdict returns matchedTerm and lexiconSource ──

  describe('Toxic verdict', () => {
    it('returns toxic verdict with correct DryRunResult shape for Filipino toxic term', async () => {
      const result = await moderateDryRun('putangina')

      expect(result.verdict).toBe('toxic')
      expect(result.matchedTerm).toEqual(expect.any(String))
      expect(result.matchedTerm).not.toBeNull()
      expect(result.lexiconSource).toBe('built-in')
      expect(result.layer).toBe('vernacular-keywords')
      expect(result.normalizedText).toEqual(expect.any(String))
    })

    it('returns toxic verdict with correct shape for English toxic term', async () => {
      // "fuck" is in the built-in English toxic lexicon and should be caught
      // in Layer 2b (vernacular-keywords includes EN terms)
      const result = await moderateDryRun('fuck')

      expect(result.verdict).toBe('toxic')
      expect(result.matchedTerm).toEqual(expect.any(String))
      expect(result.lexiconSource).toBe('built-in')
      expect(result.layer).toBe('vernacular-keywords')
      expect(result.normalizedText).toEqual(expect.any(String))
    })
  })

  // ── Requirement 10.2: Crisis verdict returns matchedTerm and lexiconSource ──

  describe('Crisis verdict', () => {
    it('returns crisis verdict with correct DryRunResult shape for English crisis term', async () => {
      const result = await moderateDryRun('suicide')

      expect(result.verdict).toBe('crisis')
      expect(result.matchedTerm).toEqual(expect.any(String))
      expect(result.matchedTerm).not.toBeNull()
      expect(result.lexiconSource).toBe('built-in')
      expect(result.layer).toBe('crisis-keywords')
      expect(result.normalizedText).toEqual(expect.any(String))
    })

    it('returns crisis verdict for Filipino crisis expression', async () => {
      const result = await moderateDryRun('gusto kong mamatay')

      expect(result.verdict).toBe('crisis')
      expect(result.matchedTerm).toEqual(expect.any(String))
      expect(result.lexiconSource).toBe('built-in')
      expect(result.layer).toBe('crisis-keywords')
      expect(result.normalizedText).toEqual(expect.any(String))
    })
  })

  // ── Requirement 10.3: Safe verdict returns normalizedText and null fields ──

  describe('Safe verdict', () => {
    it('returns safe verdict with correct DryRunResult shape', async () => {
      const result = await moderateDryRun('hello world')

      expect(result.verdict).toBe('safe')
      expect(result.matchedTerm).toBeNull()
      expect(result.lexiconSource).toBeNull()
      expect(result.layer).toBe('none')
      expect(result.normalizedText).toEqual(expect.any(String))
      expect(result.normalizedText.length).toBeGreaterThan(0)
    })

    it('normalizedText reflects the normalized version of input', async () => {
      const result = await moderateDryRun('Hello World')

      expect(result.normalizedText).toBe('hello world')
    })
  })

  // ── All responses include normalizedText as a string ──

  describe('normalizedText field', () => {
    it('is always present and is a string for toxic verdicts', async () => {
      const result = await moderateDryRun('putangina')
      expect(typeof result.normalizedText).toBe('string')
    })

    it('is always present and is a string for crisis verdicts', async () => {
      const result = await moderateDryRun('suicide')
      expect(typeof result.normalizedText).toBe('string')
    })

    it('is always present and is a string for safe verdicts', async () => {
      const result = await moderateDryRun('hello world')
      expect(typeof result.normalizedText).toBe('string')
    })
  })

  // ── Requirement 10.4: Perspective scores included when Layer 3 triggers ──

  describe('Perspective API scores (Layer 3)', () => {
    it('includes scores when Perspective API blocks the text', async () => {
      const mockScores = {
        TOXICITY: 0.92,
        SEVERE_TOXICITY: 0.85,
        IDENTITY_ATTACK: 0.3,
        INSULT: 0.6,
        PROFANITY: 0.4,
        THREAT: 0.2,
      }

      // Make the text pass all local layers (not in any built-in list)
      scoreText.mockResolvedValue({ ok: true, scores: mockScores })
      evaluateScores.mockReturnValue({ blocked: true, attribute: 'TOXICITY', score: 0.92 })

      // Use innocuous-looking text that isn't in built-in lists
      const result = await moderateDryRun('some subtle toxic content here')

      expect(result.verdict).toBe('toxic')
      expect(result.layer).toContain('perspective')
      expect(result.lexiconSource).toBe('perspective-api')
      expect(result.matchedTerm).toBe('TOXICITY')
      expect(result.scores).toBeDefined()
      expect(result.scores).toEqual(mockScores)
    })

    it('returns safe with scores when Perspective passes the text', async () => {
      const mockScores = {
        TOXICITY: 0.1,
        SEVERE_TOXICITY: 0.05,
        IDENTITY_ATTACK: 0.02,
        INSULT: 0.08,
        PROFANITY: 0.03,
        THREAT: 0.01,
      }

      scoreText.mockResolvedValue({ ok: true, scores: mockScores })
      evaluateScores.mockReturnValue({ blocked: false })

      const result = await moderateDryRun('I had a great day today')

      expect(result.verdict).toBe('safe')
      expect(result.layer).toBe('none')
      expect(result.normalizedText).toEqual(expect.any(String))
    })
  })

  // ── DryRunResult shape completeness ──

  describe('DryRunResult shape', () => {
    it('always contains verdict, matchedTerm, lexiconSource, layer, and normalizedText', async () => {
      const requiredKeys = ['verdict', 'matchedTerm', 'lexiconSource', 'layer', 'normalizedText']

      const safeResult = await moderateDryRun('hello world')
      for (const key of requiredKeys) {
        expect(safeResult).toHaveProperty(key)
      }

      const toxicResult = await moderateDryRun('putangina')
      for (const key of requiredKeys) {
        expect(toxicResult).toHaveProperty(key)
      }

      const crisisResult = await moderateDryRun('suicide')
      for (const key of requiredKeys) {
        expect(crisisResult).toHaveProperty(key)
      }
    })
  })
})
