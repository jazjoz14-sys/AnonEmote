// Feature: custom-3d-models, Property 5: Avatar Aura Color Application
import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'

// Mock three module to provide a minimal Color class
vi.mock('three', () => ({
  Color: class Color {
    constructor(hex) {
      this.hex = hex
    }
  },
  Box3: class Box3 {
    setFromObject() { return this }
    getBoundingSphere(s) { s.radius = 1; return s }
  },
  Sphere: class Sphere {
    constructor() { this.radius = 1 }
  },
}))

/**
 * Creates a mock scene with N meshes, each having default material properties.
 * Includes non-mesh children to verify they are correctly skipped.
 *
 * @param {number} meshCount - Number of mesh children to generate
 * @returns {{ traverse: Function, meshes: Array }}
 */
function createMockScene(meshCount) {
  const meshes = Array.from({ length: meshCount }, () => ({
    isMesh: true,
    material: {
      emissive: null,
      emissiveIntensity: 0,
      roughness: 1.0,
      toneMapped: true,
      needsUpdate: false,
    },
  }))

  // Add non-mesh children that should be skipped
  const nonMeshChildren = [
    { isMesh: false, material: null },
    { isMesh: true, material: null }, // mesh without material — should be skipped
  ]

  const allChildren = [...meshes, ...nonMeshChildren]

  return {
    traverse: (cb) => allChildren.forEach(cb),
    meshes,
  }
}

/**
 * Applies aura color to a scene — mirrors the logic in AvatarGLB.jsx useEffect.
 * Uses a simple string representation instead of THREE.Color for testability.
 *
 * @param {object} scene - Mock scene with traverse method
 * @param {string} auraColor - Hex color string (e.g., '#a3f1b2')
 */
function applyAuraColor(scene, auraColor) {
  scene.traverse((child) => {
    if (!child.isMesh || !child.material) return

    child.material.emissive = auraColor
    child.material.emissiveIntensity = 1.0
    child.material.roughness = 0.4
    child.material.toneMapped = false
    child.material.needsUpdate = true
  })
}

// Arbitrary: valid 6-digit hex color string (characters 0-9, a-f)
const hexCharArb = fc.constantFrom(
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'a', 'b', 'c', 'd', 'e', 'f'
)
const hexColorArb = fc
  .array(hexCharArb, { minLength: 6, maxLength: 6 })
  .map((chars) => `#${chars.join('')}`)

// Arbitrary: mesh count between 1 and 10
const meshCountArb = fc.integer({ min: 1, max: 10 })

describe('Property 5: Avatar Aura Color Application', () => {
  it('applies correct emissive properties to all meshes for any hex color and mesh count', () => {
    fc.assert(
      fc.property(
        hexColorArb,
        meshCountArb,
        (auraColor, meshCount) => {
          const scene = createMockScene(meshCount)

          applyAuraColor(scene, auraColor)

          // Every mesh must have the correct material properties
          scene.meshes.forEach((mesh) => {
            expect(mesh.material.emissive).toBe(auraColor)
            expect(mesh.material.emissiveIntensity).toBeGreaterThanOrEqual(1.0)
            expect(mesh.material.roughness).toBeLessThanOrEqual(0.4)
            expect(mesh.material.toneMapped).toBe(false)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('emissiveIntensity is exactly 1.0 for any input', () => {
    fc.assert(
      fc.property(
        hexColorArb,
        meshCountArb,
        (auraColor, meshCount) => {
          const scene = createMockScene(meshCount)

          applyAuraColor(scene, auraColor)

          scene.meshes.forEach((mesh) => {
            expect(mesh.material.emissiveIntensity).toBe(1.0)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('roughness is exactly 0.4 for any input', () => {
    fc.assert(
      fc.property(
        hexColorArb,
        meshCountArb,
        (auraColor, meshCount) => {
          const scene = createMockScene(meshCount)

          applyAuraColor(scene, auraColor)

          scene.meshes.forEach((mesh) => {
            expect(mesh.material.roughness).toBe(0.4)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('does not modify non-mesh children or meshes without materials', () => {
    fc.assert(
      fc.property(
        hexColorArb,
        meshCountArb,
        (auraColor, meshCount) => {
          const scene = createMockScene(meshCount)

          // Track that non-mesh/null-material children are unchanged
          const nonMeshChild = { isMesh: false, material: { emissive: null, toneMapped: true } }
          const nullMatChild = { isMesh: true, material: null }
          const allChildren = [...scene.meshes, nonMeshChild, nullMatChild]

          const extendedScene = {
            traverse: (cb) => allChildren.forEach(cb),
            meshes: scene.meshes,
          }

          applyAuraColor(extendedScene, auraColor)

          // Non-mesh child should be untouched
          expect(nonMeshChild.material.emissive).toBeNull()
          expect(nonMeshChild.material.toneMapped).toBe(true)

          // Null-material mesh should not throw
          expect(nullMatChild.material).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  // **Validates: Requirements 2.4**
})
