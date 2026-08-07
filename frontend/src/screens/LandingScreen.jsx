import React from 'react'
import useAppStore from '../store/useAppStore'

/**
 * LandingScreen — Discord-inspired landing page.
 *
 * Full-height hero with bold typography and a strong CTA, followed by
 * scrollable feature sections that explain what AnonEmote does. Visual style
 * borrows the clean, punchy layout of Discord's landing while staying in
 * the project's space/violet palette.
 */
export default function LandingScreen() {
  const setPhase = useAppStore((s) => s.setPhase)

  return (
    <div className="w-full h-full overflow-y-auto scroll-smooth">

      {/* ═══════════════════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center
                          px-6 py-20 overflow-hidden"
               style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f0a2a 50%, #0a0a1a 100%)' }}>

        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full
                          bg-violet-600/20 blur-[120px]" />
          <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full
                          bg-indigo-500/15 blur-[140px]" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full
                          bg-blue-500/10 blur-[100px]" />
          {/* Floating decorative stars */}
          <div className="absolute top-20 left-[15%] text-4xl opacity-20 animate-float">✦</div>
          <div className="absolute top-40 right-[20%] text-2xl opacity-15 animate-float"
               style={{ animationDelay: '1s' }}>✦</div>
          <div className="absolute bottom-32 left-[25%] text-3xl opacity-20 animate-float"
               style={{ animationDelay: '2s' }}>✦</div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center
                        gap-8 text-center animate-fade-in">

          {/* Badge */}
          <div className="glass px-4 py-1.5 rounded-full text-xs text-slate-300 font-medium
                          flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            A safe space for university students
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight">
            <span className="text-white">Express freely.</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400
                             bg-clip-text text-transparent">
              Stay anonymous.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed font-light">
            AnonEmote is a 3D emotional space where you can share what you truly feel
            — without names, without judgement, without fear. Just you and the stars.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <button
              onClick={() => setPhase('avatar')}
              className="px-10 py-4 rounded-full text-white font-semibold text-lg
                         bg-gradient-to-r from-violet-600 to-indigo-600
                         hover:from-violet-500 hover:to-indigo-500
                         hover:scale-105 active:scale-[0.98]
                         transition-all duration-200
                         shadow-xl shadow-violet-900/40"
            >
              Enter Space — it's free
            </button>
            <a
              href="#features"
              className="px-8 py-4 rounded-full text-white font-semibold text-lg
                         glass hover:bg-white/10 transition-all duration-200"
            >
              Learn more ↓
            </a>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="text-violet-400">🔒</span> Zero accounts, zero data
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-violet-400">🤖</span> AI-moderated safety
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-violet-400">🌍</span> Multilingual support
            </span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center
                        gap-2 opacity-50 animate-bounce">
          <span className="text-xs text-slate-500">Scroll</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-slate-500">
            <path d="M10 4v12M4 10l6 6 6-6" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURE SECTIONS
          ═══════════════════════════════════════════════════════════════════ */}
      <div id="features" className="bg-[#0a0a1a]">

        {/* Feature 1: Express */}
        <FeatureSection
          eyebrow="No judgement"
          title="Say what you actually feel"
          description="Choose an emotion planet that matches your state — joy, anxiety, grief, venting, or just quiet reflection. Write freely behind complete anonymity, or draw it if words aren't enough."
          visual={
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {['✨ Joy', '🌧️ Vent', '🌿 Advice', '🌑 Grief', '🌀 Anxiety', '🎨 Doodle'].map((p) => (
                <div key={p} className="glass rounded-2xl p-4 text-center text-sm text-slate-300
                                        hover:bg-white/10 transition-all">
                  {p}
                </div>
              ))}
            </div>
          }
          reverse={false}
          bg="bg-gradient-to-b from-[#0a0a1a] to-[#10102a]"
        />

        {/* Feature 2: Safe */}
        <FeatureSection
          eyebrow="AI-powered"
          title="Protected by a hybrid moderation engine"
          description="Every post passes through a three-layer AI system — crisis detection across English, Tagalog and Bicolano, Google Perspective ML scoring, and a community report system. Toxic content is blocked before it reaches anyone."
          visual={
            <div className="flex flex-col gap-2 max-w-sm mx-auto text-sm">
              <LayerBar label="Crisis detection" color="bg-violet-500" width="95%" />
              <LayerBar label="Vernacular filter" color="bg-blue-500" width="80%" />
              <LayerBar label="Perspective AI" color="bg-emerald-500" width="90%" />
              <LayerBar label="Community reports" color="bg-amber-500" width="70%" />
            </div>
          }
          reverse={true}
          bg="bg-[#10102a]"
        />

        {/* Feature 3: Anonymous */}
        <FeatureSection
          eyebrow="Zero-knowledge"
          title="No account. No name. No trace."
          description="You get a random session ID that disappears the moment you close the tab. No email, no login, no student number. Even administrators cannot identify who wrote what — only that it was safe to publish."
          visual={
            <div className="glass rounded-2xl p-6 max-w-xs mx-auto text-center">
              <div className="font-mono text-2xl text-violet-300 mb-2">4BE9••••</div>
              <p className="text-xs text-slate-500">Your identity is a random number<br/>that expires when you leave</p>
              <div className="mt-4 flex justify-center gap-2">
                <span className="px-2 py-1 rounded bg-red-900/30 text-red-300 text-xs line-through">Email</span>
                <span className="px-2 py-1 rounded bg-red-900/30 text-red-300 text-xs line-through">Name</span>
                <span className="px-2 py-1 rounded bg-red-900/30 text-red-300 text-xs line-through">Password</span>
              </div>
            </div>
          }
          reverse={false}
          bg="bg-gradient-to-b from-[#10102a] to-[#0d0d22]"
        />

        {/* Feature 4: 3D */}
        <FeatureSection
          eyebrow="Immersive"
          title="A star system, not a feed"
          description="No infinite scroll. No likes. No follower counts. Instead, a navigable 3D solar system where each planet holds a different emotional state. See other anonymous avatars drifting around in real time."
          visual={
            <div className="flex flex-col items-center gap-3">
              <div className="text-6xl animate-float">🪐</div>
              <div className="flex gap-2">
                {['⬤', '◆', '❋', '◎'].map((s, i) => (
                  <div key={i} className="w-10 h-10 rounded-full glass flex items-center
                                          justify-center text-lg"
                       style={{ color: ['#C4B5FD','#A7F3D0','#FEF08A','#FBCFE8'][i] }}>
                    {s}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">Choose your abstract avatar</p>
            </div>
          }
          reverse={true}
          bg="bg-[#0d0d22]"
        />

        {/* Feature 5: Crisis */}
        <FeatureSection
          eyebrow="When it matters most"
          title="If you're struggling, we care"
          description="If the AI detects you might be in crisis, your words are never deleted. You're shown emergency hotlines and given the choice: keep writing, save privately, or let go. Your safety comes first — always."
          visual={
            <div className="glass rounded-2xl p-6 max-w-xs mx-auto border border-violet-500/30">
              <div className="text-3xl text-center mb-3">💙</div>
              <p className="text-sm text-slate-300 text-center leading-relaxed">
                "That sounds really heavy. What you wrote stays with you."
              </p>
              <div className="mt-4 flex flex-col gap-1.5">
                <div className="glass rounded-lg px-3 py-2 text-xs text-violet-300 flex justify-between">
                  <span>NCMH Crisis Hotline</span>
                  <span className="font-mono font-bold">1553</span>
                </div>
                <div className="glass rounded-lg px-3 py-2 text-xs text-violet-300 flex justify-between">
                  <span>HOPELINE PH</span>
                  <span className="font-mono font-bold">8804-4673</span>
                </div>
              </div>
            </div>
          }
          reverse={false}
          bg="bg-gradient-to-b from-[#0d0d22] to-[#0a0a1a]"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative py-24 px-6 text-center overflow-hidden"
               style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0a0a1a 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full
                          bg-violet-600/15 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
            Ready to speak without fear?
          </h2>
          <p className="text-slate-400 text-lg">
            No signup. No data collected. Just enter.
          </p>
          <button
            onClick={() => setPhase('avatar')}
            className="px-12 py-5 rounded-full text-white font-semibold text-xl
                       bg-gradient-to-r from-violet-600 to-indigo-600
                       hover:from-violet-500 hover:to-indigo-500
                       hover:scale-105 active:scale-[0.98]
                       transition-all duration-200
                       shadow-xl shadow-violet-900/40"
          >
            ✦ Enter Space
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════════════════ */}
      <footer className="bg-[#07070f] border-t border-white/5 py-10 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center
                        justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-lg">✦</span>
            <span>AnonEmote — Capstone Project 2026</span>
          </div>
          <div className="flex gap-4">
            <span>🆘 In crisis? Call <strong className="text-slate-400">1553</strong></span>
            <a href="/#admin" className="hover:text-slate-400 transition-colors">Admin</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ── Feature section layout ────────────────────────────────────────────────── */

function FeatureSection({ eyebrow, title, description, visual, reverse, bg }) {
  return (
    <section className={`py-20 md:py-28 px-6 ${bg}`}>
      <div className={`max-w-5xl mx-auto flex flex-col gap-12
                        ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'}
                        items-center`}>
        {/* Text */}
        <div className="flex-1 flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
            {eyebrow}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-snug">
            {title}
          </h2>
          <p className="text-slate-400 leading-relaxed text-lg">
            {description}
          </p>
        </div>

        {/* Visual */}
        <div className="flex-1 flex items-center justify-center">
          {visual}
        </div>
      </div>
    </section>
  )
}

/* ── Moderation layer bar ──────────────────────────────────────────────────── */

function LayerBar({ label, color, width }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 w-32 text-right text-xs">{label}</span>
      <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-1000`}
             style={{ width }} />
      </div>
    </div>
  )
}
