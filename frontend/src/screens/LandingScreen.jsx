import React, { useRef, useEffect } from 'react'
import useAppStore from '../store/useAppStore'

/**
 * Landing Screen — The entry point.
 * Full-screen animated star field with the AnonEmote brand and CTA.
 */
export default function LandingScreen() {
  const setPhase = useAppStore((s) => s.setPhase)
  const canvasRef = useRef(null)

  // Draw a simple procedural starfield on a 2D canvas (lightweight, no Three.js overhead yet)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Generate stars
    const stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.2,
      opacity: Math.random(),
      speed: Math.random() * 0.3 + 0.05,
      twinkleOffset: Math.random() * Math.PI * 2,
    }))

    let t = 0
    const draw = () => {
      t += 0.008
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Deep space gradient
      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.8
      )
      grad.addColorStop(0, '#1a1a3e')
      grad.addColorStop(1, '#0a0a1a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Stars with twinkle
      stars.forEach((star) => {
        const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * star.speed + star.twinkleOffset))
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${twinkle * star.opacity})`
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* Starfield background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      />

      {/* Nebula glow accents */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-indigo-500/5 blur-2xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center animate-fade-in">
        {/* Logo star */}
        <div className="text-7xl animate-float" role="img" aria-label="AnonEmote star">
          ✦
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            <span className="text-white">Anon</span>
            <span className="text-violet-400 glow-text">Emote</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-md font-light leading-relaxed">
            A safe, anonymous space to express what you feel — without judgment, without identity.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          {[
            { icon: '🔒', label: 'Zero-Knowledge Anonymous' },
            { icon: '🌍', label: 'AI-Moderated Safety' },
            { icon: '🪐', label: '3D Emotional Space' },
          ].map(({ icon, label }) => (
            <span
              key={label}
              className="glass px-3 py-1.5 rounded-full text-slate-300 text-xs font-medium"
            >
              {icon} {label}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => setPhase('avatar')}
          className="mt-2 px-10 py-4 rounded-2xl text-white font-semibold text-lg
                     bg-gradient-to-r from-violet-600 to-indigo-600
                     hover:from-violet-500 hover:to-indigo-500
                     transition-all duration-300 ease-out
                     shadow-lg shadow-violet-900/40
                     animate-pulse-glow
                     focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-transparent"
          aria-label="Enter the AnonEmote space"
        >
          ✦ Enter Space
        </button>

        <p className="text-slate-600 text-xs">
          No sign-up required. No data stored about you.
        </p>
      </div>

      {/* Crisis line footer */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
        <p className="glass px-4 py-2 rounded-full text-xs text-slate-500">
          🆘 In crisis? Call <strong className="text-slate-400">HOPELINE 8804-4673</strong> (PH)
        </p>
      </div>
    </div>
  )
}
