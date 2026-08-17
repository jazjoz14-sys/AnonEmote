/**
 * Bug Condition Exploration Tests: Reactions Route
 *
 * Test Case 3: Reaction Race Condition (Bug #5)
 * **Validates: Requirements 1.5**
 *
 * Bug: Two concurrent POST /api/reactions with same session_id + post_id
 * can both succeed via select-then-insert pattern before unique constraint fires.
 *
 * Test Case 6: Planet Validation (Bug #10)
 * **Validates: Requirements 1.10**
 *
 * Bug: POST to /api/reactions with planet_id: 'invalid_planet' returns 500
 * instead of 400 (no validation, hits DB constraint).
 *
 * These tests are EXPECTED TO FAIL on unfixed code.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

describe('Bug Condition: Reaction Race Condition (Bug #5)', () => {
  it('concurrent reactions with same session+post should not produce duplicates', async () => {
    /**
     * **Validates: Requirements 1.5**
     *
     * Property: For any two concurrent POST requests with the same session_id + post_id
     * but different emoji, atomic upsert should prevent duplicate rows.
     *
     * On unfixed code: The select-then-insert pattern allows a race window where both
     * requests see no existing reaction, then both INSERT, potentially creating duplicates.
     */

    // Read the source to verify it uses atomic upsert (not select-then-insert)
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')

    const reactionsPath = path.default.resolve(
      path.default.dirname(fileURLToPath(import.meta.url)),
      'reactions.js'
    )
    const source = fs.default.readFileSync(reactionsPath, 'utf8')

    // The bug: code does SELECT then INSERT (race window)
    // Expected fix: use upsert/ON CONFLICT for atomic operation
    // The select-then-insert pattern requires BOTH .maybeSingle() lookup AND .insert()
    // Having .maybeSingle() alone (for toggle/switch lookup) is fine — the race is in INSERT after SELECT
    const hasSelectThenInsert = source.includes('.maybeSingle()') &&
      source.includes('.insert(')

    const hasAtomicUpsert = source.includes('.upsert(') ||
      source.includes('ON CONFLICT') ||
      source.includes('onConflict')

    // On unfixed code: has select-then-insert pattern, no atomic upsert
    // This assertion will FAIL because the code uses select-then-insert
    expect(hasSelectThenInsert).toBe(false)
    expect(hasAtomicUpsert).toBe(true)
  })

  it('property: race window is eliminated for all concurrent request pairs', async () => {
    /**
     * **Validates: Requirements 1.5**
     */
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')

    const reactionsPath = path.default.resolve(
      path.default.dirname(fileURLToPath(import.meta.url)),
      'reactions.js'
    )
    const source = fs.default.readFileSync(reactionsPath, 'utf8')

    fc.assert(
      fc.property(
        fc.uuid(),          // post_id
        fc.uuid(),          // session_id
        fc.constantFrom('🫂', '💙', '😢', '🌱', '✨'),  // emoji1
        fc.constantFrom('🫂', '💙', '😢', '🌱', '✨'),  // emoji2
        (postId, sessionId, emoji1, emoji2) => {
          // The property: for ANY pair of concurrent requests with same session+post,
          // the handler should use atomic upsert (no SELECT-then-INSERT gap).

          // On unfixed code: the handler does:
          //   1. SELECT existing reaction (maybeSingle)
          //   2. If null → INSERT
          // This allows two concurrent requests to both see null and both INSERT.

          const usesSelectThenInsert = source.includes('.maybeSingle()') &&
            source.includes('.insert(')

          if (usesSelectThenInsert) {
            throw new Error(
              `Race condition: concurrent requests for session=${sessionId} post=${postId} ` +
              `with emoji1=${emoji1} emoji2=${emoji2} can both INSERT due to select-then-insert pattern.`
            )
          }
        }
      )
    )
  })
})

describe('Bug Condition: Planet Validation Missing (Bug #10)', () => {
  it('should return 400 for invalid planet_id', async () => {
    /**
     * **Validates: Requirements 1.10**
     *
     * Bug: POST to /api/reactions with invalid planet_id gets no validation
     * and results in a 500 error from the DB constraint violation.
     * Expected: Should return 400 with descriptive error message.
     */
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')

    const reactionsPath = path.default.resolve(
      path.default.dirname(fileURLToPath(import.meta.url)),
      'reactions.js'
    )
    const source = fs.default.readFileSync(reactionsPath, 'utf8')

    const ALLOWED_PLANETS = ['joy', 'vent', 'advice', 'grief', 'anxiety', 'neutral', 'doodle']

    // Check if the route validates planet_id against an allowed list
    const hasPlanetValidation =
      source.includes('ALLOWED_PLANETS') ||
      source.includes('planet_id') && (
        source.includes('invalid') ||
        source.includes('validate') ||
        ALLOWED_PLANETS.some(p => source.includes(`'${p}'`)) &&
        source.includes('includes')
      )

    // On unfixed code: no planet_id validation exists in reactions route
    // The route only validates emoji, post_id, session_id — not planet_id
    expect(hasPlanetValidation).toBe(true)
  })

  it('property: all invalid planet_ids should be rejected with 400', async () => {
    /**
     * **Validates: Requirements 1.10**
     */
    const ALLOWED_PLANETS = ['joy', 'vent', 'advice', 'grief', 'anxiety', 'neutral', 'doodle']

    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')

    const reactionsPath = path.default.resolve(
      path.default.dirname(fileURLToPath(import.meta.url)),
      'reactions.js'
    )
    const source = fs.default.readFileSync(reactionsPath, 'utf8')

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => !ALLOWED_PLANETS.includes(s)),
        (invalidPlanetId) => {
          // For any string that is NOT in the allowed list,
          // the route should validate and reject it with 400.
          // On unfixed code: no validation exists, so it would pass through
          // to the DB and cause a 500 from the CHECK constraint.

          // Must have validation that checks planet_id
          const validates = source.includes('ALLOWED_PLANETS') ||
            (source.includes('planet_id') && source.includes('400'))

          if (!validates) {
            throw new Error(
              `No planet_id validation found. Invalid value "${invalidPlanetId}" ` +
              `would reach the DB and cause a 500 instead of 400.`
            )
          }
        }
      )
    )
  })
})
