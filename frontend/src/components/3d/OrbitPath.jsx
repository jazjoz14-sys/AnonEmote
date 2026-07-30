import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import useAppStore from '../../store/useAppStore'

/**
 * OrbitPath — a flat ring marking one planet's orbital track.
 *
 * Rendered as a thin annulus lying in the XZ plane, centred on the star.
 * It sits outside the planet's orbiting group so the ring itself stays put
 * while the planet travels along it.
 *
 * The ring brightens when its planet is selected, giving the user a visual
 * link between the panel they are reading and the orbit they are looking at.
 */
export default function OrbitPath({ planet }) {
  const matRef = useRef()
  const selectedPlanet = useAppStore((s) => s.selectedPlanet)
  const isSelected = selectedPlanet?.id === planet.id

  // Ease opacity toward its target so selection changes do not pop
  useFrame(() => {
    if (!matRef.current) return
    const target = isSelected ? 0.42 : 0.12
    matRef.current.opacity += (target - matRef.current.opacity) * 0.08
  })

  // Thickness scales slightly with radius so distant rings stay visible
  const thickness = 0.04 + planet.orbitRadius * 0.004

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-10}
      // Rings are a UI guide, not physical geometry — keep them out of shadows
      castShadow={false}
      receiveShadow={false}
    >
      <ringGeometry
        args={[
          planet.orbitRadius - thickness,
          planet.orbitRadius + thickness,
          160,
        ]}
      />
      <meshBasicMaterial
        ref={matRef}
        color={planet.color}
        transparent
        opacity={0.12}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
