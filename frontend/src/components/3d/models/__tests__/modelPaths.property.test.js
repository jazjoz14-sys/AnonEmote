import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { getModelPath, PLANET_IDS, AVATAR_IDS } from '../modelPaths.js'

// Feature: custom-3d-models, Property 1: Model path derivation
describe('Property 1: Model Path Derivation', () => {
  it('should produce correct path pattern for any valid planet ID', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PLANET_IDS),
        (id) => {
          const path = getModelPath(id, 'planet')
          expect(path).toBe(`/models/planets/${id}.glb`)
          expect(id).toMatch(/^[a-z]+$/)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should produce correct path pattern for any valid avatar ID', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...AVATAR_IDS),
        (id) => {
          const path = getModelPath(id, 'avatar')
          expect(path).toBe(`/models/avatars/${id}.glb`)
          expect(id).toMatch(/^[a-z]+$/)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should produce correct path for any valid ID and category combination', () => {
    const allIds = [...PLANET_IDS, ...AVATAR_IDS]
    const categories = ['planet', 'avatar']

    fc.assert(
      fc.property(
        fc.constantFrom(...allIds),
        fc.constantFrom(...categories),
        (id, category) => {
          const path = getModelPath(id, category)
          // Path matches the expected pattern: /models/{category}s/{id}.glb
          expect(path).toBe(`/models/${category}s/${id}.glb`)
          // ID is lowercase a-z only (no spaces, hyphens, underscores)
          expect(id).toMatch(/^[a-z]+$/)
          // Path starts with /models/ and ends with .glb
          expect(path).toMatch(/^\/models\/[a-z]+\/[a-z]+\.glb$/)
        }
      ),
      { numRuns: 100 }
    )
  })

  // **Validates: Requirements 1.1, 2.1, 7.4**
})
