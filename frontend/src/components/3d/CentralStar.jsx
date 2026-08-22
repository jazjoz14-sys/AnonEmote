import React, { useRef, useMemo, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { sceneConfig } from '../../lib/device'
import useAppStore from '../../store/useAppStore'

/**
 * CentralStar — the emotional "sun" of the AnonEmote system.
 *
 * Beyond being the scene's primary light source, it now serves as a living
 * indicator of the community's emotional state:
 *
 *   1. Active User Count — floating text showing online peers
 *   2. Aggregate Emotion Pulse — star color shifts based on dominant emotion
 *   3. Click to deselect planet (return to overview)
 *   4. "You Are Here" Beacon — user's avatar color reflected in the star
 *   5. Daily Affirmation — inspirational message on hover
 */

// ── Affirmation pool ─────────────────────────────────────────────────────────
const AFFIRMATIONS = [
  'You are not alone.',
  'Your feelings matter.',
  'It is okay to not be okay.',
  'You belong here.',
  'One step at a time.',
  'Breathe. You are safe.',
  'Your voice has power.',
  'This too shall pass.',
  'You are enough.',
  'Be gentle with yourself.',
  'Progress, not perfection.',
  'You deserve kindness.',
]

/** Pick today's affirmation (changes once per calendar day). */
function getDailyAffirmation() {
  const dayIndex = Math.floor(Date.now() / 86400000) % AFFIRMATIONS.length
  return AFFIRMATIONS[dayIndex]
}

// ── Emotion-to-color mapping ────────────────────────────────────────────────
const EMOTION_COLORS = {
  joy: new THREE.Color('#fde68a'),
  vent: new THREE.Color('#93c5fd'),
  advice: new THREE.Color('#6ee7b7'),
  grief: new THREE.Color('#a5b4fc'),
  anxiety: new THREE.Color('#f9a8d4'),
  neutral: new THREE.Color('#cbd5e1'),
  doodle: new THREE.Color('#f5f5f5'),
}
const DEFAULT_STAR_COLOR = new THREE.Color('#fff8e7')
const DEFAULT_EMISSIVE = new THREE.Color('#fde68a')

// Scratch objects (allocated once, reused every frame)
const _lerpColor = new THREE.Color()

/**
 * Compute the dominant emotion from recent posts.
 * Returns the planet_id with the most posts, or null if empty.
 */
function computeDominantEmotion(posts) {
  if (!posts || posts.length === 0) return null

  // Only consider posts from last 30 minutes for recency
  const cutoff = Date.now() - 30 * 60 * 1000
  const recent = posts.filter(p => new Date(p.created_at).getTime() > cutoff)
  if (recent.length === 0) return null

  const counts = {}
  for (const post of recent) {
    counts[post.planet_id] = (counts[post.planet_id] || 0) + 1
  }

  let max = 0
  let dominant = null
  for (const [id, count] of Object.entries(counts)) {
    if (count > max) { max = count; dominant = id }
  }
  return dominant
}

export default function CentralStar({ peerCount = 0 }) {
  const meshRef = useRef()
  const glowRef = useRef()
  const coronaRef = useRef()
  const coreMatRef = useRef()

  const [hovered, setHovered] = useState(false)
  const affirmation = useMemo(() => getDailyAffirmation(), [])

  // ── Aggregate emotion pulse ────────────────────────────────────────────────
  const dominantRef = useRef(null)
  const targetColorRef = useRef(DEFAULT_STAR_COLOR.clone())
  const targetEmissiveRef = useRef(DEFAULT_EMISSIVE.clone())

  // ── User's avatar color reflected in star ──────────────────────────────────
  const avatar = useAppStore((s) => s.avatar)
  const userAuraColor = useMemo(() => {
    if (avatar?.auraColor) return new THREE.Color(avatar.auraColor)
    return null
  }, [avatar?.auraColor])

  // ── Click handler — deselect planet, return to overview ────────────────────
  const handleClick = useCallback((e) => {
    e.stopPropagation()
    const store = useAppStore.getState()
    store.setSelectedPlanet(null)
  }, [])

  // ── Animation loop ─────────────────────────────────────────────────────────
  useFrame((state) => {
    const t = state.clock.elapsedTime

    // Core rotation and breathing
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.1
      meshRef.current.rotation.x = t * 0.05
      meshRef.current.scale.setScalar(1 + Math.sin(t * 1.2) * 0.03)
    }

    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 0.8) * 0.06)
      glowRef.current.material.opacity = 0.14 + Math.sin(t * 0.6) * 0.03
    }

    if (coronaRef.current) {
      coronaRef.current.rotation.z = t * 0.04
      coronaRef.current.material.opacity = 0.05 + Math.sin(t * 0.9) * 0.015
    }

    // ── Aggregate emotion color shift ────────────────────────────────────────
    const posts = useAppStore.getState().posts
    const dominant = computeDominantEmotion(posts)

    if (dominant !== dominantRef.current) {
      dominantRef.current = dominant
      if (dominant && EMOTION_COLORS[dominant]) {
        // Blend 30% toward the emotion color, keeping the star warm
        targetColorRef.current.copy(DEFAULT_STAR_COLOR).lerp(EMOTION_COLORS[dominant], 0.3)
        targetEmissiveRef.current.copy(DEFAULT_EMISSIVE).lerp(EMOTION_COLORS[dominant], 0.4)
      } else {
        targetColorRef.current.copy(DEFAULT_STAR_COLOR)
        targetEmissiveRef.current.copy(DEFAULT_EMISSIVE)
      }
    }

    // Smoothly transition the core material color
    if (coreMatRef.current) {
      coreMatRef.current.color.lerp(targetColorRef.current, 0.02)
      coreMatRef.current.emissive.lerp(targetEmissiveRef.current, 0.02)

      // "You are here" beacon — mix 10% of user's aura color into emissive
      if (userAuraColor) {
        _lerpColor.copy(coreMatRef.current.emissive)
        _lerpColor.lerp(userAuraColor, 0.08 + Math.sin(t * 2) * 0.03)
        coreMatRef.current.emissive.copy(_lerpColor)
      }

      // Hover glow boost
      const targetIntensity = hovered ? 3.0 : 2.2
      coreMatRef.current.emissiveIntensity += (targetIntensity - coreMatRef.current.emissiveIntensity) * 0.05
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* ── Light source ─────────────────────────────────────────────────── */}
      <pointLight
        color="#fff4dd"
        intensity={14}
        distance={260}
        decay={1.0}
        castShadow={sceneConfig.shadowMapSize > 0}
        shadow-mapSize-width={sceneConfig.shadowMapSize || 512}
        shadow-mapSize-height={sceneConfig.shadowMapSize || 512}
        shadow-camera-near={0.8}
        shadow-camera-far={140}
        shadow-bias={-0.0008}
        shadow-normalBias={0.04}
        shadow-radius={4}
      />

      {/* ── Interactive core ──────────────────────────────────────────────── */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <icosahedronGeometry args={[5.5, 4]} />
        <meshStandardMaterial
          ref={coreMatRef}
          color="#fff8e7"
          emissive="#fde68a"
          emissiveIntensity={2.2}
          roughness={0.4}
          metalness={0}
          toneMapped={false}
        />
      </mesh>

      {/* ── Inner glow shell ─────────────────────────────────────────────── */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[7.2, 24, 24]} />
        <meshBasicMaterial
          color="#fde68a"
          transparent
          opacity={0.14}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ── Wide outer corona ────────────────────────────────────────────── */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[10, 20, 20]} />
        <meshBasicMaterial
          color="#f59e0b"
          transparent
          opacity={0.04}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ── Feature 1: Active user count ─────────────────────────────────── */}
      {peerCount > 0 && (
        <Billboard position={[0, 8.5, 0]} follow lockX={false} lockY={false}>
          <Text
            fontSize={0.8}
            color="#e2e8f0"
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.85}
            font={undefined}
          >
            {`${peerCount + 1} online`}
          </Text>
        </Billboard>
      )}

      {/* ── Feature 5: Daily affirmation (shown on hover) ────────────────── */}
      {hovered && (
        <Billboard position={[0, -8, 0]} follow lockX={false} lockY={false}>
          <Text
            fontSize={0.55}
            color="#fde68a"
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.9}
            maxWidth={12}
            textAlign="center"
            font={undefined}
          >
            {affirmation}
          </Text>
        </Billboard>
      )}
    </group>
  )
}
