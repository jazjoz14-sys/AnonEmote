import React, { useMemo, useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useAppStore from '../../store/useAppStore'

/**
 * DoodlePlanetSkin — maps user drawings directly onto the planet surface.
 *
 * Drawings are composited onto a CanvasTexture and applied as the material map
 * of a sphere that sits just outside the planet body. The planet visually
 * becomes a community mural that grows with every submission.
 */

const TEX_SIZE = 1024

export default function DoodlePlanetSkin({ planetSize, onClick, onPointerOver, onPointerOut }) {
  const meshRef = useRef()
  const [texture, setTexture] = useState(null)
  const posts = useAppStore((s) => s.posts)

  const doodlePosts = useMemo(
    () => posts.filter((p) => p.planet_id === 'doodle' && p.drawing),
    [posts]
  )

  // Create and update the composited texture
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = TEX_SIZE
    canvas.height = TEX_SIZE
    const ctx = canvas.getContext('2d')

    // Pure white base — the planet glows bright white
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)

    if (doodlePosts.length === 0) {
      const tex = new THREE.CanvasTexture(canvas)
      tex.needsUpdate = true
      setTexture(tex)
      return
    }

    // Tile drawings seamlessly across the full texture with no gaps.
    // Each drawing fills its cell completely — no padding — so the mural
    // reads as one continuous surface rather than a grid of thumbnails.
    const count = doodlePosts.length
    const cols = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / cols)
    const cellW = TEX_SIZE / cols
    const cellH = TEX_SIZE / rows

    let loaded = 0

    doodlePosts.forEach((post, i) => {
      const img = new Image()
      img.onload = () => {
        const col = i % cols
        const row = Math.floor(i / cols)
        // No padding — tiles butt up edge to edge for a seamless look
        ctx.drawImage(img, col * cellW, row * cellH, cellW, cellH)

        loaded++
        if (loaded >= count) {
          const tex = new THREE.CanvasTexture(canvas)
          tex.needsUpdate = true
          setTexture(tex)
        }
      }
      img.onerror = () => {
        loaded++
        if (loaded >= count) {
          const tex = new THREE.CanvasTexture(canvas)
          tex.needsUpdate = true
          setTexture(tex)
        }
      }
      img.src = post.drawing
    })
  }, [doodlePosts])

  // Slow rotation so all sides of the mural are visible over time
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.08
    }
  })

  if (!texture) return null

  return (
    <mesh
      ref={meshRef}
      renderOrder={2}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      castShadow
      receiveShadow
    >
      <sphereGeometry args={[planetSize, 64, 48]} />
      <meshStandardMaterial
        map={texture}
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={0.35}
        roughness={0.7}
        metalness={0}
        toneMapped={false}
      />
    </mesh>
  )
}
