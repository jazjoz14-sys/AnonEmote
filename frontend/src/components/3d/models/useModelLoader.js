/**
 * Custom hook for loading GLB models with timeout, state machine,
 * quality tier adaptation, and graceful fallback handling.
 *
 * Uses THREE.GLTFLoader directly (not useGLTF) for full control over
 * the loading lifecycle — timeout, error states, and progress tracking.
 *
 * State machine: IDLE → LOADING → LOADED | ERROR | TIMEOUT
 *
 * @module useModelLoader
 */

import { useState, useEffect, useRef } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { getModelPath } from './modelPaths.js'
import { adaptMaterials, getCurrentTier } from './tierConfig.js'

/** @type {GLTFLoader} Shared loader instance — avoids creating one per hook call */
const loader = new GLTFLoader()

/** Triangle budget per category on low quality tier */
const TRI_BUDGET = {
  planet: 5000,
  avatar: 3000,
}

/**
 * Loading states for the state machine.
 * @enum {string}
 */
export const LoadState = {
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  LOADED: 'LOADED',
  ERROR: 'ERROR',
  TIMEOUT: 'TIMEOUT',
}

/**
 * Counts the total number of triangles in a scene graph.
 * Uses geometry.index if available, otherwise falls back to
 * attributes.position.count / 3.
 *
 * @param {import('three').Object3D} scene - Scene to count triangles in
 * @returns {number} Total triangle count
 */
function countTriangles(scene) {
  let total = 0
  scene.traverse((child) => {
    if (!child.isMesh || !child.geometry) return
    const geo = child.geometry
    if (geo.index) {
      total += geo.index.count / 3
    } else if (geo.attributes.position) {
      total += geo.attributes.position.count / 3
    }
  })
  return total
}

/**
 * Enforces triangle budget on low tier by removing meshes that push
 * the total over the limit. Traverses in order, keeping meshes until
 * the budget is exceeded, then removes the rest.
 *
 * @param {import('three').Object3D} scene - Cloned scene to enforce budget on
 * @param {'planet'|'avatar'} category - Determines budget threshold
 */
function enforceTriangleBudget(scene, category) {
  const budget = TRI_BUDGET[category]
  if (!budget) return

  let accumulated = 0
  const meshesToRemove = []

  scene.traverse((child) => {
    if (!child.isMesh || !child.geometry) return
    const geo = child.geometry
    let tris = 0
    if (geo.index) {
      tris = geo.index.count / 3
    } else if (geo.attributes.position) {
      tris = geo.attributes.position.count / 3
    }

    if (accumulated + tris > budget) {
      meshesToRemove.push(child)
    } else {
      accumulated += tris
    }
  })

  // Remove meshes that exceed the budget
  for (const mesh of meshesToRemove) {
    if (mesh.parent) {
      mesh.parent.remove(mesh)
    }
    // Dispose geometry and material to free GPU memory
    if (mesh.geometry) mesh.geometry.dispose()
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose())
      } else {
        mesh.material.dispose()
      }
    }
  }
}

/**
 * Loads a GLB model with timeout and fallback handling.
 *
 * Uses THREE.GLTFLoader directly for full control over the loading lifecycle.
 * Implements a state machine: IDLE → LOADING → LOADED | ERROR | TIMEOUT
 *
 * On success:
 * - Clones the scene to avoid shared instance mutations
 * - Applies quality tier material adaptation via adaptMaterials()
 * - Enforces triangle budget on low tier
 *
 * On failure/timeout:
 * - Logs warning with category, modelId, error message, and elapsed time
 * - Returns scene: null so the caller can render the procedural fallback
 *
 * @param {string} modelId - Planet ID or avatar shape ID
 * @param {'planet'|'avatar'} category - Determines path prefix and tri budget
 * @param {object} [options]
 * @param {number} [options.timeout=10000] - Load timeout in ms
 * @param {string} [options.fallbackColor] - Color for low-tier flat material
 * @returns {{ scene: import('three').Group|null, loaded: boolean, error: Error|null, progress: number }}
 */
export function useModelLoader(modelId, category, options = {}) {
  const { timeout = 10000, fallbackColor = '#cccccc' } = options

  const [state, setState] = useState(LoadState.IDLE)
  const [scene, setScene] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)

  // Refs to track cleanup and timing
  const timeoutRef = useRef(null)
  const startTimeRef = useRef(null)
  const cancelledRef = useRef(false)
  const fallbackColorRef = useRef(fallbackColor)
  fallbackColorRef.current = fallbackColor

  useEffect(() => {
    // Reset state on input change
    setState(LoadState.LOADING)
    setScene(null)
    setError(null)
    setProgress(0)
    cancelledRef.current = false

    const path = getModelPath(modelId, category)
    startTimeRef.current = performance.now()

    // Start timeout timer
    timeoutRef.current = setTimeout(() => {
      if (cancelledRef.current) return

      const elapsed = Math.round(performance.now() - startTimeRef.current)
      const timeoutError = new Error(`Load timeout after ${elapsed}ms`)
      timeoutError.code = 'TIMEOUT'

      console.warn(
        `[ModelLoader] Failed to load ${category}/${modelId}.glb: ${timeoutError.message} (${elapsed}ms)`
      )

      setState(LoadState.TIMEOUT)
      setError(timeoutError)
      setScene(null)
    }, timeout)

    // Load the model
    loader.load(
      path,
      // onLoad success
      (gltf) => {
        if (cancelledRef.current) return

        // Clear timeout — load succeeded
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }

        // Clone the scene to avoid shared instance mutations
        const clonedScene = gltf.scene.clone(true)

        // Apply quality tier material adaptation
        const currentTier = getCurrentTier()
        adaptMaterials(clonedScene, currentTier, fallbackColorRef.current)

        // On low tier, enforce triangle budget
        if (currentTier === 'low') {
          enforceTriangleBudget(clonedScene, category)
        }

        setState(LoadState.LOADED)
        setScene(clonedScene)
        setProgress(1)
      },
      // onProgress
      (event) => {
        if (cancelledRef.current) return
        if (event.lengthComputable) {
          setProgress(event.loaded / event.total)
        }
      },
      // onError — deterministic failure (404, parse error)
      (err) => {
        if (cancelledRef.current) return

        // Clear timeout — no need to wait for it on deterministic errors
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }

        const elapsed = Math.round(performance.now() - startTimeRef.current)
        const loadError = err instanceof Error ? err : new Error(String(err))
        loadError.code = 'LOAD_ERROR'

        console.warn(
          `[ModelLoader] Failed to load ${category}/${modelId}.glb: ${loadError.message} (${elapsed}ms)`
        )

        setState(LoadState.ERROR)
        setError(loadError)
        setScene(null)
      }
    )

    // Cleanup on unmount or input change
    return () => {
      cancelledRef.current = true
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [modelId, category, timeout])

  return {
    scene,
    loaded: state === LoadState.LOADED,
    error,
    progress,
  }
}
