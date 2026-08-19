/**
 * Renders an avatar GLB model with emissive aura color applied to all meshes.
 *
 * The scene is expected to already be cloned and tier-adapted by useModelLoader.
 * This component handles:
 * 1. Uniform scaling so the bounding sphere diameter ≤ 2.5 world units (before user scale)
 * 2. Applying the user-selected auraColor as emissive on every mesh material
 * 3. Wrapping the scene in a scaled group for rendering via <primitive>
 *
 * @module AvatarGLB
 */

import { useMemo, useEffect } from 'react'
import * as THREE from 'three'

/**
 * Renders an avatar GLB model with emissive aura color applied to all meshes.
 *
 * @param {object} props
 * @param {THREE.Group} props.scene - Cloned GLB scene from useModelLoader
 * @param {string} props.auraColor - Hex color for emissive (e.g., '#C4B5FD')
 * @param {number} [props.scale=1] - User scale multiplier (default 1)
 */
export default function AvatarGLB({ scene, auraColor, scale = 1 }) {
  // Compute base scale so bounding sphere radius = 1.25 world units (diameter 2.5)
  // Scales both up and down to normalize all models to the same visual size
  const baseScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const sphere = new THREE.Sphere()
    box.getBoundingSphere(sphere)

    // Avoid division by zero for degenerate geometry
    if (sphere.radius === 0) return 1

    // Normalize to target radius of 1.25 (diameter 2.5)
    return 1.25 / sphere.radius
  }, [scene])

  // Final scale combines the base normalization with user's scale multiplier
  const finalScale = baseScale * scale

  // Apply aura emissive color to all meshes — re-apply when auraColor changes
  useEffect(() => {
    const color = new THREE.Color(auraColor)

    scene.traverse((child) => {
      if (!child.isMesh || !child.material) return

      child.material.emissive = color
      child.material.emissiveIntensity = 1.0
      child.material.roughness = 0.4
      child.material.toneMapped = false
      child.material.needsUpdate = true
    })
  }, [scene, auraColor])

  return (
    <group scale={[finalScale, finalScale, finalScale]}>
      <primitive object={scene} />
    </group>
  )
}
