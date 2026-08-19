import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { useIsSmallScreen } from '../../lib/device'
import { useOrientation } from '../../lib/viewport'
import PrivateNotesPanel from './PrivateNotesPanel'

/**
 * HUD — minimal overlay on the SpaceScreen.
 *
 * OkayDev-inspired: minimal chrome, uppercase micro-labels, border-only
 * buttons, monochrome with one accent. The 3D scene is the star — the UI
 * stays out of the way.
 *
 * Responsive sizing:
 *   Mobile (< 768px): 8px v-padding, 12px h-padding, 20×20 logo, 10px font,
 *     hide right spacer, justify-between, total height ≤ 40px
 *   Desktop (≥ 768px): 16px v-padding, 24px h-padding, 24×24 logo, 6×6 pulse dot
 *   Landscape: 4px v-padding, total height ≤ 32px
 *
 * All viewports: padding-top includes env(safe-area-inset-top, 0px)
 * Mobile back button: 44×44px tap area via invisible padding
 */
export default function HUD({ peerCount = 0 }) {
  const { setPhase, privateNotes, onboarding, startOnboarding } = useAppStore()
  const [notesOpen, setNotesOpen] = useState(false)
  const isMobile = useIsSmallScreen()
  const { isLandscape } = useOrientation()

  // Landscape on mobile: extra compact
  const isLandscapeMobile = isMobile && isLandscape

  return (
    <>
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div
        className={`fixed top-0 left-0 right-0 z-[20] flex items-center
          ${isMobile ? 'justify-between' : 'justify-between'}
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
          {/* Back button — mobile uses 44×44 tap area with invisible padding */}
          <button
            onClick={() => setPhase('avatar')}
            className={`relative rounded-sm uppercase tracking-[0.1em]
              text-slate-300 border border-white/[0.15]
              hover:text-white hover:border-white/30 transition-all
              ${isMobile
                ? 'px-2 py-1 text-[10px]'
                : 'px-3 py-1.5 text-xs'
              }
            `}
            style={isMobile ? {
              // Invisible padding to reach 44×44px tap target
              // The visible button is small; we extend tap area with ::before
            } : undefined}
            aria-label="Back to avatar"
          >
            {/* Invisible tap target extender for mobile */}
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
              className={`relative rounded-sm uppercase tracking-[0.1em]
                text-slate-300 border border-white/[0.15]
                hover:text-white hover:border-white/30 transition-all
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

        {/* Centre: logo + online */}
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
              <span
                className={`rounded-full bg-emerald-400 animate-pulse
                  ${isMobile ? 'w-1 h-1' : 'w-1.5 h-1.5'}
                `}
              />
              {peerCount + 1} online
            </span>
          )}
        </div>

        {/* Right: help button for onboarding re-access */}
        <div className={`flex items-center ${isMobile ? '' : 'w-16 justify-end'}`}>
          {!onboarding.active && (
            <button
              onClick={() => startOnboarding()}
              className={`relative rounded-full uppercase tracking-[0.1em]
                text-slate-300 border border-white/[0.15]
                hover:text-white hover:border-white/30 transition-all
                flex items-center justify-center
                ${isMobile
                  ? 'w-7 h-7 text-[11px]'
                  : 'w-8 h-8 text-sm'
                }
              `}
              aria-label="Replay onboarding tutorial"
              title="Help — replay tutorial"
            >
              {/* Invisible tap target extender for mobile */}
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
    </>
  )
}
