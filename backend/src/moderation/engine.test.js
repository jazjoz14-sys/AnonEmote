/**
 * Moderation Engine Unit Tests
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.11, 1.12
 *
 * Tests the three-layer hybrid AI moderation engine with mocked dependencies:
 * - Layer 1: Crisis keyword detection (English, Tagalog, Bicolano)
 * - Layer 2: Filipino vernacular toxicity detection
 * - Layer 3: Perspective API scoring + English fallback
 * - Validation: empty/whitespace/over-length
 * - Admin lexicon: allow-list and toxic-list behavior
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Perspective API client
vi.mock('./perspective.js', () => ({
  scoreText: vi.fn(),
  evaluateScores: vi.fn(),
}))

// Mock storage (admin lexicon)
vi.mock('../lib/storage.js', () => ({
  getLexiconSync: vi.fn(),
}))

import { moderate, normalize } from './engine.js'
import { scoreText, evaluateScores } from './perspective.js'
import { getLexiconSync } from '../lib/storage.js'

describe('Moderation Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: empty admin lexicon
    getLexiconSync.mockReturnValue({ allow: [], toxic: [], crisis: [] })
    // Default: Perspective API available and returns safe scores
    scoreText.mockResolvedValue({ ok: true, scores: { TOXICITY: 0.1, SEVERE_TOXICITY: 0.05 } })
    evaluateScores.mockReturnValue({ blocked: false })
  })

  // ── Layer 1: Crisis Detection — English (Requirement 1.1) ─────────────────

  describe('Layer 1 — Crisis keywords (English)', () => {
    it('detects "suicide" as crisis', async () => {
      const result = await moderate('suicide')
      expect(result.verdict).toBe('crisis')
      expect(result.layer).toBe('crisis-keywords')
    })

    it('detects "kill myself" as crisis', async () => {
      const result = await moderate('I want to kill myself')
      expect(result.verdict).toBe('crisis')
      expect(result.layer).toBe('crisis-keywords')
    })

    it('detects "self-harm" as crisis', async () => {
      const result = await moderate('thinking about self-harm')
      expect(result.verdict).toBe('crisis')
      expect(result.layer).toBe('crisis-keywords')
    })

    it('detects "self harm" (without hyphen) as crisis', async () => {
      const result = await moderate('self harm thoughts')
      expect(result.verdict).toBe('crisis')
      expect(result.layer).toBe('crisis-keywords')
    })

    it('detects "want to die" as crisis', async () => {
      const result = await moderate('i want to die')
      expect(result.verdict).toBe('crisis')
      expect(result.layer).toBe('crisis-keywords')
    })
  })

  // ── Layer 1: Crisis Detection — Tagalog (Requirement 1.2) ─────────────────

  describe('Layer 1 — Crisis keywords (Tagalog)', () => {
    it('detects "gusto kong mamatay" as crisis', async () => {
      const result = await moderate('gusto kong mamatay')
      expect(result.verdict).toBe('crisis')
      expect(result.layer).toBe('crisis-keywords')
    })

    it('detects "pagpapakamatay" as crisis', async () => {
      const result = await moderate('nag-iisip ng pagpapakamatay')
      expect(result.verdict).toBe('crisis')
      expect(result.layer).toBe('crisis-keywords')
    })

    it('detects "ayaw ko na mabuhay" as crisis', async () => {
      const result = await moderate('ayaw ko na mabuhay')
      expect(result.verdict).toBe('crisis')
      expect(result.layer).toBe('crisis-keywords')
    })
  })

  // ── Layer 1: Crisis Detection — Bicolano (Requirement 1.3) ────────────────

  describe('Layer 1 — Crisis keywords (Bicolano)', () => {
    it('detects "gusto ko na magadan" as crisis', async () => {
      const result = await moderate('gusto ko na magadan')
      expect(result.verdict).toBe('crisis')
      expect(result.layer).toBe('crisis-keywords')
    })

    it('detects "sukay na ako sa buhay" as crisis', async () => {
      const result = await moderate('sukay na ako sa buhay')
      expect(result.verdict).toBe('crisis')
      expect(result.layer).toBe('crisis-keywords')
    })
  })

  // ── Layer 2: Vernacular Toxicity (Requirement 1.4) ────────────────────────

  describe('Layer 2 — Vernacular keywords', () => {
    it('detects Tagalog "putangina" as toxic', async () => {
      const result = await moderate('putangina mo')
      expect(result.verdict).toBe('toxic')
      expect(result.layer).toBe('vernacular-keywords')
    })

    it('detects Tagalog "gago" as toxic', async () => {
      const result = await moderate('gago ka')
      expect(result.verdict).toBe('toxic')
      expect(result.layer).toBe('vernacular-keywords')
    })

    it('detects Bicolano "yawa" as toxic', async () => {
      const result = await moderate('yawa ka')
      expect(result.verdict).toBe('toxic')
      expect(result.layer).toBe('vernacular-keywords')
    })

    it('detects "putang ina" (with space) as toxic', async () => {
      const result = await moderate('putang ina naman')
      expect(result.verdict).toBe('toxic')
      expect(result.layer).toBe('vernacular-keywords')
    })
  })

  // ── Layer 3: Perspective API (Requirement 1.5) ────────────────────────────

  describe('Layer 3 — Perspective API scoring', () => {
    it('returns toxic when Perspective scores exceed threshold', async () => {
      scoreText.mockResolvedValue({
        ok: true,
        scores: { TOXICITY: 0.9, SEVERE_TOXICITY: 0.8, INSULT: 0.3 },
      })
      evaluateScores.mockReturnValue({ blocked: true, attribute: 'SEVERE_TOXICITY', score: 0.8 })

      const result = await moderate('some english text here')
      expect(result.verdict).toBe('toxic')
      expect(result.layer).toBe('perspective:SEVERE_TOXICITY')
      expect(result.scores).toBeDefined()
    })

    it('returns safe when Perspective scores are below thresholds', async () => {
      scoreText.mockResolvedValue({
        ok: true,
        scores: { TOXICITY: 0.2, SEVERE_TOXICITY: 0.1, INSULT: 0.15 },
      })
      evaluateScores.mockReturnValue({ blocked: false })

      const result = await moderate('I had a good day today')
      expect(result.verdict).toBe('safe')
      expect(result.layer).toBe('perspective')
    })
  })

  // ── Layer 3 Fallback: API Unavailable (Requirements 1.6, 1.7) ─────────────

  describe('Layer 3 — Fallback when Perspective unavailable', () => {
    it('returns toxic via english-fallback when API down and text has profanity', async () => {
      scoreText.mockResolvedValue({ ok: false, error: 'Perspective request failed: timeout' })

      const result = await moderate('you are a fucking idiot')
      expect(result.verdict).toBe('toxic')
      expect(result.layer).toBe('english-fallback')
    })

    it('returns safe via english-fallback when API down and text is clean', async () => {
      scoreText.mockResolvedValue({ ok: false, error: 'Perspective request failed: timeout' })

      const result = await moderate('I feel good today')
      expect(result.verdict).toBe('safe')
      expect(result.layer).toBe('english-fallback')
    })

    it('returns toxic via english-fallback for "shit" when API is unavailable', async () => {
      scoreText.mockResolvedValue({ ok: false, error: 'PERSPECTIVE_API_KEY not configured' })

      const result = await moderate('this is shit')
      expect(result.verdict).toBe('toxic')
      expect(result.layer).toBe('english-fallback')
    })
  })

  // ── Validation (Requirements 1.8, 1.9) ────────────────────────────────────

  describe('Validation layer', () => {
    it('rejects empty string with validation layer', async () => {
      const result = await moderate('')
      expect(result.verdict).toBe('toxic')
      expect(result.reason).toBe('Empty submission.')
      expect(result.layer).toBe('validation')
    })

    it('rejects whitespace-only string', async () => {
      const result = await moderate('   \t\n  ')
      expect(result.verdict).toBe('toxic')
      expect(result.reason).toBe('Empty submission.')
      expect(result.layer).toBe('validation')
    })

    it('rejects text exceeding 280 characters', async () => {
      const longText = 'a'.repeat(281)
      const result = await moderate(longText)
      expect(result.verdict).toBe('toxic')
      expect(result.reason).toBe('Message exceeds 280 characters.')
      expect(result.layer).toBe('validation')
    })

    it('accepts text exactly 280 characters', async () => {
      const text = 'a'.repeat(280)
      const result = await moderate(text)
      expect(result.verdict).not.toBe('toxic')
      // Should pass through to Perspective/fallback layer
      expect(result.layer).not.toBe('validation')
    })
  })

  // ── Admin Allow-List (Requirements 1.11, 1.12) ────────────────────────────

  describe('Admin allow-list', () => {
    it('bypasses toxicity detection for allow-listed text', async () => {
      getLexiconSync.mockReturnValue({ allow: ['damn'], toxic: [], crisis: [] })

      const result = await moderate('damn that was cool')
      expect(result.verdict).toBe('safe')
      expect(result.layer).toBe('admin-allowlist')
      // Perspective should NOT be called since allow-list short-circuits
      expect(scoreText).not.toHaveBeenCalled()
    })

    it('does NOT bypass crisis detection even if allow-listed', async () => {
      getLexiconSync.mockReturnValue({ allow: ['suicide'], toxic: [], crisis: [] })

      const result = await moderate('thinking about suicide')
      expect(result.verdict).toBe('crisis')
      expect(result.layer).toBe('crisis-keywords')
    })

    it('crisis takes priority over allow-list with matching text', async () => {
      getLexiconSync.mockReturnValue({ allow: ['kill myself'], toxic: [], crisis: [] })

      const result = await moderate('i want to kill myself')
      expect(result.verdict).toBe('crisis')
      expect(result.layer).toBe('crisis-keywords')
    })
  })

  // ── Admin Toxic List (Requirement from design) ────────────────────────────

  describe('Admin toxic list', () => {
    it('returns toxic with admin-lexicon layer for admin-added toxic term', async () => {
      getLexiconSync.mockReturnValue({ allow: [], toxic: ['badword'], crisis: [] })

      const result = await moderate('that is a badword right there')
      expect(result.verdict).toBe('toxic')
      expect(result.layer).toBe('admin-lexicon')
    })

    it('admin toxic list is checked before vernacular keywords', async () => {
      getLexiconSync.mockReturnValue({ allow: [], toxic: ['test term'], crisis: [] })

      const result = await moderate('this is a test term')
      expect(result.verdict).toBe('toxic')
      expect(result.layer).toBe('admin-lexicon')
      // Perspective API should not be called since admin-lexicon already matched
      expect(scoreText).not.toHaveBeenCalled()
    })
  })
})
