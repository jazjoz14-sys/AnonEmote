import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { CLAY, makeClayBlob } from './clay'
import PlanetDecor from './PlanetDecor'

/**
 * CarouselPlanetScene — Renders a single planet + PlanetDecor for one carousel slide.
 *
 * Runs inside a <View> child context. Pauses rotation when `active` is false
 * to avoid rendering offscreen animations.
 *
 * @param {{ planet: object, active: boolean }} props
 * @param {object} props.planet - Planet data from the PLANETS array (id, color, emissive, size, spinSpeed, etc.)
 * @param {boolean} props.active - When false, Y-axis rotation pauses and useFrame becomes a no-op
 */
export default function CarouselPlanetScene({ planet, active }) {
  const meshRef = useRef()

  // Generate clay blob geometry matching EmotionPlanet's formula.
  // detail=3 (medium tier) for consistent landing page fidelity.
  // Wrapped in try/catch so a geometry failure doesn't crash the scene.
  const { geometry, useFallback } = useMemo(() => {
    try {
      const seed = planet.id.charCodeAt(0) + planet.id.length * 13
      const geo = makeClayBlob(planet.size, 3, 0.055, seed)
      return { geometry: geo, useFallback: false }
    } catch (err) {
      // If clay blob creation fails, signal fallback to basic sphere
      console.warn(`[CarouselPlanetScene] Clay blob creation failed for "${planet.id}", using fallback sphere:`, err)
      return { geometry: null, useFallback: true }
    }
  }, [planet.id, planet.size])

  // Dispose geometry on unmount to prevent GPU memory leaks.
  // R3F handles inline JSX materials automatically, but geometry from useMemo
  // must be manually disposed since it's created outside the declarative tree.
  useEffect(() => {
    return () => {
      if (geometry) {
        geometry.dispose()
      }
    }
  }, [geometry])

  // Rotate around Y-axis at planet's spinSpeed when active; no-op when inactive
  useFrame((_, delta) => {
    if (!active || !meshRef.current) return
    meshRef.current.rotation.y += planet.spinSpeed * delta
  })

  return (
    // Tilt 15° toward the viewer, scale down to 0.65 so planets fit nicely in viewport
    <group rotation-x={Math.PI / 12} scale={0.5}>
      {/* Lighting matched to SpaceScreen — low ambient + hemisphere, no directional.
          Planets glow via emissive, decor gets gentle fill from hemisphere. */}
      <ambientLight intensity={0.14} />
      <hemisphereLight args={['#c7d2fe', '#1e1b4b', 0.25]} />

      {/* Planet body — clay blob or basic sphere fallback */}
      <mesh ref={meshRef} geometry={useFallback ? undefined : geometry}>
        {useFallback && <sphereGeometry args={[planet.size, 32, 32]} />}
        <meshStandardMaterial
          color={planet.color}
          emissive={planet.color}
          emissiveIntensity={0.22}
          roughness={CLAY.roughness}
          metalness={CLAY.metalness}
        />
      </mesh>

      {/* Per-emotion decorations (sun rays, storm clouds, sprouts, etc.) */}
      <PlanetDecor planet={planet} />
    </group>
  )
}
