import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import UserAvatar from '../components/3d/UserAvatar'
import AvatarCustomizer from '../components/ui/AvatarCustomizer'
import { useIsSmallScreen } from '../lib/device'
import { useOrientation } from '../lib/viewport'

/**
 * AvatarScreen — full-screen WebGL stage with the customizer overlaid.
 *
 * The avatar renders live behind the panel, so every option change is
 * immediately visible rather than being previewed in a small box.
 *
 * Mobile (< 768px):
 *   - Portrait: 3D canvas occupies the top 45dvh, customizer panel fills
 *     remaining bottom space. Panel scrolls independently with overscroll-contain.
 *   - Landscape: Side-by-side — canvas fills left, panel on right (max 320px).
 *
 * Desktop (>= 768px): Full-screen canvas with overlaid panel (bg-[#0d0d2b] solid).
 *
 * No glass-morphism anywhere. Canvas background: #050510.
 */
export default function AvatarScreen() {
  const isMobile = useIsSmallScreen()
  const { isLandscape } = useOrientation()

  // On mobile landscape: side-by-side layout (canvas left, panel right)
  if (isMobile && isLandscape) {
    return (
      <div className="relative w-full h-full overflow-hidden flex flex-row">
        {/* 3D Canvas — fills remaining left space */}
        <div className="flex-1 relative" style={{ minHeight: '100%' }}>
          <Canvas
            camera={{ position: [0, 0, 5], fov: 50 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            className="w-full h-full"
            style={{ background: '#050510' }}
          >
            <Suspense fallback={null}>
              <ambientLight intensity={0.45} />
              <pointLight position={[4, 4, 4]} intensity={1.2} />
              <pointLight position={[-4, -2, -3]} intensity={0.5} color="#a78bfa" />
              <UserAvatar preview />
              <OrbitControls
                enablePan={false}
                enableZoom={false}
                autoRotate
                autoRotateSpeed={1.2}
              />
              <EffectComposer disableNormalPass multisampling={0}>
                <Bloom
                  intensity={1.4}
                  luminanceThreshold={0.35}
                  luminanceSmoothing={0.4}
                  mipmapBlur
                  radius={0.8}
                />
              </EffectComposer>
            </Suspense>
          </Canvas>
        </div>

        {/* Side panel — right-aligned, max 320px */}
        <AvatarCustomizer landscape />
      </div>
    )
  }

  // Mobile portrait: stacked layout (canvas top 45dvh, panel bottom fills rest)
  if (isMobile) {
    return (
      <div className="relative w-full h-full overflow-hidden flex flex-col">
        {/* 3D Canvas — 45dvh fixed height */}
        <div className="relative flex-shrink-0" style={{ height: '45dvh' }}>
          <Canvas
            camera={{ position: [0, 0, 5], fov: 50 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            className="w-full h-full"
            style={{ background: '#050510' }}
          >
            <Suspense fallback={null}>
              <ambientLight intensity={0.45} />
              <pointLight position={[4, 4, 4]} intensity={1.2} />
              <pointLight position={[-4, -2, -3]} intensity={0.5} color="#a78bfa" />
              <UserAvatar preview />
              <OrbitControls
                enablePan={false}
                enableZoom={false}
                autoRotate
                autoRotateSpeed={1.2}
              />
              <EffectComposer disableNormalPass multisampling={0}>
                <Bloom
                  intensity={1.4}
                  luminanceThreshold={0.35}
                  luminanceSmoothing={0.4}
                  mipmapBlur
                  radius={0.8}
                />
              </EffectComposer>
            </Suspense>
          </Canvas>
        </div>

        {/* Bottom-anchored customizer panel — fills remaining space, scrollable */}
        <AvatarCustomizer />
      </div>
    )
  }

  // Desktop: original layout (full-screen canvas with overlaid panel)
  return (
    <div className="relative w-full h-full overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        className="w-full h-full"
        style={{ background: '#050510' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.45} />
          <pointLight position={[4, 4, 4]} intensity={1.2} />
          <pointLight position={[-4, -2, -3]} intensity={0.5} color="#a78bfa" />

          <UserAvatar preview />

          <OrbitControls
            enablePan={false}
            enableZoom={false}
            autoRotate
            autoRotateSpeed={1.2}
          />

          <EffectComposer disableNormalPass multisampling={0}>
            <Bloom
              intensity={1.4}
              luminanceThreshold={0.35}
              luminanceSmoothing={0.4}
              mipmapBlur
              radius={0.8}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Solid-background controls overlaid on top of the canvas */}
      <AvatarCustomizer />
    </div>
  )
}
