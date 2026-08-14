import React, { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import useAppStore from '../../store/useAppStore'
import PlanetDecor from './PlanetDecor'
import DoodlePlanetSkin from './DoodlePlanetSkin'
import { CLAY, makeClayBlob } from './clay'
import { sceneConfig } from '../../lib/device'

/**
 * EmotionPlanet — A clickable 3D sphere representing one emotional state.
 *
 * Every frame it writes its current world position into the store so that
 * CameraRig can continuously track it as it orbits the central star.
 * Clicking selects the planet — the camera then follows it.
 */
export default function EmotionPlanet({ planet }) {
  const meshRef = useRef()
  const orbitRef = useRef()
  const glowRef = useRef()
  const [hovered, setHovered] = useState(false)

  const {
    setSelectedPlanet, selectedPlanet, posts,
    crisis, reportTarget,
  } = useAppStore()
  const isSelected = selectedPlanet?.id === planet.id

  // Hide 3D HTML overlays behind fully blocking dialogs. The broadcast
  // composer is a floating panel, so snippets stay visible while drafting.
  const modalOpen = crisis.open || !!reportTarget

  // Recent posts floating around this planet (up to 5)
  const planetPosts = useMemo(
    () => posts.filter((p) => p.planet_id === planet.id).slice(0, 5),
    [posts, planet.id]
  )

  // Lumpy clay body, seeded per planet so each keeps a distinct shape
  const clayGeo = useMemo(() => {
    const seed = planet.id.charCodeAt(0) + planet.id.length * 13
    return makeClayBlob(planet.size, sceneConfig.planetDetail, 0.055, seed)
  }, [planet.id, planet.size])

  // Orbit state — random starting angle so planets spread out naturally
  const angleRef = useRef(Math.random() * Math.PI * 2)
  // Reusable Vector3 — avoids a new allocation every frame
  const worldPosRef = useRef(new THREE.Vector3())

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    // Planet always orbits — camera tracks it when selected.
    angleRef.current += planet.orbitSpeed * delta

    if (orbitRef.current) {
      // Move planet along its circular orbit
      orbitRef.current.position.x = Math.cos(angleRef.current) * planet.orbitRadius
      orbitRef.current.position.z = Math.sin(angleRef.current) * planet.orbitRadius

      // Publish live world position so CameraRig can track without re-renders
      worldPosRef.current.set(
        orbitRef.current.position.x,
        orbitRef.current.position.y,
        orbitRef.current.position.z
      )
      useAppStore.getState().setPlanetPosition(planet.id, worldPosRef.current)
    }

    // Self rotation — per-planet rate, faster for inner planets
    if (meshRef.current) {
      meshRef.current.rotation.y = t * (planet.spinSpeed ?? 0.25)
      const targetScale = hovered || isSelected ? 1.15 : 1
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.08
      )
    }

    // Halo pulse — minimal, so it never flattens the day/night terminator
    if (glowRef.current) {
      const base = isSelected ? 0.07 : (hovered ? 0.05 : 0.028)
      glowRef.current.material.opacity = base + Math.sin(t * 1.5) * 0.01
    }
  })

  const handleClick = (e) => {
    e.stopPropagation()
    setSelectedPlanet(planet)
  }

  return (
    <group ref={orbitRef}>
      {/* Soft outer halo — kept faint so the planet still reads as matte clay
          rather than a glowing orb */}
      {/* Kept very faint — a uniform halo brightens both hemispheres equally
          and would soften the day/night boundary */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[planet.size * 1.8, 16, 16]} />
        <meshBasicMaterial
          color={planet.color}
          transparent
          opacity={0.03}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Planet body — doodle is a smooth white sphere, others are lumpy clay */}
      <mesh
        ref={meshRef}
        geometry={planet.id === 'doodle' ? undefined : clayGeo}
        onClick={handleClick}
        onPointerOver={() => {
          if (modalOpen) return
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'default'
        }}
        castShadow
        receiveShadow
        visible={planet.id !== 'doodle'}
      >
        {planet.id === 'doodle' && <sphereGeometry args={[planet.size, 48, 32]} />}
        <meshStandardMaterial
          color={planet.color}
          emissive={planet.color}
          emissiveIntensity={isSelected ? 0.34 : (hovered ? 0.28 : 0.22)}
          roughness={CLAY.roughness}
          metalness={0}
        />
      </mesh>

      {/* Emotion-specific clay props — disabled on low-end devices to
          preserve framerate and avoid context loss */}
      {sceneConfig.decorEnabled && <PlanetDecor planet={planet} />}

      {/* Doodle planet: the skin IS the planet body — drawings on the surface */}
      {planet.id === 'doodle' && (
        <DoodlePlanetSkin
          planetSize={planet.size}
          onClick={handleClick}
          onPointerOver={() => {
            if (modalOpen) return
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = 'default'
          }}
        />
      )}

      {/* Selection ring around chosen planet */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[planet.size * 1.6, 0.06, 8, 64]} />
          <meshBasicMaterial color={planet.color} transparent opacity={0.8} />
        </mesh>
      )}

      {/* Planet label — wrapped in Billboard so it always faces the camera
          regardless of the parent orbit group's rotation */}
      {/* Raised clear of the decor props, which extend well above the surface
          on several planets (Venting's cloud, Advice's signpost) */}
      <Billboard position={[0, planet.size * 1.35 + 1.5, 0]}>
        <Text
          fontSize={0.45}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.03}
          outlineColor="#000"
        >
          {planet.emoji} {planet.label}
        </Text>
      </Billboard>

      {/* Floating post snippets — hidden when a modal is blocking, and
          replaced by surface texture on the doodle planet */}
      {!modalOpen && planet.id !== 'doodle' && planetPosts.map((post, i) => {
        const snippetAngle = (i / 5) * Math.PI * 2
        const r = planet.size + 2.5
        return (
          <Html
            key={post.id}
            position={[Math.cos(snippetAngle) * r, 0.5, Math.sin(snippetAngle) * r]}
            center
            distanceFactor={12}
            // Drei defaults to a near-maximum z-index, which would draw these
            // over the UI overlays. Keep them below the HUD and panels.
            zIndexRange={[10, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              background: 'rgba(10,10,26,0.8)',
              border: `1px solid ${planet.color}44`,
              borderRadius: '8px',
              padding: '4px 8px',
              color: '#e2e8f0',
              fontSize: '9px',
              maxWidth: '100px',
              lineHeight: '1.3',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {post.content?.slice(0, 40)}…
            </div>
          </Html>
        )
      })}

      {/* Hover tooltip — only when not already selected and no modal is open */}
      {hovered && !isSelected && !modalOpen && (
        <Html
          center
          distanceFactor={14}
          position={[0, -(planet.size + 1.2), 0]}
          zIndexRange={[10, 0]}
        >
          <div style={{
            background: 'rgba(10,10,26,0.9)',
            border: `1px solid ${planet.color}66`,
            borderRadius: '8px',
            padding: '6px 12px',
            color: '#e2e8f0',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(12px)',
            pointerEvents: 'none',
          }}>
            Click to explore <strong style={{ color: planet.color }}>{planet.label}</strong>
          </div>
        </Html>
      )}
    </group>
  )
}
