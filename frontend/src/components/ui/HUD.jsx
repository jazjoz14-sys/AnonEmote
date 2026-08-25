import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { useIsSmallScreen } from '../../lib/device'
import { useOrientation } from '../../lib/viewport'
import PrivateNotesPanel from './PrivateNotesPanel'
import SettingsPanel from './SettingsPanel'

/**
 * HUD — minimal overlay on the SpaceScreen.
 *
 * Design tokens applied:
 *   - Uppercase micro-labels (text-[10px]/text-[11px], uppercase, tracking-[0.15em])
 *   - Outline-only buttons: 1px border border-white/30, no fill, text-white, rounded-sm
 *   - Monochrome palette with emerald (#10b981) ONLY for presence indicator dot
 *   - focus-visible: 2px white/70 outline offset by 2px on all interactive buttons
 *   - Guest indicator: "Viewing as guest" text-[10px] text-slate-500 when not authenticated
 *
 * Responsive sizing:
 *   Mobile (< 768px): total height ≤ 40px (including safe-area-inset-top)
 *   Landscape mobile: total height ≤ 32px (including safe-area-inset-top)
 *   Desktop (≥ 768px): 16px v-padding, 24px h-padding
 *
 * Mobile buttons: 44×44px tap area via invisible padding extenders.
 */
export default function HUD({ peerCount = 0 }) {
  const { setPhase, privateNotes, onboarding, startOnboarding, isAuthenticated, openEvaluationModal } = useAppStore()
  const [notesOpen, setNotesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isMobile = useIsSmallScreen()
  const { isLandscape } = useOrientation()

  // Landscape on mobile: extra compact
  const isLandscapeMobile = isMobile && isLandscape

  return (
    <>
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div
        className={`fixed top-0 left-0 right-0 z-[20] flex items-center justify-between
          ${isLandscapeMobile
            ? 'px-3 py-1'
            : isMobile
              ? 'px-3 py-2'
              : 'px-6 py-4'
          }
        `}
        style={{
          paddingTop: isLandscapeMobile
            ? 'calc(4px + env(safe-area-inset-top, 0px))'
            : isMobile
              ? 'calc(8px + env(safe-area-inset-top, 0px))'
              : 'calc(16px + env(safe-area-inset-top, 0px))',
          maxHeight: isLandscapeMobile
            ? '32px'
            : isMobile
              ? '40px'
              : undefined,
        }}
      >
        {/* Left: back + notes */}
        <div className="flex items-center gap-2">
          {/* Back button — outline-only, uppercase micro-label */}
          <button
            onClick={() => setPhase('avatar')}
            className={`relative rounded-sm uppercase tracking-[0.15em]
              text-white border border-white/30
              hover:text-white hover:bg-white/[0.05] transition-all duration-200
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
              ${isMobile
                ? 'px-2 py-1 text-[10px]'
                : 'px-3 py-1.5 text-xs'
              }
            `}
            aria-label="Back to avatar"
          >
            {/* Invisible tap target extender for mobile (44×44px) */}
            {isMobile && (
              <span
                className="absolute inset-0 -m-2"
                style={{ minWidth: '44px', minHeight: '44px' }}
                aria-hidden="true"
              />
            )}
            ← Back
          </button>

          {privateNotes.length > 0 && (
            <button
              onClick={() => setNotesOpen((v) => !v)}
              className={`relative rounded-sm uppercase tracking-[0.15em]
                text-white border border-white/30
                hover:text-white hover:bg-white/[0.05] transition-all duration-200
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
                ${isMobile
                  ? 'px-2 py-1 text-[10px]'
                  : 'px-3 py-1.5 text-xs'
                }
              `}
              aria-label="My private notes"
            >
              {isMobile && (
                <span
                  className="absolute inset-0 -m-2"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  aria-hidden="true"
                />
              )}
              🔒 {privateNotes.length}
            </button>
          )}
        </div>

        {/* Centre: logo + online + guest indicator */}
        <div className="flex items-center gap-2 md:gap-3">
          <img
            src="/icons/logo.png"
            alt="AnonEmote"
            className={isMobile ? 'w-5 h-5 opacity-70' : 'w-6 h-6 opacity-70'}
            draggable={false}
          />
          {peerCount > 0 && (
            <span className={`flex items-center gap-1 text-emerald-400 tracking-[0.05em]
              ${isMobile ? 'text-[10px] gap-1' : 'text-xs gap-1.5'}
            `}>
              {/* Emerald presence dot — the only accent color in HUD */}
              <span
                className={`rounded-full bg-emerald-400 animate-pulse
                  ${isMobile ? 'w-1 h-1' : 'w-1.5 h-1.5'}
                `}
              />
              {peerCount + 1} online
            </span>
          )}
          {/* Guest read-only indicator (Req 17.1) — only shown when not authenticated */}
          {!isAuthenticated && (
            <span className="text-[10px] text-slate-500 uppercase tracking-[0.1em]">
              Viewing as guest
            </span>
          )}
        </div>

        {/* Right: settings gear + help button */}
        <div className={`flex items-center gap-2`}>
          {/* Feedback button — passive entry point to evaluation modal (authenticated only) */}
          {isAuthenticated && (
            <button
              onClick={openEvaluationModal}
              className={`relative rounded-full uppercase tracking-[0.15em]
                text-white border border-white/30
                hover:text-white hover:bg-white/[0.05] transition-all duration-200
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
                flex items-center justify-center
                ${isMobile
                  ? 'w-7 h-7 text-[11px]'
                  : 'w-8 h-8 text-sm'
                }
              `}
              aria-label="Share feedback"
              title="Share feedback"
            >
              {isMobile && (
                <span
                  className="absolute inset-0 -m-2"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  aria-hidden="true"
                />
              )}
              {/* Chat bubble icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          )}

          {/* Gear icon — opens Graphics Settings panel */}
          <button
            onClick={() => setSettingsOpen(true)}
            className={`relative rounded-full uppercase tracking-[0.15em]
              text-white border border-white/30
              hover:text-white hover:bg-white/[0.05] transition-all duration-200
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
              flex items-center justify-center
              ${isMobile
                ? 'w-7 h-7 text-[11px]'
                : 'w-8 h-8 text-sm'
              }
            `}
            aria-label="Graphics settings"
            title="Graphics settings"
          >
            {/* Invisible tap target extender for mobile (44×44px) */}
            {isMobile && (
              <span
                className="absolute inset-0 -m-2"
                style={{ minWidth: '44px', minHeight: '44px' }}
                aria-hidden="true"
              />
            )}
            {/* Gear icon SVG */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {!onboarding.active && (
            <button
              onClick={() => startOnboarding()}
              className={`relative rounded-full uppercase tracking-[0.15em]
                text-white border border-white/30
                hover:text-white hover:bg-white/[0.05] transition-all duration-200
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
                flex items-center justify-center
                ${isMobile
                  ? 'w-7 h-7 text-[11px]'
                  : 'w-8 h-8 text-sm'
                }
              `}
              aria-label="Replay onboarding tutorial"
              title="Help — replay tutorial"
            >
              {/* Invisible tap target extender for mobile (44×44px) */}
              {isMobile && (
                <span
                  className="absolute inset-0 -m-2"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  aria-hidden="true"
                />
              )}
              ?
            </button>
          )}
        </div>
      </div>

      {/* Private notes panel */}
      {notesOpen && <PrivateNotesPanel onClose={() => setNotesOpen(false)} />}

      {/* Graphics settings panel */}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
