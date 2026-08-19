/**
 * Quality tier material configuration for GLB model adaptation.
 *
 * Determines which material features (textures, normal maps, etc.) are
 * enabled or stripped based on the device's computed quality tier.
 * This allows low-end devices to skip expensive GPU operations while
 * high-end devices get the full visual fidelity from the GLB models.
 *
 * @module tierConfig
 */

import * as THREE from 'three'
import { qualityTier } from '../../../lib/device.js'

/**
 * Material override rules per quality tier.
 *
 * - low: Strip all texture maps, apply flat color — saves memory and GPU bandwidth
 * - medium: Keep diffuse/roughness/emissive textures but disable normal maps
 * - high: Preserve all material maps as embedded in the GLB
 *
 * @type {{ low: object, medium: object, high: object }}
 */
export const TIER_MATERIAL_CONFIG = {
  low: {
    useTextures: false,
    useNormalMaps: false,
    useRoughnessMaps: false,
    useEmissiveMaps: false,
    maxTextureSize: 512,
    flatColorFallback: true,
  },
  medium: {
    useTextures: true,
    useNormalMaps: false,
    useRoughnessMaps: true,
    useEmissiveMaps: true,
    maxTextureSize: 1024,
  },
  high: {
    useTextures: true,
    useNormalMaps: true,
    useRoughnessMaps: true,
    useEmissiveMaps: true,
    maxTextureSize: 1024,
  },
}

/**
 * Traverses all meshes in a scene and applies tier-appropriate material overrides.
 *
 * Behavior per tier:
 * - LOW: Replaces material with a flat MeshStandardMaterial using `fallbackColor`.
 *   All texture maps (map, normalMap, roughnessMap, emissiveMap) are removed.
 * - MEDIUM: Removes normalMap but preserves map, roughnessMap, and emissiveMap.
 * - HIGH: Preserves all material maps as-is — no modifications.
 *
 * @param {THREE.Object3D} scene - The loaded GLB scene (or cloned group) to adapt
 * @param {string} tier - Quality tier: 'low', 'medium', or 'high'
 * @param {string|number} fallbackColor - Hex color (e.g. '#ff6600' or 0xff6600) used as flat material on low tier
 */
export function adaptMaterials(scene, tier, fallbackColor) {
  const config = TIER_MATERIAL_CONFIG[tier]
  if (!config) return

  scene.traverse((child) => {
    if (!child.isMesh || !child.material) return

    if (tier === 'low') {
      // Replace with a flat-color MeshStandardMaterial — strips all textures
      child.material = new THREE.MeshStandardMaterial({
        color: fallbackColor,
      })
      child.material.needsUpdate = true
      return
    }

    if (tier === 'medium') {
      // Keep diffuse map, roughness map, emissive map — strip normal map only
      if (child.material.normalMap) {
        child.material.normalMap = null
      }
      child.material.needsUpdate = true
      return
    }

    // High tier: preserve all maps, no modifications needed
  })
}

/**
 * The current device's quality tier, re-exported for convenience.
 * @type {'low' | 'medium' | 'high'}
 */
export { qualityTier }
