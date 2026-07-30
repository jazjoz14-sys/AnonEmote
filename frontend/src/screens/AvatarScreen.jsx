import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import UserAvatar from '../components/3d/UserAvatar'
import AvatarCustomizer from '../components/ui/AvatarCustomizer'

/**
 * AvatarScreen — full-screen WebGL stage with the customizer overlaid.
 *
 * The avatar renders live behind the glass panel, so every option change is
 * immediately visible rather than being previewed in a small box.
 */
export default function AvatarScreen() {
  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        className="w-full h-full"
        style={{ background: 'radial-gradient(ellipse at center, #16162e 0%, #07070f 100%)' }}
      >
        <Suspense fallback={null}>
          {/* Soft studio lighting — the avatar is emissive, so this is mostly
              to give the form some shading rather than to light it */}
          <ambientLight intensity={0.45} />
          <pointLight position={[4, 4, 4]} intensity={1.2} />
          <pointLight position={[-4, -2, -3]} intensity={0.5} color="#a78bfa" />

          <UserAvatar preview />

          {/* Let the user turn their form to look at it */}
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            autoRotate
            autoRotateSpeed={1.2}
          />

          {/* Bloom gives the aura its glow */}
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

      {/* Glassmorphism controls on top of the canvas */}
      <AvatarCustomizer />
    </div>
  )
}
