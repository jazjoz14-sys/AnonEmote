/**
 * Preservation Property Test: Text Moderation Pipeline
 *
 * Validates: Requirements 3.2
 *
 * GOAL: Confirm that text posts (not drawings) go through the full
 * three-layer moderation pipeline on UNFIXED code.
 *
 * Observation: The moderate() function in engine.js processes ALL text through:
 *   Layer 1: Crisis keywords
 *   Layer 2: Vernacular toxicity + admin lexicon
 *   Layer 3: Perspective API (or English fallback)
 *
 * For safe text inputs that don't trigger any keyword list, the function
 * should reach Layer 3 (perspective or english-fallback) and return 'safe'.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

// Mock the perspective module to observe if Layer 3 is reached
vi.mock('./perspective.js', () => ({
  scoreText: vi.fn().mockResolvedValue({ ok: true, scores: { TOXICITY: 0.1, SEVERE_TOXICITY: 0.05 } }),
  evaluateScores: vi.fn().mockReturnValue({ blocked: false }),
}))

// Mock storage to provide empty lexicon (no admin terms)
vi.mock('../lib/storage.js', () => ({
  getLexiconSync: vi.fn().mockReturnValue({ crisis: [], toxic: [], allow: [] }),
}))

import { moderate } from './engine.js'
import { scoreText, evaluateScores } from './perspective.js'
import { getLexiconSync } from '../lib/storage.js'

describe('Preservation: Text Moderation Three-Layer Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLexiconSync.mockReturnValue({ crisis: [], toxic: [], allow: [] })
    scoreText.mockResolvedValue({ ok: true, scores: { TOXICITY: 0.1 } })
    evaluateScores.mockReturnValue({ blocked: false })
  })

  it('property: for all safe text submissions, moderation engine invokes all 3 layers (reaches Perspective)', () => {
    const safePhrases = fc.constantFrom(
      'I feel good today',
      'The weather is nice',
      'I learned something new',
      'Studying hard for exams',
      'Coffee keeps me going',
      'Had a great day',
      'Looking forward to weekend',
      'Made a new friend today',
      'Grateful for this moment',
      'The campus looks beautiful',
      'Just finished my homework',
      'The library is quiet tonight',
      'Taking a break now',
      'Met my classmates earlier',
      'Working on a project',
    )

    return fc.assert(
      fc.asyncProperty(safePhrases, async (text) => {
        scoreText.mockClear()
        evaluateScores.mockClear()

        const result = await moderate(text)

        // Perspective API (Layer 3) was invoked
        expect(scoreText).toHaveBeenCalledWith(text)
        expect(evaluateScores).toHaveBeenCalled()

        // Text passed moderation - verdict is 'safe' with layer 'perspective'
        expect(result.verdict).toBe('safe')
        expect(result.layer).toBe('perspective')
      }),
      { numRuns: 15 }
    )
  })

  it('property: text submissions always produce a verdict from the pipeline', () => {
    const validTexts = fc.constantFrom(
      'Hello world',
      'I am doing fine',
      'What a nice day',
      'Just thinking',
      'Random thought here',
    )

    return fc.assert(
      fc.asyncProperty(validTexts, async (text) => {
        const result = await moderate(text)
        expect(result).toHaveProperty('verdict')
        expect(['safe', 'toxic', 'crisis']).toContain(result.verdict)
        expect(result).toHaveProperty('layer')
      }),
      { numRuns: 5 }
    )
  })

  it('empty/invalid submissions are rejected at validation layer (not skipping pipeline)', async () => {
    const result = await moderate('')
    expect(result.verdict).toBe('toxic')
    expect(result.layer).toBe('validation')
  })

  it('text over 280 chars is rejected at validation layer', async () => {
    const longText = 'a'.repeat(281)
    const result = await moderate(longText)
    expect(result.verdict).toBe('toxic')
    expect(result.layer).toBe('validation')
  })
})
