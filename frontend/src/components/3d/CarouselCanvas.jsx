import React, { useCallback, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import CarouselPlanetScene from './CarouselPlanetScene'

/**
 * CarouselCanvas — Single WebGL Canvas rendering the active planet directly.
 *
 * Positioned as an absolute overlay covering the LEFT half of the carousel's
 * sticky container (where the planet visual region lives). Renders only the
 * currently active planet via CarouselPlanetScene — no View/View.Port tracking.
 *
 * This approach eliminates scroll drift caused by drei's <View> miscalculating
 * getBoundingClientRect() inside translateX'd parents within custom scroll contexts.
 *
 * @param {{
 *   containerRef: React.RefObject,
 *   fallback: boolean,
 *   onContextLost: function,
 *   onReady: function,
 *   frameloop: 'always' | 'demand' | 'never',
 *   activePlanet: object
 * }} props
 */
export default function CarouselCanvas({ containerRef, fallback, onContextLost, onReady, frameloop = 'always', activePlanet }) {
  // If fallback is true (context was lost or creation failed), render nothing —
  // the parent component will show static planet icon images instead.
  if (fallback) return null

  /**
   * onCreated — fires once the R3F Canvas is initialized.
   * Attaches a webglcontextlost listener to the underlying <canvas> element
   * so the parent can flip to static fallback mode if the GPU context is evicted.
   * Also signals the parent that the Canvas is ready to render 3D content.
   */
  const handleCreated = useCallback(({ gl }) => {
    gl.domElement.addEventListener('webglcontextlost', (e) => {
      // Prevent default to suppress browser error dialogs
      e.preventDefault()
      onContextLost()
    })
    // Signal that the WebGL Canvas is initialized and ready to render
    if (onReady) onReady()
  }, [onContextLost, onReady])

  return (
    <Canvas
      frameloop={frameloop}
      dpr={[1, 1.25]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={handleCreated}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '50%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <Suspense fallback={null}>
        {activePlanet && (
          <CarouselPlanetScene
            key={activePlanet.id}
            planet={activePlanet}
            active={true}
          />
        )}
      </Suspense>
    </Canvas>
  )
}
