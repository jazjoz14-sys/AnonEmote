import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sceneConfig } from '../../lib/device'

/**
 * CentralStar — the emotional "sun" of the AnonEmote system.
 *
 * This is the scene's primary light source and its only shadow caster. Because
 * it sits at the origin and the planets orbit around it, each planet is lit on
 * the side facing the star and falls into shadow on the far side, with the
 * terminator sweeping across as it orbits.
 */
export default function CentralStar() {
  const meshRef = useRef()
  const glowRef = useRef()
  const coronaRef = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime

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
  })

  return (
    <group position={[0, 0, 0]}>
      {/* ── Light source ──────────────────────────────────────────────────
          A shadow-casting point light. Point lights render six shadow faces,
          so the map is kept modest to stay cheap. normalBias prevents the
          lumpy clay surfaces from self-shadowing into stripes (shadow acne). */}
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

      {/* Core — larger so it reads as a proper star relative to the planets */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[5.5, 4]} />
        <meshStandardMaterial
          color="#fff8e7"
          emissive="#fde68a"
          emissiveIntensity={2.2}
          roughness={0.4}
          metalness={0}
          toneMapped={false}
        />
      </mesh>

      {/* Inner glow shell */}
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

      {/* Wide outer corona */}
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
    </group>
  )
}
