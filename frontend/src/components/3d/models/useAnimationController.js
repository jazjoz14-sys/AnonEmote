/**
 * Animation controller hook for GLB models.
 *
 * Applies programmatic and/or clip-based animation to a mesh using useFrame.
 * Supports three modes:
 *   - 'programmatic': rotation + bobbing driven by delta time
 *   - 'clip': AnimationMixer playback only
 *   - 'blended': weighted combination of programmatic and clip animation
 *
 * Includes low-tier half-rate optimization for bobbing (skips odd frames),
 * morph target clamping, and graceful fallback when clip names don't match.
 *
 * @module useAnimationController
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { qualityTier } from './tierConfig.js'

/**
 * Applies programmatic and/or clip-based animation to a mesh.
 *
 * @param {React.RefObject<THREE.Object3D>} meshRef - Target mesh ref
 * @param {object} config
 * @param {string} [config.mode='programmatic'] - 'programmatic' | 'clip' | 'blended'
 * @param {number} [config.blendWeight=0.5] - 0.0 (full programmatic) to 1.0 (full clip)
 * @param {number[]} [config.rotationAxis=[0,1,0]] - Unit vector for rotation axis
 * @param {number} [config.rotationSpeed=0.25] - Radians per second
 * @param {number} [config.rotationSpeedX] - Optional X-axis rotation speed (for avatars)
 * @param {number} [config.bobAmplitude=0.25] - Bob height in scene units
 * @param {number} [config.bobFrequency=0.9] - Bob speed multiplier
 * @param {THREE.AnimationClip[]} [config.clips=[]] - Clips from loaded GLB
 * @param {string} [config.activeClip=null] - Clip name to play
 * @param {object} [config.morphTargets={}] - { targetName: influenceValue }
 */
export function useAnimationController(meshRef, config = {}) {
  const {
    mode = 'programmatic',
    blendWeight = 0.5,
    rotationAxis = [0, 1, 0],
    rotationSpeed = 0.25,
    rotationSpeedX,
    bobAmplitude = 0.25,
    bobFrequency = 0.9,
    clips = [],
    activeClip = null,
    morphTargets = {},
  } = config || {}

  // Elapsed time accumulator for frame-rate independent bob
  const elapsedRef = useRef(0)
  // Frame counter for low-tier half-rate bob optimization
  const frameCountRef = useRef(0)

  // Determine effective mode — fall back to programmatic if clip not found
  const effectiveMode = useMemo(() => {
    if (mode === 'programmatic') return 'programmatic'

    // Clip or blended modes require clips to be present
    if (!clips || clips.length === 0) return 'programmatic'

    // If an activeClip is specified, verify it exists in the clips array
    if (activeClip) {
      const clipExists = clips.some((clip) => clip.name === activeClip)
      if (!clipExists) {
        console.warn(
          `[AnimationController] Clip "${activeClip}" not found in available animations. ` +
          `Available clips: [${clips.map((c) => c.name).join(', ')}]. Falling back to programmatic mode.`
        )
        return 'programmatic'
      }
    }

    return mode
  }, [mode, clips, activeClip])

  // Create AnimationMixer only when clips are present and mode is not programmatic
  const mixer = useMemo(() => {
    if (!meshRef?.current) return null
    if (!clips || clips.length === 0) return null
    if (effectiveMode === 'programmatic') return null

    return new THREE.AnimationMixer(meshRef.current)
  }, [meshRef?.current, clips, effectiveMode])

  // Play the active clip when mixer is available
  useEffect(() => {
    if (!mixer || !clips || clips.length === 0) return
    if (effectiveMode === 'programmatic') return

    // Find the clip to play — use activeClip name or default to first clip
    const clipToPlay = activeClip
      ? clips.find((c) => c.name === activeClip)
      : clips[0]

    if (!clipToPlay) return

    const action = mixer.clipAction(clipToPlay)
    action.play()

    return () => {
      action.stop()
    }
  }, [mixer, clips, activeClip, effectiveMode])

  // Main animation loop
  useFrame((_state, delta) => {
    const mesh = meshRef?.current
    if (!mesh) return

    // Accumulate elapsed time for bobbing calculations
    elapsedRef.current += delta
    frameCountRef.current += 1

    const elapsed = elapsedRef.current
    const frameCount = frameCountRef.current
    const isLowTier = qualityTier === 'low'

    // --- Programmatic animation ---
    if (effectiveMode === 'programmatic' || effectiveMode === 'blended') {
      // Weight factor: 1.0 for pure programmatic, (1 - blendWeight) for blended
      const progWeight = effectiveMode === 'blended' ? (1 - blendWeight) : 1

      // Apply Y-axis rotation (frame-rate independent)
      mesh.rotation.y += rotationSpeed * delta * progWeight

      // Apply optional X-axis rotation (for avatars)
      if (rotationSpeedX != null) {
        mesh.rotation.x += rotationSpeedX * delta * progWeight
      }

      // Apply bobbing — on low tier, skip odd frames (half-rate optimization)
      if (bobAmplitude !== 0 && bobFrequency !== 0) {
        const shouldUpdateBob = !isLowTier || (frameCount % 2 === 0)

        if (shouldUpdateBob) {
          const bobValue = Math.sin(elapsed * bobFrequency) * bobAmplitude * progWeight
          mesh.position.y = bobValue
        }
      }
    }

    // --- Clip animation ---
    if (effectiveMode === 'clip' || effectiveMode === 'blended') {
      if (mixer) {
        // In blended mode, the mixer contributes proportional to blendWeight
        // The mixer's update already applies its animations to the mesh
        const mixerDelta = effectiveMode === 'blended' ? delta * blendWeight : delta
        mixer.update(mixerDelta)
      }
    }

    // --- Morph targets ---
    if (morphTargets && Object.keys(morphTargets).length > 0) {
      applyMorphTargets(mesh, morphTargets)
    }
  })

  return { mixer, effectiveMode }
}

/**
 * Applies morph target influences to a mesh, clamping values to [0.0, 1.0].
 *
 * Traverses the mesh and its children to find morphTargetDictionary entries
 * matching the configured target names.
 *
 * @param {THREE.Object3D} mesh - The mesh or group to apply morph targets to
 * @param {object} targets - Map of { targetName: influenceValue }
 */
function applyMorphTargets(mesh, targets) {
  mesh.traverse((child) => {
    if (!child.isMesh) return
    if (!child.morphTargetDictionary || !child.morphTargetInfluences) return

    for (const [targetName, value] of Object.entries(targets)) {
      const index = child.morphTargetDictionary[targetName]
      if (index === undefined) continue

      // Clamp influence to [0.0, 1.0]
      child.morphTargetInfluences[index] = Math.max(0.0, Math.min(1.0, value))
    }
  })
}

export default useAnimationController
