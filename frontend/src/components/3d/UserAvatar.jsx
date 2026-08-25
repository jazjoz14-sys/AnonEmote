import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import useAppStore from '../../store/useAppStore'
import { useModelLoader } from './models/useModelLoader.js'
import { useAnimationController } from './models/useAnimationController.js'
import AvatarGLB from './models/AvatarGLB.jsx'
import { SHAPES } from '../../data/avatarOptions.js'

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

  // Look up shape animation config for the animation controller
  const shapeConfig = useMemo(() => SHAPES.find((sh) => sh.id === shape), [shape])

  // Load the GLB model for this avatar shape
  const { scene: glbScene, loaded: glbLoaded } = useModelLoader(
    shape, 'avatar', { fallbackColor: auraColor }
  )

  // When a GLB is loaded, useAnimationController handles rotation and bobbing
  useAnimationController(meshRef, glbLoaded ? shapeConfig?.animation : null)

  // Orbit state. The centre is lerped rather than snapped so that selecting a
  // planet makes the avatar travel across to it instead of teleporting.
  const orbitAngle = useRef(0)
  const orbitCentre = useRef(new THREE.Vector3(0, 0, 0))
  const orbitRadius = useRef(6)
  const targetCentre = useRef(new THREE.Vector3(0, 0, 0))

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime

    // Manual rotation/bob only when using fallback geometry (no GLB loaded)
    if (meshRef.current && !glbLoaded) {
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
      {/* GLB model — no fallback geometry, just show nothing while loading */}
      {glbLoaded && glbScene && (
        <group ref={meshRef}>
          <AvatarGLB scene={glbScene} auraColor={auraColor} scale={s} />
        </group>
      )}

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
        <FireflyEffect color={auraColor} size={s} preview={preview} />
      )}

      {particles === 'rings' && <PulsingRings color={auraColor} size={s} />}

      {particles === 'orbit' && <OrbitTrail color={auraColor} size={s} preview={preview} />}

      {particles === 'bubbles' && <BubblesEffect color={auraColor} size={s} preview={preview} />}

      {particles === 'lightning' && <StaticEffect color={auraColor} size={s} preview={preview} />}
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

/**
 * FireflyEffect — large slow-moving orbs that pulse on/off like real fireflies.
 * Visually distinct from stardust: fewer, bigger, slower, with blinking.
 */
function FireflyEffect({ color, size, preview }) {
  const count = preview ? 8 : 5
  const refs = useRef([])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    refs.current.forEach((mesh, i) => {
      if (!mesh) return
      // Each firefly blinks independently using a sine wave
      const blink = Math.sin(t * (0.8 + i * 0.3) + i * 2.1)
      mesh.material.opacity = blink > 0.3 ? 0.9 : 0.05
      // Gentle drift
      mesh.position.y += Math.sin(t * 0.5 + i) * 0.002
    })
  })

  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2
        const radius = size * (2 + Math.random())
        const y = (Math.random() - 0.5) * size * 3
        return (
          <mesh
            key={i}
            ref={(el) => { refs.current[i] = el }}
            position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius]}
          >
            <sphereGeometry args={[size * 0.15, 8, 8]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.9}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * OrbitTrail — small embers circling the avatar in a tilted orbit.
 */
function OrbitTrail({ color, size, preview }) {
  const count = preview ? 6 : 4
  const groupRef = useRef()

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.8
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.3
    }
  })

  return (
    <group ref={groupRef} rotation={[0.4, 0, 0.2]}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2
        const r = size * 2.2
        return (
          <mesh key={i} position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}>
            <sphereGeometry args={[size * 0.08, 6, 6]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.8}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * BubblesEffect — spheres that float upward and fade out, then reset.
 */
function BubblesEffect({ color, size, preview }) {
  const count = preview ? 10 : 6
  const refs = useRef([])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    refs.current.forEach((mesh, i) => {
      if (!mesh) return
      // Each bubble rises on its own cycle
      const phase = (t * 0.3 + i * 0.4) % 2
      mesh.position.y = -size + phase * size * 3
      mesh.material.opacity = phase < 1.5 ? 0.6 : 0.6 * (2 - phase) * 2
      mesh.scale.setScalar(0.5 + phase * 0.3)
    })
  })

  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const x = (Math.random() - 0.5) * size * 3
        const z = (Math.random() - 0.5) * size * 3
        return (
          <mesh
            key={i}
            ref={(el) => { refs.current[i] = el }}
            position={[x, 0, z]}
          >
            <sphereGeometry args={[size * 0.1, 8, 8]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.6}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * StaticEffect — short lines radiating outward that flicker, like crackling energy.
 */
function StaticEffect({ color, size, preview }) {
  const count = preview ? 12 : 8
  const refs = useRef([])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    refs.current.forEach((mesh, i) => {
      if (!mesh) return
      // Random flicker
      const flicker = Math.sin(t * 12 + i * 7.3) > 0.5
      mesh.material.opacity = flicker ? 0.8 : 0.1
      // Jitter position slightly
      mesh.position.x += (Math.random() - 0.5) * 0.01
      mesh.position.z += (Math.random() - 0.5) * 0.01
    })
  })

  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
        const r = size * (1.5 + Math.random() * 1.5)
        const y = (Math.random() - 0.5) * size * 2
        return (
          <mesh
            key={i}
            ref={(el) => { refs.current[i] = el }}
            position={[Math.cos(angle) * r, y, Math.sin(angle) * r]}
            rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
          >
            <boxGeometry args={[size * 0.02, size * 0.4, size * 0.02]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.8}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}
