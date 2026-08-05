import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import useAppStore from '../../store/useAppStore'

/**
 * PeerAvatars — renders other connected users' abstract avatars in the scene.
 *
 * Each peer's position is computed locally from their planetId: we place them
 * in orbit around whatever planet they're focused on (or near the star if
 * they have no planet selected). This avoids broadcasting position data
 * per-frame, which would be expensive over the network.
 *
 * The trade-off: peers don't appear at their exact camera angle, but as
 * anonymous abstract forms that's fine — the point is presence, not precision.
 */
export default function PeerAvatars({ peers }) {
  if (!peers || peers.length === 0) return null

  return (
    <group>
      {peers.map((peer) => (
        <PeerAvatar key={peer.sessionId} peer={peer} />
      ))}
    </group>
  )
}

function PeerAvatar({ peer }) {
  const groupRef = useRef()
  const meshRef = useRef()

  const { avatar, planetId, sessionId } = peer
  const { shape = 'orb', auraColor = '#C4B5FD', particles = 'none', scale = 1 } = avatar

  // Deterministic orbit offset per peer so they don't all stack at the same angle
  const angleOffset = useMemo(() => {
    let hash = 0
    for (let i = 0; i < sessionId.length; i++) {
      hash = ((hash << 5) - hash + sessionId.charCodeAt(i)) | 0
    }
    return (hash % 628) / 100 // 0 to ~6.28 radians
  }, [sessionId])

  const s = 0.4 * (scale || 1)

  useFrame((state) => {
    if (!groupRef.current) return

    const t = state.clock.elapsedTime
    const orbitSpeed = 0.3

    // Get the planet position from the store if available
    let cx = 0, cy = 0, cz = 0
    let orbitRadius = 8

    if (planetId) {
      const pos = useAppStore.getState().planetPositions[planetId]
      if (pos) {
        cx = pos.x
        cy = pos.y
        cz = pos.z
        orbitRadius = 3.5
      }
    }

    const a = t * orbitSpeed + angleOffset
    groupRef.current.position.set(
      cx + Math.cos(a) * orbitRadius,
      cy + Math.sin(t * 0.7 + angleOffset) * 0.5,
      cz + Math.sin(a) * orbitRadius
    )

    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.5
      meshRef.current.rotation.x = shape === 'spirit' ? Math.sin(t * 0.4) * 0.3 : t * 0.15
    }
  })

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} scale={[s, s, s]}>
        {shape === 'orb' && <icosahedronGeometry args={[1, 2]} />}
        {shape === 'prism' && <octahedronGeometry args={[1.15, 0]} />}
        {shape === 'spirit' && <capsuleGeometry args={[0.6, 0.9, 6, 12]} />}

        <meshStandardMaterial
          color={auraColor}
          emissive={auraColor}
          emissiveIntensity={1.0}
          roughness={0.4}
          metalness={0}
          transparent
          opacity={0.75}
          toneMapped={false}
        />
      </mesh>

      {/* Subtle aura so peers are distinguishable from the user's own avatar */}
      <mesh scale={[s * 1.6, s * 1.6, s * 1.6]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color={auraColor}
          transparent
          opacity={0.04}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Stardust for peers that have it */}
      {particles === 'stardust' && (
        <Sparkles
          count={12}
          scale={s * 4}
          size={1.5}
          speed={0.2}
          opacity={0.4}
          color={auraColor}
        />
      )}
    </group>
  )
}
