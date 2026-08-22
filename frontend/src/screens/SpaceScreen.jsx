import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import useAppStore from '../store/useAppStore'
import StarSystem from '../components/3d/StarSystem'
import GalacticBackdrop from '../components/3d/GalacticBackdrop'
import PeerAvatars from '../components/3d/PeerAvatars'
import usePresence from '../hooks/usePresence'
import { sceneConfig, useIsSmallScreen, useViewportSize } from '../lib/device'
import HUD from '../components/ui/HUD'
import PlanetNav from '../components/ui/PlanetNav'
import PlanetInfoPanel from '../components/ui/PlanetInfoPanel'
import OnboardingOverlay from '../components/ui/OnboardingOverlay'
import { supabase } from '../lib/supabase'
import { isHintDismissed, dismissHint, HINT_PLANET_PULSE } from '../lib/hintStore'
import { PLANETS } from '../data/planets'

// Scratch objects â€” allocated once, reused every frame
const _desiredCamPos = new THREE.Vector3()
const _desiredTarget = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _defaultCamPos = new THREE.Vector3(0, 8, 40)
const _defaultTarget = new THREE.Vector3(0, 0, 0)

/**
 * CameraRig
 *
 * Phase 1 â€” FLY-IN:
 *   OrbitControls is DISABLED. We manually set camera.position and
 *   camera.lookAt each frame until we arrive. On arrival we sync
 *   OrbitControls' internal spherical state and re-enable it.
 *
 * Phase 2 â€” FREE ORBIT:
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

    // â”€â”€ Detect selection change â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (currentId !== lastSelectedId.current) {
      lastSelectedId.current = currentId

      if (currentId === null) {
        // Deselected â€” fly back to overview
        phase.current = 'returning'
        if (controlsRef.current) controlsRef.current.enabled = false
      } else {
        // New planet selected â€” start fly-in
        phase.current = 'flying'
        if (controlsRef.current) controlsRef.current.enabled = false
      }
    }

    // â”€â”€ Phase: returning to overview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (phase.current === 'returning') {
      camera.position.lerp(_defaultCamPos, 0.04)
      camera.lookAt(_defaultTarget)

      if (camera.position.distanceTo(_defaultCamPos) < 1) {
        // Arrived at overview â€” re-enable controls
        phase.current = 'idle'
        if (controlsRef.current) {
          controlsRef.current.target.copy(_defaultTarget)
          controlsRef.current.update()
        }
        restoreControls()
      }
      return
    }

    // â”€â”€ Phase: idle (no planet, controls own the camera) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (phase.current === 'idle') return

    // â”€â”€ Need live planet position for flying / tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (!selectedPlanet) return
    const livePos = useAppStore.getState().planetPositions[selectedPlanet.id]
    if (!livePos) return

    // Compute desired camera position: pull back from planet along
    // the planetâ†’origin direction, lift up slightly
    _dir.set(livePos.x, 0, livePos.z).normalize()
    const pullBack = selectedPlanet.size * 4 + 10
    _desiredCamPos.set(
      livePos.x + _dir.x * pullBack,
      livePos.y + selectedPlanet.size * 2.5 + 3,
      livePos.z + _dir.z * pullBack
    )
    _desiredTarget.set(livePos.x, livePos.y, livePos.z)

    // â”€â”€ Phase: flying in â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (phase.current === 'flying') {
      camera.position.lerp(_desiredCamPos, 0.06)
      camera.lookAt(_desiredTarget)

      if (camera.position.distanceTo(_desiredCamPos) < 1.2) {
        // Arrived â€” sync OrbitControls internal state then re-enable
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

    // â”€â”€ Phase: tracking (free orbit, pivot follows planet) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (phase.current === 'tracking') {
      if (controlsRef.current) {
        // Keep camera locked on the moving planet by updating both the pivot
        // target and the camera position to follow the orbit each frame.
        const offset = camera.position.clone().sub(controlsRef.current.target)
        controlsRef.current.target.lerp(_desiredTarget, 0.15)
        camera.position.copy(controlsRef.current.target).add(offset)
        controlsRef.current.update()
      }
    }
  })

  return null
}

/**
 * SpaceScreen â€” The main 3D navigable star system.
 */
/**
 * Surfaces WebGL context loss instead of letting the app freeze silently.
 * Context loss is common in dev after many hot reloads.
 */
function ContextLossGuard({ onLost }) {
  const { gl } = useThree()

  // One-time GPU report â€” tells us whether the browser is falling back to
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
      console.warn('[AnonEmote] WebGL context lost â€” a page reload is required.')
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
    setPosts, selectedPlanet, setSelectedPlanet,
    crisis, reportTarget, postModalOpen,
    onboarding, startOnboarding,
  } = useAppStore()
  const isSmallScreen = useIsSmallScreen()
  const { height: viewportHeight } = useViewportSize()
  const controlsRef = useRef()
  const [contextLost, setContextLost] = useState(false)
  const [postsLoading, setPostsLoading] = useState(true)
  const onboardingActive = onboarding.active

  // â”€â”€â”€ Planet pulse hint (Req 6.2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // On first Star_System entry per session, show a pulsing glow on the first
  // planet for 5 seconds. Dismissed on click or timeout.
  const [showPulseHint, setShowPulseHint] = useState(false)

  useEffect(() => {
    if (isHintDismissed(HINT_PLANET_PULSE)) return

    // Show the pulse hint
    setShowPulseHint(true)

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setShowPulseHint(false)
      dismissHint(HINT_PLANET_PULSE)
    }, 5000)

    return () => clearTimeout(timer)
  }, []) // run once on mount

  // Dismiss pulse hint when user clicks any planet
  const handlePulseDismiss = useCallback(() => {
    if (showPulseHint) {
      setShowPulseHint(false)
      dismissHint(HINT_PLANET_PULSE)
    }
  }, [showPulseHint])

  // Broadcast our presence and receive other users' avatar states
  const { peers } = usePresence()

  // Only *blocking* dialogs freeze the scene. The broadcast composer is a
  // draggable floating panel, so the star system stays navigable behind it.
  // Onboarding overlay also disables planet interactions while active.
  const modalOpen = crisis.open || !!reportTarget || onboardingActive

  // â”€â”€â”€ Viewport Budget (mobile) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Chrome budget: HUD (40px) + Nav (44px) = 84px max on mobile.
  // PlanetInfoPanel maxHeight is calculated so:
  //   1. It fits between HUD and Nav (viewport - 84 - safe insets)
  //   2. The 3D canvas retains at least 15% of viewport height visible
  //   3. Unless that would force the panel below 200px (minimum panel height)
  //   4. Landscape (< 500px height): cap at 50% viewport height
  const panelMaxHeight = useMemo(() => {
    if (!isSmallScreen) return undefined // desktop uses its own layout

    const HUD_HEIGHT = 40
    const NAV_HEIGHT = 44
    const CHROME_BUDGET = HUD_HEIGHT + NAV_HEIGHT // 84px
    const MIN_PANEL_HEIGHT = 200
    const MIN_CANVAS_PERCENT = 0.15

    // Available space between HUD and Nav (excluding safe insets which are
    // handled via CSS env() in the panel itself)
    const availableSpace = viewportHeight - CHROME_BUDGET

    // Canvas must retain at least 15% of viewport height visible
    const minCanvasHeight = viewportHeight * MIN_CANVAS_PERCENT
    let maxHeight = availableSpace - minCanvasHeight

    // If enforcing 15% canvas visibility would push panel below 200px,
    // use 200px minimum instead (canvas gets less space)
    if (maxHeight < MIN_PANEL_HEIGHT) {
      maxHeight = MIN_PANEL_HEIGHT
    }

    // Never exceed available space
    if (maxHeight > availableSpace) {
      maxHeight = availableSpace
    }

    // Landscape cap: viewport height < 500px â†’ cap at 50% viewport height
    if (viewportHeight < 500) {
      const landscapeCap = viewportHeight * 0.5
      maxHeight = Math.min(maxHeight, landscapeCap)
    }

    return `${Math.round(maxHeight)}px`
  }, [isSmallScreen, viewportHeight])

  // â”€â”€â”€ Onboarding trigger for newly registered users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // If the user hasn't completed onboarding yet (no onboarding_completed_at in
  // their metadata), start the onboarding flow. Returning users who have already
  // completed onboarding are skipped.
  useEffect(() => {
    let cancelled = false

    const checkOnboarding = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return

        // Only trigger for authenticated users without onboarding completion
        if (!user) return
        const completedAt = user.user_metadata?.onboarding_completed_at
        if (!completedAt) {
          startOnboarding()
        }
      } catch (err) {
        // Silently fail â€” onboarding is non-critical
        console.warn('[SpaceScreen] Failed to check onboarding status:', err)
      }
    }

    checkOnboarding()

    return () => { cancelled = true }
  }, [startOnboarding])

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
      setPostsLoading(false)
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

  // â”€â”€â”€ Keyboard navigation for 3D canvas (Req 19.8) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Allows planet selection via Tab (cycle), Enter (select), Escape (exit).
  // This is an alternative path alongside PlanetNav's button-based navigation.
  const canvasWrapperRef = useRef(null)
  const [kbFocusedIndex, setKbFocusedIndex] = useState(null)

  const handleCanvasKeyDown = useCallback((e) => {
    // Only handle keys when the canvas wrapper itself is focused
    if (e.target !== canvasWrapperRef.current) return

    if (e.key === 'Tab') {
      e.preventDefault()
      setKbFocusedIndex((prev) => {
        if (prev === null) return 0
        if (e.shiftKey) {
          return prev <= 0 ? PLANETS.length - 1 : prev - 1
        }
        return prev >= PLANETS.length - 1 ? 0 : prev + 1
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (kbFocusedIndex !== null && PLANETS[kbFocusedIndex]) {
        setSelectedPlanet(PLANETS[kbFocusedIndex])
        setKbFocusedIndex(null)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setKbFocusedIndex(null)
      canvasWrapperRef.current?.blur()
    }
  }, [kbFocusedIndex, setSelectedPlanet])

  // Clear keyboard focus indicator when canvas wrapper loses focus
  const handleCanvasBlur = useCallback(() => {
    setKbFocusedIndex(null)
  }, [])

  return (
    <div className="relative w-full" style={{ height: isSmallScreen ? 'var(--app-height, 100dvh)' : '100%' }}>
      {/* Canvas wrapper â€” keyboard-navigable for planet selection */}
      <div
        ref={canvasWrapperRef}
        tabIndex={0}
        role="application"
        aria-label="3D star system â€” use Tab to cycle planets, Enter to select, Escape to exit"
        onKeyDown={handleCanvasKeyDown}
        onBlur={handleCanvasBlur}
        className="relative w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-500/60"
        style={{ height: isSmallScreen ? 'var(--content-height, calc(100dvh - 84px))' : '100%' }}
      >
      <Canvas
        camera={{ position: [0, 8, 40], fov: 60 }}
        className="w-full"
        style={{
          height: '100%',
          pointerEvents: modalOpen ? 'none' : 'auto',
        }}
        // Cap pixel ratio â€” on high-DPI screens an uncapped dpr can allocate
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
        onPointerMissed={(e) => {
          if (modalOpen || postModalOpen) return
          // Read fresh state â€” postModalOpen may have just been set by a button
          // click on the info panel that also triggered this pointer-miss
          const state = useAppStore.getState()
          if (state.postModalOpen) return
          // Only deselect if the click originated on the canvas itself, not on
          // an HTML overlay (PlanetInfoPanel, modals, etc.)
          if (e?.target?.tagName !== 'CANVAS') return
          state.setSelectedPlanet(null)
        }}
      >
        <Suspense fallback={null}>
          {/* Lighting is driven by the central star (see CentralStar.jsx),
              which is the only shadow caster. Everything here is low-level
              fill so the dark sides of planets stay readable as clay rather
              than going pure black. */}
          {/* Lighting is star-dominant so each planet has a true day and night
              side, with the terminator sweeping around as it orbits.
              Ambient is kept deliberately low â€” any significant ambient lights
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

          <StarSystem peerCount={peers.length} />

          {/* Other users' avatars â€” rendered from Supabase Presence */}
          <PeerAvatars peers={peers} />

          <CameraRig controlsRef={controlsRef} modalOpen={modalOpen} />

          <ContextLossGuard onLost={(lost = true) => setContextLost(lost)} />

          {/* Post-processing â€” skipped on low-end devices */}
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

        {/* Keyboard navigation focus indicator â€” shows which planet is highlighted
            while the user cycles through them with Tab */}
        {kbFocusedIndex !== null && PLANETS[kbFocusedIndex] && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10
                       bg-[#0a0a1a]/90 border border-violet-500/40 rounded-lg
                       px-4 py-2 pointer-events-none animate-fade-in"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="text-xs text-white tracking-wide">
              <span className="mr-1.5">{PLANETS[kbFocusedIndex].emoji}</span>
              <span className="text-violet-300 font-medium">{PLANETS[kbFocusedIndex].label}</span>
              <span className="ml-2 text-slate-400">â€” press Enter to select</span>
            </span>
          </div>
        )}
      </div>

      <HUD peerCount={peers.length} />
      <PlanetNav showPulseHint={showPulseHint} onPlanetClick={handlePulseDismiss} />
      {selectedPlanet && <PlanetInfoPanel postsLoading={postsLoading} maxHeight={panelMaxHeight} />}

      {/* Onboarding tutorial overlay â€” renders above the 3D scene as HTML */}
      <OnboardingOverlay />

      {/* Visible recovery prompt instead of a silently frozen scene */}
      {contextLost && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center p-6"
             style={{ background: 'rgba(10,10,26,0.92)' }}>
          <div className="glass-dark rounded-3xl p-6 max-w-sm text-center flex flex-col gap-4">
            <div className="text-4xl">ðŸŒŒ</div>
            <h2 className="text-lg font-bold text-white">Lost the star system</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              The 3D renderer lost its graphics context. Reloading restores it â€”
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
