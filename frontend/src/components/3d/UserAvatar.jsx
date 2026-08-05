import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import useAppStore from '../../store/useAppStore'

/**
 * UserAvatar — the user's abstract energy form.
 *
 * Renders inside the <Canvas> and reads its configuration from the Zustand
 * store, so the customizer overlay and the in-system avatar always agree.
 *
 * @param {boolean} preview  true in the customizer (centred, no orbit)
 *                           false in the star system (drifts near the star)
 */
export default function UserAvatar({ preview = false }) {
  const groupRef = useRef()
  const meshRef = useRef()
  const avatar = useAppStore((s) => s.avatar)

  const { shape, auraColor, particles, scale = 1 } = avatar

  // Base size differs between the close-up customizer and the wide star system
  const size = preview ? 1 : 0.55
  const s = size * scale

  // Orbit state. The centre is lerped rather than snapped so that selecting a
  // planet makes the avatar travel across to it instead of teleporting.
  const orbitAngle = useRef(0)
  const orbitCentre = useRef(new THREE.Vector3(0, 0, 0))
  const orbitRadius = useRef(6)
  const targetCentre = useRef(new THREE.Vector3(0, 0, 0))

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime

    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.4
      // Spirit forms tumble a little more freely than solid shapes
      meshRef.current.rotation.x = shape === 'spirit' ? Math.sin(t * 0.5) * 0.3 : t * 0.15
    }

    if (!groupRef.current) return

    // ── Customizer: centred and gently bobbing ────────────────────────────
    if (preview) {
      groupRef.current.position.y = Math.sin(t * 0.9) * 0.12
      return
    }

    // ── Star system: orbit the selected planet, else the central star ─────
    const { selectedPlanet, planetPositions } = useAppStore.getState()
    const livePos = selectedPlanet ? planetPositions[selectedPlanet.id] : null

    let targetRadius
    if (livePos) {
      // Follow the planet as it travels along its own orbit
      targetCentre.current.set(livePos.x, livePos.y, livePos.z)
      // Sit clear of the planet surface and its decor props
      targetRadius = selectedPlanet.size * 2.4 + 1.6
    } else {
      targetCentre.current.set(0, 0, 0)
      targetRadius = 6
    }

    // Ease toward the new centre and radius
    orbitCentre.current.lerp(targetCentre.current, 0.045)
    orbitRadius.current += (targetRadius - orbitRadius.current) * 0.045

    // Orbit faster when circling a planet — reads as attentive rather than idle
    orbitAngle.current += delta * (livePos ? 0.55 : 0.18)

    const a = orbitAngle.current
    const r = orbitRadius.current

    groupRef.current.position.set(
      orbitCentre.current.x + Math.cos(a) * r,
      // Slight tilt to the orbit plane plus a gentle bob
      orbitCentre.current.y + Math.sin(a * 2) * r * 0.12 + Math.sin(t * 0.9) * 0.25,
      orbitCentre.current.z + Math.sin(a) * r
    )
  })

  return (
    <group ref={groupRef}>
      {/* ── Form ───────────────────────────────────────────────────────── */}
      <mesh ref={meshRef} scale={[s, s, s]}>
        {shape === 'orb' && <icosahedronGeometry args={[1, 2]} />}
        {shape === 'prism' && <octahedronGeometry args={[1.15, 0]} />}
        {shape === 'spirit' && <capsuleGeometry args={[0.6, 0.9, 8, 16]} />}
        {shape === 'droplet' && <sphereGeometry args={[1, 24, 16]} />}
        {shape === 'crystal' && <dodecahedronGeometry args={[1, 0]} />}
        {shape === 'shard' && <tetrahedronGeometry args={[1.2, 0]} />}
        {shape === 'halo' && <torusGeometry args={[0.8, 0.3, 16, 32]} />}
        {shape === 'knot' && <torusKnotGeometry args={[0.65, 0.22, 80, 12]} />}
        {shape === 'nebula' && <icosahedronGeometry args={[1.1, 1]} />}
        {shape === 'spark' && <coneGeometry args={[0.8, 1.6, 5]} />}

        <meshStandardMaterial
          color={auraColor}
          emissive={auraColor}
          emissiveIntensity={1.5}
          roughness={0.35}
          metalness={0}
          toneMapped={false}
        />
      </mesh>

      {/* ── Soft aura shell ────────────────────────────────────────────── */}
      <mesh scale={[s * 1.9, s * 1.9, s * 1.9]}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial
          color={auraColor}
          transparent
          opacity={0.07}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* ── Particles ──────────────────────────────────────────────────── */}
      {particles === 'stardust' && (
        <Sparkles
          count={preview ? 40 : 24}
          scale={s * 5}
          size={preview ? 3 : 2}
          speed={0.3}
          opacity={0.7}
          color={auraColor}
        />
      )}

      {particles === 'firefly' && (
        <Sparkles
          count={preview ? 20 : 12}
          scale={s * 6}
          size={preview ? 5 : 3.5}
          speed={0.12}
          opacity={0.9}
          color={auraColor}
          noise={2}
        />
      )}

      {particles === 'rings' && <PulsingRings color={auraColor} size={s} />}
    </group>
  )
}

/**
 * PulsingRings — wireframe halos expanding outward then fading, on a loop.
 * Three rings offset in phase so there is always one mid-flight.
 */
function PulsingRings({ color, size }) {
  const refs = [useRef(), useRef(), useRef()]

  useFrame((state) => {
    const t = state.clock.elapsedTime

    refs.forEach((ref, i) => {
      if (!ref.current) return

      // Each ring runs the same 0→1 cycle, offset by a third
      const phase = (t * 0.4 + i / refs.length) % 1

      const spread = size * (1.2 + phase * 2.6)
      ref.current.scale.set(spread, spread, spread)

      // Fade out as the ring expands
      ref.current.material.opacity = (1 - phase) * 0.5

      // Slow tilt so rings do not look like flat decals
      ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.3 + i) * 0.25
      ref.current.rotation.z = t * 0.1 + i
    })
  })

  return (
    <group>
      {refs.map((ref, i) => (
        <mesh key={i} ref={ref} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1, 0.02, 6, 48]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.5}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}
