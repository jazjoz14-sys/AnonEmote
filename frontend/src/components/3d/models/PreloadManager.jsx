import { useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { PLANET_MODEL_PATHS, AVATAR_MODEL_PATHS } from './modelPaths.js'

/**
 * Preloads all planet and avatar GLB files.
 * Mount this during the check-in screen to leverage user interaction time.
 * Does not render any DOM or Three.js elements.
 *
 * Calls useGLTF.preload() for each model path on mount, allowing drei's
 * internal cache to begin fetching GLB files before the star system renders.
 */
export default function PreloadManager() {
  useEffect(() => {
    // Planet preloading disabled for performance — using procedural geometry
    // PLANET_MODEL_PATHS.forEach((path) => useGLTF.preload(path))
    AVATAR_MODEL_PATHS.forEach((path) => useGLTF.preload(path))
  }, [])

  return null
}
