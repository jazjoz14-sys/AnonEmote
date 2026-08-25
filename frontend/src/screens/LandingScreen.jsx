import React, { useEffect, useRef, useState, Suspense, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import useAppStore from '../store/useAppStore'
import { CLAY, makeClayBlob } from '../components/3d/clay'
import { PLANETS } from '../data/planets'
import { useIsSmallScreen } from '../lib/device'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { HERO, STATEMENT, CTA, PLANET_DESCRIPTIONS } from '../data/landingCopy'
import CarouselPlanetScene from '../components/3d/CarouselPlanetScene'


/**
 * LandingScreen — OkayDev-inspired atmospheric landing.
 *
 * Design DNA from okaydev.co:
 * - Massive display headlines
 * - Uppercase small tracking labels
 * - Monochrome palette with one accent (violet)
 * - Generous whitespace between sections
 * - Outline/border buttons, not filled gradients
 * - Grid showcase of planets with hover reveals
 * - Minimal, editorial layout
 */

/* ── Planet icon paths ──────────────────────────────────────────────────────── */
const PLANET_ICONS = {
  joy: '/icons/joy.png',
  vent: '/icons/venting.png',
  advice: '/icons/seek advice.png',
  grief: '/icons/grief.png',
  anxiety: '/icons/anxiety.png',
  neutral: '/icons/reflections.png',
  doodle: '/icons/doodle.svg',
}

const PLANET_DETAILS = {
  joy: {
    purpose: 'A space to celebrate wins, gratitude, and the small victories that make university life worth it.',
    quote: '"Happiness is not something ready-made. It comes from your own actions." — Dalai Lama',
    traits: ['Gratitude', 'Celebration', 'Hope'],
  },
  vent: {
    purpose: 'Let frustrations, academic burnout, and daily stress flow out without consequence.',
    quote: '"It\'s okay to not be okay, as long as you don\'t give up." — Karen Salmansohn',
    traits: ['Release', 'Frustration', 'Catharsis'],
  },
  advice: {
    purpose: 'Ask for peer guidance, fresh perspectives, and community wisdom — anonymously.',
    quote: '"The only true wisdom is in knowing you know nothing." — Socrates',
    traits: ['Guidance', 'Community', 'Wisdom'],
  },
  grief: {
    purpose: 'A quiet corner for processing sadness, loss, heartbreak, and the heavy moments.',
    quote: '"Grief is the price we pay for love." — Queen Elizabeth II',
    traits: ['Processing', 'Remembrance', 'Healing'],
  },
  anxiety: {
    purpose: 'Name the spiral. Share racing thoughts, worries, and overwhelm.',
    quote: '"You don\'t have to control your thoughts. Just stop letting them control you." — Dan Millman',
    traits: ['Overwhelm', 'Worry', 'Solidarity'],
  },
  neutral: {
    purpose: 'For calm observations, random thoughts, and day-to-day musings.',
    quote: '"Almost everything will work again if you unplug it for a few minutes — including you." — Anne Lamott',
    traits: ['Mindfulness', 'Observation', 'Stillness'],
  },
  doodle: {
    purpose: 'When words fail, draw. A freeform canvas for visual emotional expression.',
    quote: '"Art enables us to find ourselves and lose ourselves at the same time." — Thomas Merton',
    traits: ['Expression', 'Creativity', 'Freedom'],
  },
}

const PLANET_DATA = [
  {
    id: 'joy', name: 'Joy', color: '#f59e0b',
    tagline: 'Celebrate the good moments.',
    quote: '"Happiness comes from your own actions."',
  },
  {
    id: 'vent', name: 'Venting', color: '#3b82f6',
    tagline: 'Let it out — no filter needed.',
    quote: '"It\'s okay to not be okay."',
  },
  {
    id: 'advice', name: 'Seek Advice', color: '#10b981',
    tagline: 'Ask for guidance anonymously.',
    quote: '"True wisdom is knowing you know nothing."',
  },
  {
    id: 'grief', name: 'Grief & Loss', color: '#6366f1',
    tagline: 'A quiet space to process.',
    quote: '"Grief is the price we pay for love."',
  },
  {
    id: 'anxiety', name: 'Anxiety', color: '#ec4899',
    tagline: 'Name the spiral.',
    quote: '"You don\'t have to control your thoughts."',
  },
  {
    id: 'neutral', name: 'Reflections', color: '#94a3b8',
    tagline: 'Calm observations, random thoughts.',
    quote: '"Unplug for a few minutes — including you."',
  },
  {
    id: 'doodle', name: 'Doodle Drift', color: '#e2e2e2',
    tagline: 'Draw when words aren\'t enough.',
    quote: '"Art lets us find and lose ourselves."',
  },
]

/* ── Floating particles (subtle background life) ───────────────────────────── */
function Particles() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    // Stars — many small white dots
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.6 + 0.2,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      phase: Math.random() * Math.PI * 2,
    }))

    // Violet accent dots (the original particles, fewer)
    const dots = Array.from({ length: 20 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.1 - 0.05,
      alpha: Math.random() * 0.3 + 0.05,
    }))

    let frame = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++

      // Draw stars with twinkle
      for (const s of stars) {
        const twinkle = Math.sin(frame * s.twinkleSpeed + s.phase) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${s.alpha * twinkle})`
        ctx.fill()
      }

      // Draw floating violet dots
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0) d.x = canvas.width
        if (d.x > canvas.width) d.x = 0
        if (d.y < 0) d.y = canvas.height
        if (d.y > canvas.height) d.y = 0
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(139,92,246,${d.alpha})`
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animRef.current) }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" aria-hidden="true" />
}

/* ── Background 3D planets floating in space ───────────────────────────────── */
const BG_PLANETS = [
  { color: '#f59e0b', x: -6, y: 3, z: -8, size: 0.6, speed: 0.3, seed: 42 },
  { color: '#3b82f6', x: 7, y: -2, z: -10, size: 0.8, speed: 0.2, seed: 77 },
  { color: '#10b981', x: -4, y: -4, z: -12, size: 0.5, speed: 0.35, seed: 13 },
  { color: '#6366f1', x: 8, y: 4, z: -9, size: 0.7, speed: 0.25, seed: 99 },
  { color: '#ec4899', x: -8, y: 1, z: -11, size: 0.55, speed: 0.28, seed: 55 },
  { color: '#94a3b8', x: 5, y: -5, z: -14, size: 0.9, speed: 0.15, seed: 31 },
]

function FloatingPlanet({ color, x, y, z, size, speed, seed }) {
  const meshRef = useRef()
  const groupRef = useRef()
  const geo = useMemo(() => makeClayBlob(size, 3, 0.06, seed), [size, seed])
  const angleRef = useRef(Math.random() * Math.PI * 2)
  const orbitRadius = useRef(Math.sqrt(x * x + z * z))

  useFrame((state, delta) => {
    // Orbit around center
    angleRef.current += speed * delta * 0.3
    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(angleRef.current) * orbitRadius.current
      groupRef.current.position.z = Math.sin(angleRef.current) * orbitRadius.current
      // Gentle float on Y
      groupRef.current.position.y = y + Math.sin(state.clock.elapsedTime * speed * 0.5) * 0.3
    }
    // Self rotation
    if (meshRef.current) {
      meshRef.current.rotation.y += speed * 0.01
      meshRef.current.rotation.x += speed * 0.005
    }
  })

  return (
    <group ref={groupRef} position={[x, y, z]}>
      <mesh ref={meshRef} geometry={geo}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          roughness={CLAY.roughness}
          metalness={CLAY.metalness}
        />
      </mesh>
    </group>
  )
}

function BackgroundPlanets() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[1]" style={{ filter: 'blur(2px)' }} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.25]}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 3, 5]} intensity={0.8} />
        <pointLight position={[-5, -2, 3]} intensity={0.3} color="#8b5cf6" />
        <Suspense fallback={null}>
          {BG_PLANETS.map((p, i) => (
            <FloatingPlanet key={i} {...p} />
          ))}
        </Suspense>
      </Canvas>
    </div>
  )
}

/* ── CSS-based background for mobile (replaces WebGL Canvas) ───────────────── */
function MobileBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[1]" aria-hidden="true">
      <div className="absolute top-1/4 -left-20 w-64 h-64 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="absolute top-2/3 right-0 w-48 h-48 rounded-full bg-blue-500/[0.08] blur-3xl" />
      <div className="absolute bottom-1/4 left-1/3 w-40 h-40 rounded-full bg-amber-500/[0.06] blur-3xl" />
      <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-emerald-500/[0.05] blur-3xl" />
    </div>
  )
}

/* ── Mobile planet card — vertically stacked ───────────────────────────────── */
function MobilePlanetCard({ planet }) {
  const details = PLANET_DETAILS[planet.id]
  return (
    <Card variant="interactive" className="w-full p-4 flex flex-col gap-3">
      {/* Icon + name row */}
      <div className="flex items-center gap-3">
        <img
          src={PLANET_ICONS[planet.id]}
          alt={planet.label}
          className="w-10 h-10 object-contain"
          draggable={false}
        />
        <h3 className="text-white text-lg font-bold tracking-tight">{planet.label}</h3>
      </div>
      {/* Description */}
      <p className="text-slate-300 text-sm leading-relaxed">
        {PLANET_DESCRIPTIONS[planet.id]?.tagline}
      </p>
      {/* Traits */}
      {details && (
        <div className="flex flex-wrap gap-2">
          {details.traits.map((t) => (
            <span
              key={t}
              className="text-[11px] tracking-[0.12em] uppercase px-3 py-1
                         border border-white/[0.1] text-slate-300 rounded-sm"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ── Mobile vertical planet list ───────────────────────────────────────────── */
function MobilePlanetList() {
  return (
    <section className="relative z-10 px-4 py-12">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] tracking-[0.35em] uppercase text-slate-500 mb-2">
          Seven Planets
        </p>
        <h2 className="text-xl font-bold text-white tracking-tight">
          One for every feeling.
        </h2>
      </div>
      {/* Vertical card stack: full width minus 32px padding (16px on each side from px-4) */}
      <div className="flex flex-col gap-4">
        {PLANETS.map((planet) => (
          <MobilePlanetCard key={planet.id} planet={planet} />
        ))}
      </div>
    </section>
  )
}

/* ── 3D Carousel Scene — all 7 planets in one persistent Canvas ─────────────── */
/**
 * All 7 planets laid out on the X-axis, scrolling WITH the CSS text track.
 *
 * The Canvas is full-width (100%), no clip-path. Each planet sits at the
 * center of the LEFT half of its virtual slide (one viewport width per slide).
 * The group translates at the same rate as the CSS translateX so planets
 * move perfectly in sync with their text panels.
 */
function CarouselScene({ progressRef }) {
  const groupRef = useRef()
  const { viewport } = useThree()
  // Each slide is one full viewport width apart in 3D units
  const SPACING = viewport.width

  useFrame(() => {
    if (!groupRef.current) return
    // Translate the group at the same rate as CSS translateX
    // progress 0→1 maps to 0→(PLANETS.length-1) slides of movement
    groupRef.current.position.x = -(progressRef.current * (PLANETS.length - 1)) * SPACING
  })

  return (
    <group ref={groupRef}>
      {PLANETS.map((planet, i) => (
        // Position each planet at the center of the LEFT half of its slide
        // Slide center = i * SPACING, left-half center = -SPACING/4 from that
        <group key={planet.id} position={[i * SPACING - SPACING / 4, 0, 0]}>
          <CarouselPlanetScene planet={planet} active={true} />
        </group>
      ))}
    </group>
  )
}

/* ── Horizontal scroll driven by vertical scroll (scroll-jacking) ──────────── */
function PlanetCarousel() {
  const trackRef = useRef(null)
  const sectionRef = useRef(null)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const progressRef = useRef(0) // Written by scroll handler, read by useFrame (no re-renders)

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return

    const handleScroll = () => {
      const rect = section.getBoundingClientRect()
      const sectionHeight = section.offsetHeight - window.innerHeight
      const scrolled = -rect.top
      const progress = Math.max(0, Math.min(1, scrolled / sectionHeight))
      const maxTranslate = track.scrollWidth - window.innerWidth
      track.style.transform = `translateX(-${progress * maxTranslate}px)`

      // Update ref for 3D (no re-render)
      progressRef.current = progress
      // Update state for dots only
      setActiveSlideIndex(Math.round(progress * (PLANETS.length - 1)))
    }

    const scrollParent = section.closest('.overflow-y-auto') || window
    const target = scrollParent === window ? window : scrollParent
    target.addEventListener('scroll', handleScroll, { passive: true })
    return () => target.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section ref={sectionRef} className="relative z-10" style={{ height: `${Math.round(PLANETS.length * 57)}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden relative">
        <div className="absolute top-8 left-6 md:left-12 z-10">
          <p className="text-[11px] tracking-[0.35em] uppercase text-slate-500 mb-2">Seven Planets</p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">One for every feeling.</h2>
        </div>

        {/* 3D Canvas — full-width, no clip-path. Planets scroll with the text track. */}
        <Canvas
          dpr={[1, 1.25]}
          camera={{ position: [0, 0, 12], fov: 35 }}
          gl={{ antialias: true, alpha: true }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          <Suspense fallback={null}>
            <CarouselScene progressRef={progressRef} />
          </Suspense>
        </Canvas>

        {/* Horizontal text track — translated by scroll */}
        <div ref={trackRef} className="flex h-full will-change-transform" style={{ width: `${PLANETS.length * 100}vw` }}>
          {PLANETS.map((planet) => (
            <PlanetSlide key={planet.id} planet={planet} />
          ))}
        </div>

        {/* Scroll progress dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {PLANETS.map((p, i) => (
            <div key={p.id} className="w-2 h-2 rounded-full transition-colors duration-300"
                 style={{ background: i === activeSlideIndex ? p.color : p.color + '40' }} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Planet slide — one per screen width ───────────────────────────────────── */
function PlanetSlide({ planet }) {
  const details = PLANET_DETAILS[planet.id]

  return (
    <div className="flex-shrink-0 w-screen h-full
                    flex flex-col md:flex-row items-center justify-center
                    px-8 md:px-20 gap-8 md:gap-16">

      {/* Left half — empty spacer (3D Canvas overlays this area) */}
      <div className="w-full md:w-1/2 h-[40vh] md:h-[70vh]" />

      {/* Info panel — on the right */}
      <div className="w-full md:w-1/2 max-w-md flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <img src={PLANET_ICONS[planet.id]} alt="" className="w-8 h-8 object-contain" draggable={false} />
          <h3 className="text-white text-2xl md:text-3xl font-bold tracking-tight">{planet.label}</h3>
        </div>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed">
          {PLANET_DESCRIPTIONS[planet.id]?.tagline}
        </p>
        {details && (
          <>
            <p className="text-slate-400 text-sm leading-relaxed">
              {PLANET_DESCRIPTIONS[planet.id]?.purpose}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {details.traits.map((t) => (
                <span key={t} className="text-[11px] tracking-[0.12em] uppercase px-3 py-1
                                         border border-white/[0.1] text-slate-300 rounded-sm">
                  {t}
                </span>
              ))}
            </div>
            <blockquote className="text-slate-500 text-sm italic leading-relaxed mt-2 border-l-2 border-white/[0.08] pl-3">
              {details.quote}
            </blockquote>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Main ──────────────────────────────────────────────────────────────────── */
export default function LandingScreen() {
  const setPhase = useAppStore((s) => s.setPhase)
  const isSmallScreen = useIsSmallScreen()

  return (
    <div
      className="w-full h-full overflow-y-auto overflow-x-hidden scroll-smooth animate-fade-in"
      style={{
        background: '#050510',
        // Prevent pull-to-refresh / rubber-band on scroll container (Req 20.4)
        overscrollBehaviorY: 'none',
      }}
    >
      <Particles />
      {isSmallScreen ? <MobileBackground /> : <BackgroundPlanets />}

      {/* ═══════ HERO ═══════ */}
      <section
        className={`relative z-10 flex flex-col items-center justify-center px-6
                    ${isSmallScreen ? 'min-h-[100dvh] py-12' : 'min-h-screen py-20'}`}
      >
        {/* Eyebrow */}
        <p className="text-[11px] tracking-[0.35em] uppercase text-slate-500 mb-6">
          {HERO.eyebrow}
        </p>

        {/* Massive headline — responsive font sizing */}
        <h1 className="text-center leading-[0.9] tracking-tight">
          <span
            className="block font-bold text-white md:text-8xl lg:text-9xl"
            style={{ fontSize: isSmallScreen ? 'clamp(2.5rem, 10vw, 4rem)' : undefined }}
          >
            Speak
          </span>
          <span
            className="block font-bold text-white md:text-8xl lg:text-9xl"
            style={{ fontSize: isSmallScreen ? 'clamp(2.5rem, 10vw, 4rem)' : undefined }}
          >
            With<img
              src="/icons/logo.png"
              alt="o"
              className="inline h-[1.1em] w-[1.1em] object-contain"
              style={{ verticalAlign: 'middle', margin: '0 -0.15em', position: 'relative', top: '-0.03em' }}
              draggable={false}
            />ut
          </span>
          <span
            className="block font-bold text-violet-400 md:text-8xl lg:text-9xl"
            style={{ fontSize: isSmallScreen ? 'clamp(2.5rem, 10vw, 4rem)' : undefined }}
          >
            Fear
          </span>
        </h1>

        {/* Sub */}
        <p className="mt-8 text-slate-400 text-sm md:text-base max-w-md text-center leading-relaxed font-light">
          {HERO.subtitle}
        </p>

        {/* CTA — outline button using Button primitive */}
        <Button
          variant="primary"
          onClick={() => setPhase('auth')}
          className="mt-10 px-8 py-3.5"
        >
          Enter Space
        </Button>

        {/* Scroll line — only show on desktop */}
        {!isSmallScreen && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <div className="w-px h-10 bg-gradient-to-b from-transparent to-white/20" />
          </div>
        )}
      </section>

      {/* ═══════ PLANET SHOWCASE ═══════ */}
      {isSmallScreen ? <MobilePlanetList /> : <PlanetCarousel />}

      {/* ═══════ STATEMENT ═══════ */}
      <section className={`relative z-10 px-6 border-t border-white/[0.04]
                           ${isSmallScreen ? 'py-12' : 'py-24 md:py-36'}`}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[11px] tracking-[0.35em] uppercase text-slate-500 mb-6">
            {STATEMENT.eyebrow}
          </p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug">
            {STATEMENT.headline}
          </h2>
          <p className="mt-6 text-slate-500 text-sm leading-relaxed max-w-lg mx-auto">
            {STATEMENT.subtitle}
          </p>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className={`relative z-10 px-6 border-t border-white/[0.04]
                           ${isSmallScreen ? 'py-12' : 'py-28 md:py-40'}`}>
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[11px] tracking-[0.35em] uppercase text-slate-500 mb-6">
            {CTA.eyebrow}
          </p>
          <h2 className={`font-bold text-white tracking-tight leading-[0.95]
                          ${isSmallScreen ? 'text-2xl' : 'text-3xl sm:text-4xl md:text-5xl'}`}>
            {CTA.headline}
          </h2>
          <Button
            variant="primary"
            onClick={() => setPhase('auth')}
            className="mt-10 px-10 py-4"
          >
            {CTA.buttonLabel}
          </Button>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="relative z-10 px-6 py-8 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center
                        justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/icons/logo.png" alt="" className="w-6 h-6 opacity-60" draggable={false} />
            <span className="text-[10px] tracking-[0.2em] uppercase text-slate-600 ui-label">
              AnonEmote © 2026
            </span>
          </div>
          <div className="flex items-center gap-6 text-[10px] tracking-[0.15em] uppercase text-slate-600 ui-label">
            <span>In crisis? Call <strong className="text-slate-400">1553</strong></span>
          </div>
        </div>
      </footer>
    </div>
  )
}
