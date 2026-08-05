import React, { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import useAppStore from '../store/useAppStore'
import StarSystem from '../components/3d/StarSystem'
import GalacticBackdrop from '../components/3d/GalacticBackdrop'
import { sceneConfig, isSmallScreen } from '../lib/device'
import HUD from '../components/ui/HUD'
import PlanetInfoPanel from '../components/ui/PlanetInfoPanel'
import { supabase } from '../lib/supabase'

// Scratch objects — allocated once, reused every frame
const _desiredCamPos = new THREE.Vector3()
const _desiredTarget = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _defaultCamPos = new THREE.Vector3(0, 8, 40)
const _defaultTarget = new THREE.Vector3(0, 0, 0)

/**
 * CameraRig
 *
 * Phase 1 — FLY-IN:
 *   OrbitControls is DISABLED. We manually set camera.position and
 *   camera.lookAt each frame until we arrive. On arrival we sync
 *   OrbitControls' internal spherical state and re-enable it.
 *
 * Phase 2 — FREE ORBIT:
 *   OrbitControls is ENABLED and owns camera.position.
 *   We only lerp OrbitControls.target toward the live planet position
 *   so the pivot follows the orbiting planet. User can drag/zoom freely.
 *
 * Deselect:
 *   Fly back to the default overview position, then re-enable OrbitControls.
 */
function CameraRig({ controlsRef, modalOpen }) {
  const { camera } = useThree()

  const lastSelectedId = useRef(null)
  // 'idle' | 'flying' | 'tracking'
  const phase = useRef('idle')

  /** Only hand control back to the user if no modal is covering the scene. */
  const restoreControls = () => {
    if (controlsRef.current && !modalOpen) controlsRef.current.enabled = true
  }

  useFrame(() => {
    const selectedPlanet = useAppStore.getState().selectedPlanet
    const currentId = selectedPlanet?.id ?? null

    // ── Detect selection change ─────────────────────────────────────────────
    if (currentId !== lastSelectedId.current) {
      lastSelectedId.current = currentId

      if (currentId === null) {
        // Deselected — fly back to overview
        phase.current = 'returning'
        if (controlsRef.current) controlsRef.current.enabled = false
      } else {
        // New planet selected — start fly-in
        phase.current = 'flying'
        if (controlsRef.current) controlsRef.current.enabled = false
      }
    }

    // ── Phase: returning to overview ────────────────────────────────────────
    if (phase.current === 'returning') {
      camera.position.lerp(_defaultCamPos, 0.04)
      camera.lookAt(_defaultTarget)

      if (camera.position.distanceTo(_defaultCamPos) < 1) {
        // Arrived at overview — re-enable controls
        phase.current = 'idle'
        if (controlsRef.current) {
          controlsRef.current.target.copy(_defaultTarget)
          controlsRef.current.update()
        }
        restoreControls()
      }
      return
    }

    // ── Phase: idle (no planet, controls own the camera) ───────────────────
    if (phase.current === 'idle') return

    // ── Need live planet position for flying / tracking ─────────────────────
    if (!selectedPlanet) return
    const livePos = useAppStore.getState().planetPositions[selectedPlanet.id]
    if (!livePos) return

    // Compute desired camera position: pull back from planet along
    // the planet→origin direction, lift up slightly
    _dir.set(livePos.x, 0, livePos.z).normalize()
    const pullBack = selectedPlanet.size * 4 + 10
    _desiredCamPos.set(
      livePos.x + _dir.x * pullBack,
      livePos.y + selectedPlanet.size * 2.5 + 3,
      livePos.z + _dir.z * pullBack
    )
    _desiredTarget.set(livePos.x, livePos.y, livePos.z)

    // ── Phase: flying in ────────────────────────────────────────────────────
    if (phase.current === 'flying') {
      camera.position.lerp(_desiredCamPos, 0.06)
      camera.lookAt(_desiredTarget)

      if (camera.position.distanceTo(_desiredCamPos) < 1.2) {
        // Arrived — sync OrbitControls internal state then re-enable
        phase.current = 'tracking'
        if (controlsRef.current) {
          // Tell OrbitControls where the camera is NOW so it doesn't snap
          controlsRef.current.target.copy(_desiredTarget)
          controlsRef.current.update()
        }
        restoreControls()
      }
      return
    }

    // ── Phase: tracking (free orbit, pivot follows planet) ──────────────────
    if (phase.current === 'tracking') {
      if (controlsRef.current) {
        // Softly move the pivot to keep planet centred as it orbits
        controlsRef.current.target.lerp(_desiredTarget, 0.06)
        controlsRef.current.update()
      }
    }
  })

  return null
}

/**
 * SpaceScreen — The main 3D navigable star system.
 */
/**
 * Surfaces WebGL context loss instead of letting the app freeze silently.
 * Context loss is common in dev after many hot reloads.
 */
function ContextLossGuard({ onLost }) {
  const { gl } = useThree()

  // One-time GPU report — tells us whether the browser is falling back to
  // software rendering, which causes frequent context loss.
  useEffect(() => {
    try {
      const ctx = gl.getContext()
      const info = ctx.getExtension('WEBGL_debug_renderer_info')
      console.info(
        '[AnonEmote GPU]',
        JSON.stringify({
          renderer: info ? ctx.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown',
          vendor: info ? ctx.getParameter(info.UNMASKED_VENDOR_WEBGL) : 'unknown',
          maxTextureSize: ctx.getParameter(ctx.MAX_TEXTURE_SIZE),
          dpr: gl.getPixelRatio(),
        }, null, 2)
      )
    } catch (err) {
      console.warn('[AnonEmote GPU] could not read renderer info:', err.message)
    }
  }, [gl])

  useEffect(() => {
    const canvas = gl.domElement

    const handleLost = (e) => {
      e.preventDefault()
      console.warn('[AnonEmote] WebGL context lost — a page reload is required.')
      onLost?.()
    }
    const handleRestored = () => {
      console.info('[AnonEmote] WebGL context restored.')
      onLost?.(false)
    }

    canvas.addEventListener('webglcontextlost', handleLost)
    canvas.addEventListener('webglcontextrestored', handleRestored)
    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost)
      canvas.removeEventListener('webglcontextrestored', handleRestored)
    }
  }, [gl, onLost])

  return null
}

export default function SpaceScreen() {
  const {
    setPosts, selectedPlanet,
    crisis, reportTarget,
  } = useAppStore()
  const controlsRef = useRef()
  const [contextLost, setContextLost] = useState(false)

  // Only *blocking* dialogs freeze the scene. The broadcast composer is a
  // draggable floating panel, so the star system stays navigable behind it.
  const modalOpen = crisis.open || !!reportTarget

  useEffect(() => {
    let channel
    let pollId

    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(200)
      if (!error && data) setPosts(data)
    }

    fetchPosts()

    channel = supabase
      .channel('posts-realtime')

      // New post from any client
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          if (payload.new?.is_hidden) return
          useAppStore.getState().addPost(payload.new)
        })

      // Admin flagged or restored a post
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          const store = useAppStore.getState()
          if (payload.new?.is_hidden) {
            store.removePost(payload.new.id)
          } else {
            store.addPost(payload.new)   // deduplicates by id
          }
        })

      // Admin permanently deleted a post
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          const id = payload.old?.id
          if (id) useAppStore.getState().removePost(id)
        })

      .subscribe()

    // Safety net: if realtime is unavailable for this table, a periodic
    // refetch still picks up admin moderation within 30 seconds.
    pollId = setInterval(fetchPosts, 30000)

    // Refresh when the tab regains focus, so returning from the admin console
    // shows current state immediately.
    const onFocus = () => fetchPosts()
    window.addEventListener('focus', onFocus)

    return () => {
      if (channel) supabase.removeChannel(channel)
      clearInterval(pollId)
      window.removeEventListener('focus', onFocus)
    }
  }, [setPosts])

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 8, 40], fov: 60 }}
        className="w-full h-full"
        // Cap pixel ratio — on high-DPI screens an uncapped dpr can allocate
        // several times more GPU memory than needed and trigger context loss.
        dpr={sceneConfig.dpr}
        // Soft shadows only on devices that can afford them
        shadows={sceneConfig.shadowMapSize > 0 ? { type: THREE.PCFSoftShadowMap } : false}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false,
        }}
        style={{ pointerEvents: modalOpen ? 'none' : 'auto' }}
        onPointerMissed={() => {
          if (modalOpen) return
          useAppStore.getState().setSelectedPlanet(null)
        }}
      >
        <Suspense fallback={null}>
          {/* Lighting is driven by the central star (see CentralStar.jsx),
              which is the only shadow caster. Everything here is low-level
              fill so the dark sides of planets stay readable as clay rather
              than going pure black. */}
          {/* Lighting is star-dominant so each planet has a true day and night
              side, with the terminator sweeping around as it orbits.
              Ambient is kept deliberately low — any significant ambient lights
              both hemispheres equally and destroys the day/night read. The
              night side stays visible via the material's emissive instead,
              which shows the planet's own colour rather than grey wash. */}
          <ambientLight intensity={0.14} />

          {/* Very slight cool bounce, standing in for starlight from the wider
              galaxy. Low enough not to flatten the terminator. */}
          <hemisphereLight args={['#c7d2fe', '#1e1b4b', 0.2]} />

          {/* Faint rim accents placed far out, so they only graze the outer
              edges of night sides and keep planets from merging into the
              nebula. Kept weak so they never read as a second sun. */}
          <pointLight position={[90, 40, -70]} intensity={0.22} color="#a78bfa" />
          <pointLight position={[-90, -30, 70]} intensity={0.22} color="#60a5fa" />

          {/* Nebula skydome + flicker-free starfield, in the project palette */}
          <GalacticBackdrop starCount={sceneConfig.starCount} />

          <StarSystem />

          <CameraRig controlsRef={controlsRef} modalOpen={modalOpen} />

          <ContextLossGuard onLost={(lost = true) => setContextLost(lost)} />

          {/* Post-processing — skipped on low-end devices */}
          {sceneConfig.bloomEnabled && (
            <EffectComposer disableNormalPass multisampling={0}>
              <Bloom
                intensity={0.9}
                luminanceThreshold={0.9}
                luminanceSmoothing={0.3}
                mipmapBlur
                radius={0.7}
              />
              <Vignette offset={0.4} darkness={0.28} eskil={false} />
            </EffectComposer>
          )}

          <OrbitControls
            ref={controlsRef}
            enabled={!modalOpen}
            enablePan={!modalOpen && !isSmallScreen}
            enableZoom={!modalOpen}
            enableRotate={!modalOpen}
            // Touch-friendly: enable damping so momentum scrolling feels natural
            enableDamping
            dampingFactor={0.08}
            // On mobile, restrict zoom range so users can't lose the scene
            minDistance={isSmallScreen ? 10 : 4}
            maxDistance={isSmallScreen ? 80 : 120}
            autoRotate={!selectedPlanet && !modalOpen}
            autoRotateSpeed={0.15}
            // Two-finger gestures for rotate + zoom on touch
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
          />
        </Suspense>
      </Canvas>

      <HUD />
      {selectedPlanet && <PlanetInfoPanel />}

      {/* Visible recovery prompt instead of a silently frozen scene */}
      {contextLost && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center p-6"
             style={{ background: 'rgba(10,10,26,0.92)' }}>
          <div className="glass-dark rounded-3xl p-6 max-w-sm text-center flex flex-col gap-4">
            <div className="text-4xl">🌌</div>
            <h2 className="text-lg font-bold text-white">Lost the star system</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              The 3D renderer lost its graphics context. Reloading restores it —
              your session and posts are unaffected.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm
                         bg-gradient-to-r from-violet-600 to-indigo-600
                         hover:from-violet-500 hover:to-indigo-500 transition-all"
            >
              Reload
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
