/**
 * Property-based tests for graphicsPersistence module
 *
 * @vitest-environment jsdom
 */

// Feature: graphics-settings, Property 4: Corrupt data detection and fallback
// Validates: Requirements 2.4

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { loadGraphicsSettings, saveGraphicsSettings, detectActivePreset, GRAPHICS_PRESETS } from './graphicsPersistence.js'

const STORAGE_KEY = 'anonemote_graphics'

describe('Property 4: Corrupt data detection and fallback', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ── Arbitraries for generating corrupt data ──────────────────────────────

  /**
   * Generate an object with a completely random shape via fc.anything().
   * Filtered to exclude objects that accidentally pass validation.
   */
  const chaoticDataArb = fc.anything().filter(val => {
    // Exclude null/undefined (would just be "no data" — not corrupt stored data)
    if (val === null || val === undefined) return false
    // Exclude non-stringifiable values
    try {
      JSON.stringify(val)
      return true
    } catch {
      return false
    }
  })

  /**
   * Generate objects with missing required fields.
   * Start from a valid shape and randomly remove 1+ fields.
   */
  const missingFieldsArb = fc.record({
    version: fc.constant(1),
    bloomEnabled: fc.boolean(),
    decorEnabled: fc.boolean(),
    starCount: fc.integer({ min: 200, max: 5000 }),
    dpr: fc.double({ min: 0.5, max: 2.0, noNaN: true }),
    shadowMapSize: fc.constantFrom(0, 512, 1024),
    planetDetail: fc.constantFrom(2, 3, 4),
  }).chain(obj => {
    const keys = Object.keys(obj)
    // Remove at least 1 key (but not all — keep it interesting)
    return fc.subarray(keys, { minLength: 1, maxLength: keys.length - 1 }).map(keysToRemove => {
      const corrupted = { ...obj }
      for (const key of keysToRemove) {
        delete corrupted[key]
      }
      return corrupted
    })
  })

  /**
   * Generate objects with wrong types for each field.
   */
  const wrongTypesArb = fc.oneof(
    // bloomEnabled as non-boolean
    fc.record({
      version: fc.constant(1),
      bloomEnabled: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
      decorEnabled: fc.boolean(),
      starCount: fc.integer({ min: 200, max: 5000 }),
      dpr: fc.double({ min: 0.5, max: 2.0, noNaN: true }),
      shadowMapSize: fc.constantFrom(0, 512, 1024),
      planetDetail: fc.constantFrom(2, 3, 4),
    }),
    // decorEnabled as non-boolean
    fc.record({
      version: fc.constant(1),
      bloomEnabled: fc.boolean(),
      decorEnabled: fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
      starCount: fc.integer({ min: 200, max: 5000 }),
      dpr: fc.double({ min: 0.5, max: 2.0, noNaN: true }),
      shadowMapSize: fc.constantFrom(0, 512, 1024),
      planetDetail: fc.constantFrom(2, 3, 4),
    }),
    // starCount as non-integer or non-number
    fc.record({
      version: fc.constant(1),
      bloomEnabled: fc.boolean(),
      decorEnabled: fc.boolean(),
      starCount: fc.oneof(fc.string(), fc.boolean(), fc.constant(null)),
      dpr: fc.double({ min: 0.5, max: 2.0, noNaN: true }),
      shadowMapSize: fc.constantFrom(0, 512, 1024),
      planetDetail: fc.constantFrom(2, 3, 4),
    }),
    // dpr as non-number
    fc.record({
      version: fc.constant(1),
      bloomEnabled: fc.boolean(),
      decorEnabled: fc.boolean(),
      starCount: fc.integer({ min: 200, max: 5000 }),
      dpr: fc.oneof(fc.string(), fc.boolean(), fc.constant(null)),
      shadowMapSize: fc.constantFrom(0, 512, 1024),
      planetDetail: fc.constantFrom(2, 3, 4),
    }),
    // shadowMapSize as invalid value
    fc.record({
      version: fc.constant(1),
      bloomEnabled: fc.boolean(),
      decorEnabled: fc.boolean(),
      starCount: fc.integer({ min: 200, max: 5000 }),
      dpr: fc.double({ min: 0.5, max: 2.0, noNaN: true }),
      shadowMapSize: fc.oneof(fc.string(), fc.boolean(), fc.constant(null)),
      planetDetail: fc.constantFrom(2, 3, 4),
    }),
    // planetDetail as invalid value
    fc.record({
      version: fc.constant(1),
      bloomEnabled: fc.boolean(),
      decorEnabled: fc.boolean(),
      starCount: fc.integer({ min: 200, max: 5000 }),
      dpr: fc.double({ min: 0.5, max: 2.0, noNaN: true }),
      shadowMapSize: fc.constantFrom(0, 512, 1024),
      planetDetail: fc.oneof(fc.string(), fc.boolean(), fc.constant(null)),
    })
  )

  /**
   * Generate objects with out-of-range values.
   */
  const outOfRangeArb = fc.oneof(
    // starCount out of range (too low or too high)
    fc.record({
      version: fc.constant(1),
      bloomEnabled: fc.boolean(),
      decorEnabled: fc.boolean(),
      starCount: fc.oneof(
        fc.integer({ min: -10000, max: 199 }),
        fc.integer({ min: 5001, max: 100000 })
      ),
      dpr: fc.double({ min: 0.5, max: 2.0, noNaN: true }),
      shadowMapSize: fc.constantFrom(0, 512, 1024),
      planetDetail: fc.constantFrom(2, 3, 4),
    }),
    // dpr out of range
    fc.record({
      version: fc.constant(1),
      bloomEnabled: fc.boolean(),
      decorEnabled: fc.boolean(),
      starCount: fc.integer({ min: 200, max: 5000 }),
      dpr: fc.oneof(
        fc.double({ min: -10, max: 0.49, noNaN: true }),
        fc.double({ min: 2.01, max: 10, noNaN: true })
      ),
      shadowMapSize: fc.constantFrom(0, 512, 1024),
      planetDetail: fc.constantFrom(2, 3, 4),
    }),
    // shadowMapSize invalid integer
    fc.record({
      version: fc.constant(1),
      bloomEnabled: fc.boolean(),
      decorEnabled: fc.boolean(),
      starCount: fc.integer({ min: 200, max: 5000 }),
      dpr: fc.double({ min: 0.5, max: 2.0, noNaN: true }),
      shadowMapSize: fc.integer({ min: 1, max: 2048 }).filter(v => ![0, 512, 1024].includes(v)),
      planetDetail: fc.constantFrom(2, 3, 4),
    }),
    // planetDetail invalid integer
    fc.record({
      version: fc.constant(1),
      bloomEnabled: fc.boolean(),
      decorEnabled: fc.boolean(),
      starCount: fc.integer({ min: 200, max: 5000 }),
      dpr: fc.double({ min: 0.5, max: 2.0, noNaN: true }),
      shadowMapSize: fc.constantFrom(0, 512, 1024),
      planetDetail: fc.integer({ min: -10, max: 100 }).filter(v => ![2, 3, 4].includes(v)),
    })
  )

  /**
   * Generate objects with wrong version field.
   */
  const wrongVersionArb = fc.record({
    version: fc.oneof(
      fc.integer().filter(v => v !== 1),
      fc.string(),
      fc.constant(null),
      fc.constant(undefined)
    ),
    bloomEnabled: fc.boolean(),
    decorEnabled: fc.boolean(),
    starCount: fc.integer({ min: 200, max: 5000 }),
    dpr: fc.double({ min: 0.5, max: 2.0, noNaN: true }),
    shadowMapSize: fc.constantFrom(0, 512, 1024),
    planetDetail: fc.constantFrom(2, 3, 4),
  })

  // ── Property tests ────────────────────────────────────────────────────────

  it('returns null and removes corrupt entry for chaotic data', () => {
    fc.assert(
      fc.property(chaoticDataArb, (corruptData) => {
        // Write corrupt data directly to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptData))

        const result = loadGraphicsSettings()

        // If the chaotic data happens to be a valid config, skip this case
        // (we can't guarantee fc.anything() never produces a valid object)
        if (result !== null) {
          // Verify it actually IS valid — if loadGraphicsSettings returned non-null,
          // the data must have accidentally been valid
          expect(typeof result.bloomEnabled).toBe('boolean')
          expect(typeof result.decorEnabled).toBe('boolean')
          expect(result.starCount).toBeGreaterThanOrEqual(200)
          expect(result.starCount).toBeLessThanOrEqual(5000)
          expect(result.dpr).toBeGreaterThanOrEqual(0.5)
          expect(result.dpr).toBeLessThanOrEqual(2.0)
          expect([0, 512, 1024]).toContain(result.shadowMapSize)
          expect([2, 3, 4]).toContain(result.planetDetail)
          return // valid data — not a useful test case, but not a failure
        }

        // Corrupt data: loadGraphicsSettings returned null
        expect(result).toBeNull()
        // Corrupt entry must be removed from localStorage
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      }),
      { numRuns: 200 }
    )
  })

  it('returns null and removes entry for objects with missing required fields', () => {
    fc.assert(
      fc.property(missingFieldsArb, (corruptData) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptData))

        const result = loadGraphicsSettings()

        expect(result).toBeNull()
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      }),
      { numRuns: 200 }
    )
  })

  it('returns null and removes entry for objects with wrong field types', () => {
    fc.assert(
      fc.property(wrongTypesArb, (corruptData) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptData))

        const result = loadGraphicsSettings()

        expect(result).toBeNull()
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      }),
      { numRuns: 200 }
    )
  })

  it('returns null and removes entry for objects with out-of-range values', () => {
    fc.assert(
      fc.property(outOfRangeArb, (corruptData) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptData))

        const result = loadGraphicsSettings()

        expect(result).toBeNull()
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      }),
      { numRuns: 200 }
    )
  })

  it('returns null and removes entry for objects with wrong version', () => {
    fc.assert(
      fc.property(wrongVersionArb, (corruptData) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptData))

        const result = loadGraphicsSettings()

        expect(result).toBeNull()
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      }),
      { numRuns: 200 }
    )
  })

  it('returns null for non-JSON strings in localStorage', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => {
          // Ensure it's not valid JSON that parses to a valid config
          try { JSON.parse(s); return false } catch { return true }
        }),
        (corruptString) => {
          localStorage.setItem(STORAGE_KEY, corruptString)

          const result = loadGraphicsSettings()

          expect(result).toBeNull()
          expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })
})


// Feature: graphics-settings, Property 5: Custom preset divergence detection

/**
 * Validates: Requirements 3.3
 *
 * Property 5: Custom preset divergence detection
 * For any named preset (low, medium, high) and any single-field modification
 * that produces a value different from that preset's definition,
 * detectActivePreset() SHALL return 'custom'.
 */

// ── Arbitraries for Property 5 ───────────────────────────────────────────

/** Preset names available */
const presetNameArb = fc.constantFrom('low', 'medium', 'high')

/** Fields that can be mutated */
const settingFieldArb = fc.constantFrom(
  'bloomEnabled',
  'decorEnabled',
  'starCount',
  'dpr',
  'shadowMapSize',
  'planetDetail'
)

/**
 * Generate a value for the given field that is guaranteed to differ from the
 * preset's current value. For booleans, flip. For numbers, pick a valid value
 * that is != the current one.
 */
function mutatedValueArb(field, presetValue) {
  switch (field) {
    case 'bloomEnabled':
    case 'decorEnabled':
      // Boolean — just flip
      return fc.constant(!presetValue)

    case 'starCount':
      // Integer in [200, 5000] step 100, but != presetValue
      return fc.integer({ min: 2, max: 50 })
        .filter(n => n * 100 !== presetValue)
        .map(n => n * 100)

    case 'dpr':
      // Float in [0.5, 2.0] step 0.25, but != presetValue
      return fc.integer({ min: 2, max: 8 })
        .filter(n => n * 0.25 !== presetValue)
        .map(n => n * 0.25)

    case 'shadowMapSize':
      // One of {0, 512, 1024}, but != presetValue
      return fc.constantFrom(0, 512, 1024).filter(v => v !== presetValue)

    case 'planetDetail':
      // One of {2, 3, 4}, but != presetValue
      return fc.constantFrom(2, 3, 4).filter(v => v !== presetValue)

    default:
      return fc.constant(null)
  }
}

/**
 * Arbitrary that generates a preset name, a field to mutate, and a valid
 * mutated value that differs from that preset's value for the chosen field.
 */
const divergentSettingsArb = presetNameArb.chain(presetName => {
  const preset = GRAPHICS_PRESETS[presetName]
  return settingFieldArb.chain(field => {
    const originalValue = preset[field]
    return mutatedValueArb(field, originalValue).map(mutatedValue => ({
      presetName,
      field,
      originalValue,
      mutatedValue,
      settings: { ...preset, [field]: mutatedValue },
    }))
  })
})

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Property 5: Custom preset divergence detection', () => {
  it('any single-field mutation from a named preset returns "custom"', () => {
    fc.assert(
      fc.property(divergentSettingsArb, ({ settings, presetName, field, originalValue, mutatedValue }) => {
        // Sanity: the mutated value really is different
        expect(mutatedValue).not.toBe(originalValue)

        // The core property: diverged settings must not match any preset
        const result = detectActivePreset(settings)
        expect(result).toBe('custom')
      }),
      { numRuns: 200 }
    )
  })

  it('unmodified presets are detected as their own name (baseline check)', () => {
    fc.assert(
      fc.property(presetNameArb, (presetName) => {
        const preset = GRAPHICS_PRESETS[presetName]
        const result = detectActivePreset({ ...preset })
        expect(result).toBe(presetName)
      }),
      { numRuns: 50 }
    )
  })

  it('mutating multiple fields still returns "custom" (when result does not land on another preset)', () => {
    fc.assert(
      fc.property(
        presetNameArb,
        fc.uniqueArray(settingFieldArb, { minLength: 2, maxLength: 5 }),
        (presetName, fields) => {
          const preset = GRAPHICS_PRESETS[presetName]
          const settings = { ...preset }

          // Mutate each selected field to a value that no preset uses for that field
          // This ensures we never accidentally land on another named preset
          for (const field of fields) {
            switch (field) {
              case 'bloomEnabled':
              case 'decorEnabled':
                settings[field] = !preset[field]
                break
              case 'starCount':
                // 900 is not used by any preset (low=800, medium=2500, high=3500)
                settings[field] = 900
                break
              case 'dpr':
                // 0.75 is not used by any preset (low=1, medium=1.25, high=1.5)
                settings[field] = 0.75
                break
              case 'shadowMapSize':
                // 512 is not used by any preset (low=0, medium=0, high=1024)
                settings[field] = 512
                break
              case 'planetDetail':
                // All presets use 2, 3, or 4 — but combined with other non-preset
                // values, any value will make the combo unique
                settings[field] = preset[field] === 2 ? 3 : 2
                break
            }
          }

          // Since we use values that no preset contains (900 stars, 0.75 dpr, 512 shadow),
          // the result must be 'custom'
          const result = detectActivePreset(settings)
          expect(result).toBe('custom')
        }
      ),
      { numRuns: 100 }
    )
  })
})


// Feature: graphics-settings, Property 3: Persistence round-trip

/**
 * Validates: Requirements 2.1, 4.8
 *
 * Property 3: Persistence round-trip
 * For any valid graphics configuration object (all fields within their valid ranges),
 * serializing to localStorage via saveGraphicsSettings() and then reading back via
 * loadGraphicsSettings() SHALL produce an object deeply equal to the original.
 */

// ── Arbitraries for Property 3 ───────────────────────────────────────────

/** Arbitrary for a complete valid GraphicsConfig object */
const validConfigArb = fc.record({
  bloomEnabled: fc.boolean(),
  decorEnabled: fc.boolean(),
  starCount: fc.integer({ min: 200, max: 5000 }),
  dpr: fc.double({ min: 0.5, max: 2.0, noNaN: true, noDefaultInfinity: true }),
  shadowMapSize: fc.constantFrom(0, 512, 1024),
  planetDetail: fc.constantFrom(2, 3, 4),
})

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Property 3: Persistence round-trip', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('save then load returns deeply equal config', () => {
    fc.assert(
      fc.property(validConfigArb, (config) => {
        localStorage.clear()

        saveGraphicsSettings(config)
        const loaded = loadGraphicsSettings()

        expect(loaded).not.toBeNull()
        expect(loaded.bloomEnabled).toBe(config.bloomEnabled)
        expect(loaded.decorEnabled).toBe(config.decorEnabled)
        expect(loaded.starCount).toBe(config.starCount)
        expect(loaded.dpr).toBeCloseTo(config.dpr, 10)
        expect(loaded.shadowMapSize).toBe(config.shadowMapSize)
        expect(loaded.planetDetail).toBe(config.planetDetail)
      }),
      { numRuns: 200 }
    )
  })

  it('loaded config contains exactly the 6 expected fields (no extra keys)', () => {
    fc.assert(
      fc.property(validConfigArb, (config) => {
        localStorage.clear()

        saveGraphicsSettings(config)
        const loaded = loadGraphicsSettings()

        expect(loaded).not.toBeNull()
        const keys = Object.keys(loaded).sort()
        expect(keys).toEqual(
          ['bloomEnabled', 'decorEnabled', 'dpr', 'planetDetail', 'shadowMapSize', 'starCount']
        )
      }),
      { numRuns: 100 }
    )
  })

  it('multiple saves overwrite correctly — last write wins', () => {
    fc.assert(
      fc.property(validConfigArb, validConfigArb, (config1, config2) => {
        localStorage.clear()

        saveGraphicsSettings(config1)
        saveGraphicsSettings(config2)
        const loaded = loadGraphicsSettings()

        expect(loaded).not.toBeNull()
        expect(loaded.bloomEnabled).toBe(config2.bloomEnabled)
        expect(loaded.decorEnabled).toBe(config2.decorEnabled)
        expect(loaded.starCount).toBe(config2.starCount)
        expect(loaded.dpr).toBeCloseTo(config2.dpr, 10)
        expect(loaded.shadowMapSize).toBe(config2.shadowMapSize)
        expect(loaded.planetDetail).toBe(config2.planetDetail)
      }),
      { numRuns: 100 }
    )
  })

  it('load without prior save returns null', () => {
    localStorage.clear()
    const loaded = loadGraphicsSettings()
    expect(loaded).toBeNull()
  })
})
