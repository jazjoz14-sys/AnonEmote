// Feature: custom-3d-models, Property 7: Quality Tier Material Adaptation
import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'

// Mock three module before importing adaptMaterials
vi.mock('three', () => ({
  MeshStandardMaterial: class MeshStandardMaterial {
    constructor(opts = {}) {
      this.color = opts.color ?? null
      this.map = null
      this.normalMap = null
      this.roughnessMap = null
      this.emissiveMap = null
      this.needsUpdate = false
    }
  },
}))

// Mock device.js to prevent import errors
vi.mock('../../../../lib/device.js', () => ({
  qualityTier: 'high',
}))

// Mock the store to prevent graphicsSlice initialization from failing
vi.mock('../../../../store/useAppStore.js', () => ({
  default: { getState: () => ({ activePreset: 'high' }) },
}))

import { adaptMaterials } from '../tierConfig.js'

/**
 * Creates a mock scene with meshes that have various material configurations.
 *
 * @param {Array<{hasNormalMap: boolean, hasRoughnessMap: boolean, hasEmissiveMap: boolean}>} meshConfigs
 * @returns {{ traverse: Function, meshes: Array }}
 */
function createMockScene(meshConfigs) {
  const meshes = meshConfigs.map((config) => ({
    isMesh: true,
    material: {
      map: config.hasMap ? { isTexture: true, id: 'diffuse' } : null,
      normalMap: config.hasNormalMap ? { isTexture: true, id: 'normal' } : null,
      roughnessMap: config.hasRoughnessMap ? { isTexture: true, id: 'roughness' } : null,
      emissiveMap: config.hasEmissiveMap ? { isTexture: true, id: 'emissive' } : null,
      needsUpdate: false,
    },
  }))

  return {
    traverse: (cb) => meshes.forEach(cb),
    meshes,
  }
}

// Arbitrary for material configuration per mesh
const meshConfigArb = fc.record({
  hasMap: fc.boolean(),
  hasNormalMap: fc.boolean(),
  hasRoughnessMap: fc.boolean(),
  hasEmissiveMap: fc.boolean(),
})

// Arbitrary for a scene with 1-5 meshes
const sceneConfigArb = fc.array(meshConfigArb, { minLength: 1, maxLength: 5 })

// Arbitrary for quality tier
const tierArb = fc.constantFrom('low', 'medium', 'high')

// Arbitrary for fallback color (hex number)
const fallbackColorArb = fc.integer({ min: 0x000000, max: 0xffffff })

describe('Property 7: Quality Tier Material Adaptation', () => {
  it('LOW tier: strips all textures and uses flat color material', () => {
    fc.assert(
      fc.property(
        sceneConfigArb,
        fallbackColorArb,
        (meshConfigs, fallbackColor) => {
          const scene = createMockScene(meshConfigs)

          adaptMaterials(scene, 'low', fallbackColor)

          // Every mesh should have a new flat-color material with no maps
          scene.meshes.forEach((mesh) => {
            expect(mesh.material.color).toBe(fallbackColor)
            expect(mesh.material.normalMap).toBeNull()
            expect(mesh.material.roughnessMap).toBeNull()
            expect(mesh.material.emissiveMap).toBeNull()
            expect(mesh.material.map).toBeNull()
            expect(mesh.material.needsUpdate).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('MEDIUM tier: disables normal maps but preserves roughness and emissive maps', () => {
    fc.assert(
      fc.property(
        sceneConfigArb,
        fallbackColorArb,
        (meshConfigs, fallbackColor) => {
          // Track original state before adaptation
          const originalMaps = meshConfigs.map((config) => ({
            hadRoughnessMap: config.hasRoughnessMap,
            hadEmissiveMap: config.hasEmissiveMap,
          }))

          const scene = createMockScene(meshConfigs)

          adaptMaterials(scene, 'medium', fallbackColor)

          scene.meshes.forEach((mesh, i) => {
            // Normal map must always be null on medium tier
            expect(mesh.material.normalMap).toBeNull()

            // Roughness map preserved if it existed
            if (originalMaps[i].hadRoughnessMap) {
              expect(mesh.material.roughnessMap).not.toBeNull()
            } else {
              expect(mesh.material.roughnessMap).toBeNull()
            }

            // Emissive map preserved if it existed
            if (originalMaps[i].hadEmissiveMap) {
              expect(mesh.material.emissiveMap).not.toBeNull()
            } else {
              expect(mesh.material.emissiveMap).toBeNull()
            }

            expect(mesh.material.needsUpdate).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('HIGH tier: preserves all maps as-is', () => {
    fc.assert(
      fc.property(
        sceneConfigArb,
        fallbackColorArb,
        (meshConfigs, fallbackColor) => {
          // Track original state
          const originalMaps = meshConfigs.map((config) => ({
            hadNormalMap: config.hasNormalMap,
            hadRoughnessMap: config.hasRoughnessMap,
            hadEmissiveMap: config.hasEmissiveMap,
            hadMap: config.hasMap,
          }))

          const scene = createMockScene(meshConfigs)

          adaptMaterials(scene, 'high', fallbackColor)

          // High tier should preserve all maps without modification
          scene.meshes.forEach((mesh, i) => {
            if (originalMaps[i].hadNormalMap) {
              expect(mesh.material.normalMap).not.toBeNull()
            } else {
              expect(mesh.material.normalMap).toBeNull()
            }

            if (originalMaps[i].hadRoughnessMap) {
              expect(mesh.material.roughnessMap).not.toBeNull()
            } else {
              expect(mesh.material.roughnessMap).toBeNull()
            }

            if (originalMaps[i].hadEmissiveMap) {
              expect(mesh.material.emissiveMap).not.toBeNull()
            } else {
              expect(mesh.material.emissiveMap).toBeNull()
            }

            if (originalMaps[i].hadMap) {
              expect(mesh.material.map).not.toBeNull()
            } else {
              expect(mesh.material.map).toBeNull()
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('any tier + material combo: tier rules are consistent', () => {
    fc.assert(
      fc.property(
        tierArb,
        sceneConfigArb,
        fallbackColorArb,
        (tier, meshConfigs, fallbackColor) => {
          const originalMaps = meshConfigs.map((config) => ({
            hadNormalMap: config.hasNormalMap,
            hadRoughnessMap: config.hasRoughnessMap,
            hadEmissiveMap: config.hasEmissiveMap,
          }))

          const scene = createMockScene(meshConfigs)

          adaptMaterials(scene, tier, fallbackColor)

          scene.meshes.forEach((mesh, i) => {
            if (tier === 'low') {
              // Low: flat color, no maps
              expect(mesh.material.color).toBe(fallbackColor)
              expect(mesh.material.normalMap).toBeNull()
              expect(mesh.material.roughnessMap).toBeNull()
              expect(mesh.material.emissiveMap).toBeNull()
            } else if (tier === 'medium') {
              // Medium: no normal maps, preserve roughness + emissive
              expect(mesh.material.normalMap).toBeNull()
              if (originalMaps[i].hadRoughnessMap) {
                expect(mesh.material.roughnessMap).not.toBeNull()
              }
              if (originalMaps[i].hadEmissiveMap) {
                expect(mesh.material.emissiveMap).not.toBeNull()
              }
            } else if (tier === 'high') {
              // High: all maps preserved
              if (originalMaps[i].hadNormalMap) {
                expect(mesh.material.normalMap).not.toBeNull()
              }
              if (originalMaps[i].hadRoughnessMap) {
                expect(mesh.material.roughnessMap).not.toBeNull()
              }
              if (originalMaps[i].hadEmissiveMap) {
                expect(mesh.material.emissiveMap).not.toBeNull()
              }
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  // **Validates: Requirements 6.1, 6.3, 6.4, 5.5**
})
