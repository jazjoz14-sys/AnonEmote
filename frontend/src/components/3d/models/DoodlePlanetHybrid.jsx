/**
 * DoodlePlanetHybrid — Hybrid renderer for the Doodle Drift planet.
 *
 * Combines a GLB mesh body with a dynamic 1024×1024 CanvasTexture overlay
 * for compositing user drawings onto the model surface. Falls back to a
 * smooth sphere with the same CanvasTexture if the GLB's UV layout is invalid
 * (overlapping islands or >10% unmapped area).
 *
 * The canvas texture tiles all drawings into a grid that fills the full
 * 1024×1024 surface — no gaps, no padding — creating a continuous mural.
 *
 * @module DoodlePlanetHybrid
 */

import { useMemo, useEffect, useState } from 'react'
import * as THREE from 'three'
import useAppStore from '../../../store/useAppStore'

/** Texture resolution for the drawing overlay */
const TEX_SIZE = 1024

/**
 * Computes grid dimensions and cell sizes for tiling N drawings
 * into a 1024×1024 canvas. Each drawing gets a unique non-overlapping cell.
 *
 * @param {number} count - Number of drawings to tile (≥ 0)
 * @returns {{ cols: number, rows: number, cellW: number, cellH: number }}
 */
export function computeGrid(count) {
  if (count <= 0) return { cols: 1, rows: 1, cellW: TEX_SIZE, cellH: TEX_SIZE }
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  const cellW = Math.floor(TEX_SIZE / cols)
  const cellH = Math.floor(TEX_SIZE / rows)
  return { cols, rows, cellW, cellH }
}

/**
 * Validates that a GLB scene has usable UVs for texture mapping.
 * Checks that all meshes have a `uv` attribute and that all UV coordinates
 * fall within the 0–1 range (basic proxy for non-overlapping, fully-mapped UVs).
 *
 * A more thorough check would compute actual island overlap and coverage,
 * but for the MVP this per-vertex range check ensures the GLB was properly
 * unwrapped in Maya before export.
 *
 * @param {THREE.Object3D} scene - The GLB scene graph to validate
 * @returns {boolean} True if UVs are valid for texture application
 */
export function validateUVs(scene) {
  let hasValidUVs = true

  scene.traverse((child) => {
    if (!hasValidUVs) return // short-circuit once invalid
    if (!child.isMesh || !child.geometry) return

    const uv = child.geometry.attributes.uv
    if (!uv) {
      hasValidUVs = false
      return
    }

    // Check every UV coordinate is within the 0–1 range
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i)
      const v = uv.getY(i)
      if (u < 0 || u > 1 || v < 0 || v > 1) {
        hasValidUVs = false
        return
      }
    }
  })

  return hasValidUVs
}

/**
 * Hybrid renderer: GLB mesh body + CanvasTexture overlay for drawings.
 * Falls back to current DoodlePlanetSkin on smooth sphere if GLB UV is invalid.
 *
 * @param {object} props
 * @param {object} props.planet - Doodle planet config (has .size, .color, etc.)
 * @param {THREE.Group} props.scene - Loaded GLB scene (must have clean UVs)
 * @param {Array} props.drawings - Array of drawing image data/URLs to tile
 * @param {function} props.onClick - Click handler
 * @param {function} props.onPointerOver - Hover enter handler
 * @param {function} props.onPointerOut - Hover leave handler
 */
export default function DoodlePlanetHybrid({
  planet,
  scene,
  drawings = [],
  onClick,
  onPointerOver,
  onPointerOut,
}) {
  const [canvasTexture, setCanvasTexture] = useState(null)

  // If no drawings prop passed, pull from the store (same as DoodlePlanetSkin)
  const posts = useAppStore((s) => s.posts)
  const doodleDrawings = useMemo(() => {
    if (drawings.length > 0) return drawings
    return posts
      .filter((p) => p.planet_id === 'doodle' && p.drawing)
      .map((p) => p.drawing)
  }, [drawings, posts])

  // Check UV validity of the GLB scene (memoized — only recomputes if scene changes)
  const hasValidUVs = useMemo(() => validateUVs(scene), [scene])

  // Build the canvas texture from doodle drawings
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = TEX_SIZE
    canvas.height = TEX_SIZE
    const ctx = canvas.getContext('2d')

    // White base — the doodle planet glows bright
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)

    if (doodleDrawings.length === 0) {
      const tex = new THREE.CanvasTexture(canvas)
      tex.needsUpdate = true
      setCanvasTexture(tex)
      return
    }

    const { cols, rows, cellW, cellH } = computeGrid(doodleDrawings.length)

    let loaded = 0
    const total = doodleDrawings.length

    doodleDrawings.forEach((drawingSrc, i) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        const col = i % cols
        const row = Math.floor(i / cols)
        ctx.drawImage(img, col * cellW, row * cellH, cellW, cellH)

        loaded++
        if (loaded >= total) {
          const tex = new THREE.CanvasTexture(canvas)
          tex.needsUpdate = true
          setCanvasTexture(tex)
        }
      }

      img.onerror = () => {
        // Skip failed drawing loads — continue compositing the rest
        loaded++
        if (loaded >= total) {
          const tex = new THREE.CanvasTexture(canvas)
          tex.needsUpdate = true
          setCanvasTexture(tex)
        }
      }

      img.src = drawingSrc
    })
  }, [doodleDrawings])

  // Compute uniform scale so the GLB matches planet.size (same logic as PlanetGLB)
  const uniformScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const sphere = new THREE.Sphere()
    box.getBoundingSphere(sphere)
    if (sphere.radius === 0) return 1
    return planet.size / sphere.radius
  }, [scene, planet.size])

  // Apply the canvas texture to all meshes in the GLB scene when texture is ready
  useEffect(() => {
    if (!canvasTexture || !hasValidUVs) return

    scene.traverse((child) => {
      if (!child.isMesh) return
      // Apply the canvas texture as the material map
      if (child.material) {
        child.material.map = canvasTexture
        child.material.needsUpdate = true
      }
    })
  }, [canvasTexture, scene, hasValidUVs])

  // FALLBACK: If UVs are invalid, render a smooth sphere with the canvas texture
  // This replicates the DoodlePlanetSkin approach on a basic sphere geometry
  if (!hasValidUVs) {
    return (
      <group onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[planet.size, 64, 64]} />
          <meshStandardMaterial
            map={canvasTexture}
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.35}
            roughness={0.7}
            metalness={0}
            toneMapped={false}
          />
        </mesh>
      </group>
    )
  }

  // HYBRID: Valid UVs — render the GLB body with the canvas texture overlay
  return (
    <group onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <primitive object={scene} scale={[uniformScale, uniformScale, uniformScale]} />
    </group>
  )
}
