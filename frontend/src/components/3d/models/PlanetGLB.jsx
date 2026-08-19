/**
 * Renders a planet's GLB model within the EmotionPlanet group hierarchy.
 * Handles scaling to match planet.size, shadow casting/receiving on meshes,
 * and passes through click/hover/pointer events.
 *
 * The scene is expected to already be cloned and tier-adapted by useModelLoader,
 * so this component focuses on sizing and interaction forwarding only.
 *
 * @module PlanetGLB
 */

import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Renders a planet's GLB model within the EmotionPlanet group hierarchy.
 * Handles scaling to match planet.size, material adaptation per quality tier,
 * and passes through click/hover/pointer events.
 *
 * @param {object} props
 * @param {object} props.planet - Planet config from planets.js (has .size, .color, etc.)
 * @param {THREE.Group} props.scene - Cloned GLB scene from useModelLoader
 * @param {function} props.onClick - Click handler
 * @param {function} props.onPointerOver - Hover enter handler
 * @param {function} props.onPointerOut - Hover leave handler
 */
export default function PlanetGLB({ planet, scene, onClick, onPointerOver, onPointerOut }) {
  // Compute uniform scale so the model's bounding sphere radius matches planet.size
  const uniformScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const sphere = new THREE.Sphere()
    box.getBoundingSphere(sphere)
    // Avoid division by zero if bounding sphere has zero radius
    if (sphere.radius === 0) return 1
    return planet.size / sphere.radius
  }, [scene, planet.size])

  // Apply castShadow and receiveShadow to all meshes in the scene
  useMemo(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])

  return (
    <group
      scale={[uniformScale, uniformScale, uniformScale]}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <primitive object={scene} />
    </group>
  )
}
