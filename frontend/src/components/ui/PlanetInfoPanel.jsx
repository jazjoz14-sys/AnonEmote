import React, { useMemo, useEffect, useState, useRef } from 'react'
import useAppStore from '../../store/useAppStore'
import useDraggable from '../../hooks/useDraggable'
import ReactionBar from './ReactionBar'
import ReplyThread from './ReplyThread'
import BottomSheet from './BottomSheet'
import AuthPromptModal from '../modals/AuthPromptModal'
import { apiFetch } from '../../lib/api'
import { useIsSmallScreen, useViewportSize } from '../../lib/device'
import { useOrientation } from '../../lib/viewport'
import { isHintDismissed, dismissHint, HINT_GUEST_PROMPT } from '../../lib/hintStore'

/**
 * PlanetInfoPanel — displays recent posts for the selected planet.
 *
 * Mobile (< 768px): renders as a BottomSheet with bounded height, fade gradient,
 * scroll isolation, and compact sizing per the responsive PWA layout spec.
 *
 * Landscape: side panel on right edge (45% max width, full available height).
 *
 * Desktop (≥ 768px): draggable floating panel (unchanged from original).
 */
export default function PlanetInfoPanel({ postsLoading = false, maxHeight }) {
  const isSmallScreen = useIsSmallScreen()
  const { width: viewportWidth, height: viewportHeight } = useViewportSize()
  const { isLandscape } = useOrientation()
  const panelWidth = isSmallScreen ? Math.min(360, viewportWidth - 16) : 320

  const {
    selectedPlanet,
    setSelectedPlanet,
    setPostModalOpen,
    posts,
    sessionId,
    mergeReactions,
    isAuthenticated,
    isOffline,
    postModalOpen,
    setPendingPlanetId,
  } = useAppStore()
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const feedRef = useRef(null)
  const [hasOverflow, setHasOverflow] = useState(false)

  /** Show guest prompt only if not previously dismissed in this session */
  const handleBroadcastClick = () => {
    if (isAuthenticated) {
      setPostModalOpen(true)
    } else {
      // Save the selected planet so AuthScreen can navigate back to 'space' after login
      if (selectedPlanet?.id) {
        setPendingPlanetId(selectedPlanet.id)
      }
      setShowAuthPrompt(true)
    }
  }

  /** Dismiss the guest prompt and persist to hint store */
  const handleDismissAuthPrompt = () => {
    setShowAuthPrompt(false)
    dismissHint(HINT_GUEST_PROMPT)
  }

  const { position, isDragging, dragProps, handleProps } = useDraggable({
    width: panelWidth,
    height: 480,
    initial: isSmallScreen
      ? { x: 8, y: Math.max(60, viewportHeight - 420) }
      : {
          x: Math.max(12, viewportWidth - panelWidth - 24),
          y: Math.max(12, viewportHeight / 2 - 240),
        },
  })

  const planetPosts = useMemo(
    () => posts.filter((p) => p.planet_id === selectedPlanet?.id).slice(0, 20),
    [posts, selectedPlanet]
  )

  const postIdsKey = useMemo(
    () => planetPosts.map((p) => p.id).join(','),
    [planetPosts]
  )

  // Fetch reaction counts for the posts currently listed
  useEffect(() => {
    if (!postIdsKey || !sessionId) return

    const params = new URLSearchParams({ post_ids: postIdsKey, session_id: sessionId })

    let cancelled = false
    apiFetch(`/api/reactions?${params}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((summary) => { if (!cancelled) mergeReactions(summary) })
      .catch((err) => console.error('[PlanetInfoPanel] reactions', err))

    return () => { cancelled = true }
  }, [postIdsKey, sessionId, mergeReactions])

  // Detect overflow in the post feed to show/hide fade gradient
  useEffect(() => {
    const el = feedRef.current
    if (!el) return
    const check = () => {
      setHasOverflow(el.scrollHeight > el.clientHeight)
    }
    check()
    // Re-check on resize
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [planetPosts, selectedPlanet])

  if (!selectedPlanet) return null

  // ── Mobile layout: BottomSheet wrapper ──────────────────────────────────
  if (isSmallScreen) {
    return (
      <>
        <BottomSheet
          open={!!selectedPlanet}
          onClose={() => setSelectedPlanet(null)}
          zIndex={30}
          maxHeight={maxHeight}
          landscape={isLandscape}
        >
          <div
            className="flex flex-col h-full"
            style={{
              padding: '12px',
              gap: '8px',
              border: `1px solid ${selectedPlanet.color}44`,
              borderBottom: 'none',
              borderRadius: isLandscape ? '0' : undefined,
              // When PostModal is stacked above, hide content + disable pointer events
              ...(postModalOpen ? { pointerEvents: 'none', opacity: 0.4 } : {}),
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* ── Header row: ≤ 40px ── */}
            <div className="flex items-center justify-between gap-2 shrink-0" style={{ maxHeight: '40px' }}>
              <div className="flex items-center gap-2 min-w-0">
                <span style={{ fontSize: '16px', lineHeight: 1 }}>{selectedPlanet.emoji}</span>
                <div className="min-w-0">
                  <h3 className="font-bold text-white truncate" style={{ fontSize: '14px', lineHeight: '1.2' }}>
                    {selectedPlanet.label}
                  </h3>
                  <p className="text-slate-400 truncate" style={{ fontSize: '11px', lineHeight: '1.2' }}>
                    {selectedPlanet.description}
                  </p>
                </div>
              </div>
              {/* Close button: 44×44px tap area, 24×24px visual */}
              <button
                onClick={() => setSelectedPlanet(null)}
                className="shrink-0 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                style={{
                  width: '44px',
                  height: '44px',
                  minWidth: '44px',
                  minHeight: '44px',
                }}
                aria-label="Close panel"
              >
                <span style={{ fontSize: '24px', lineHeight: 1, width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✕
                </span>
              </button>
            </div>

            {/* ── Broadcast button: 44×44px effective tap target ── */}
            <button
              onClick={handleBroadcastClick}
              data-onboarding="broadcast-btn"
              className="w-full rounded-sm tracking-[0.1em] uppercase font-medium
                         text-white border border-white/30
                         hover:bg-white hover:text-[#050510] transition-all shrink-0"
              style={{
                paddingTop: '10px',
                paddingBottom: '10px',
                fontSize: '11px',
                minHeight: '44px',
              }}
            >
              + Broadcast to {selectedPlanet.label}
            </button>

            {/* ── Post feed: fills remaining space, scrolls vertically ── */}
            <div className="flex-1 min-h-0 relative">
              <div
                ref={feedRef}
                className="h-full overflow-y-auto flex flex-col gap-2"
                style={{
                  overscrollBehaviorY: 'contain',
                  paddingBottom: hasOverflow ? '32px' : '0',
                }}
              >
                {/* Offline message */}
                {isOffline && planetPosts.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">
                    You're offline. Posts will load when connectivity returns.
                  </p>
                ) : planetPosts.length === 0 ? (
                  postsLoading ? (
                    <p className="text-slate-500 text-sm text-center py-4">
                      Loading posts...
                    </p>
                  ) : (
                    <div className="text-center py-6 flex flex-col items-center gap-2">
                      <span className="text-2xl">{selectedPlanet.emoji}</span>
                      <p className="text-slate-400 text-sm font-medium">
                        No posts yet
                      </p>
                      <p className="text-slate-500 text-xs leading-relaxed max-w-[200px]">
                        Be the first to broadcast to {selectedPlanet.label}!
                      </p>
                    </div>
                  )
                ) : (
                  planetPosts.map((post) => (
                    <div
                      key={post.id}
                      className="glass rounded-xl px-3 py-2.5 text-sm text-slate-300"
                      style={{ borderLeft: `2px solid ${selectedPlanet.color}66` }}
                    >
                      {post.drawing ? (
                        <img
                          src={post.drawing}
                          alt="Anonymous doodle"
                          className="w-full rounded-lg"
                          loading="lazy"
                        />
                      ) : (
                        <p className="break-words">{post.content}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(post.created_at).toLocaleTimeString([], {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      <ReactionBar post={post} accentColor={selectedPlanet.color} />
                      <ReplyThread post={post} accentColor={selectedPlanet.color} />
                    </div>
                  ))
                )}
              </div>

              {/* 32px bottom fade gradient when content overflows */}
              {hasOverflow && (
                <div
                  className="pointer-events-none absolute bottom-0 left-0 right-0"
                  style={{
                    height: '32px',
                    background: 'linear-gradient(to top, #0d0d2b, transparent)',
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
        </BottomSheet>

        {/* Auth prompt modal (mobile) — uses the proper AuthPromptModal component */}
        <AuthPromptModal
          open={showAuthPrompt}
          onClose={handleDismissAuthPrompt}
          planetContext={selectedPlanet?.label || selectedPlanet?.id}
        />
      </>
    )
  }

  // ── Desktop: draggable floating panel (unchanged) ───────────────────────
  return (
    <>
    <div
      className="fixed z-30 glass-dark rounded-3xl p-5 flex flex-col gap-4"
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        touchAction: 'none',
        left: position.x,
        top: position.y,
        width: panelWidth,
        maxHeight: '75vh',
        border: `1px solid ${selectedPlanet.color}44`,
        boxShadow: isDragging
          ? '0 30px 60px -12px rgba(0,0,0,0.9)'
          : '0 20px 40px -12px rgba(0,0,0,0.7)',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* ── Drag handle / header ─────────────────────────────────────────── */}
      <div
        {...handleProps}
        className="flex items-start justify-between gap-2 -m-1 p-1 rounded-xl
                   select-none focus:outline-none focus:ring-1 focus:ring-violet-500/50"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-500 text-base leading-none shrink-0" aria-hidden="true">
            ⠿
          </span>
          <span className="text-2xl shrink-0">{selectedPlanet.emoji}</span>
          <div className="min-w-0">
            <h3 className="font-bold text-white truncate">{selectedPlanet.label}</h3>
            <p className="text-xs text-slate-400 line-clamp-2">
              {selectedPlanet.description}
            </p>
          </div>
        </div>
        <button
          onClick={() => setSelectedPlanet(null)}
          data-no-drag
          className="text-slate-500 hover:text-white transition-colors text-lg
                     leading-none shrink-0 px-1"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      {/* ── Broadcast button ─────────────────────────────────────────────── */}
      <button
        onClick={handleBroadcastClick}
        data-no-drag
        data-onboarding="broadcast-btn"
        className="w-full py-2.5 rounded-sm text-xs tracking-[0.1em] uppercase font-medium
                   text-white border border-white/30
                   hover:bg-white hover:text-[#050510] transition-all shrink-0"
      >
        + Broadcast to {selectedPlanet.label}
      </button>

      {/* ── Posts feed ─────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 min-h-0"
        style={{ touchAction: 'pan-y' }}
      >
        {isOffline && planetPosts.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">
            You're offline. Posts will load when connectivity returns.
          </p>
        ) : planetPosts.length === 0 ? (
          postsLoading ? (
            <p className="text-slate-500 text-sm text-center py-6">
              Loading posts...
            </p>
          ) : (
            <div className="text-center py-8 flex flex-col items-center gap-2">
              <span className="text-3xl">{selectedPlanet.emoji}</span>
              <p className="text-slate-400 text-sm font-medium">
                No posts yet
              </p>
              <p className="text-slate-500 text-xs leading-relaxed max-w-[220px]">
                Be the first to broadcast to {selectedPlanet.label}!
              </p>
            </div>
          )
        ) : (
          planetPosts.map((post) => (
            <div
              key={post.id}
              className="glass rounded-xl px-3 py-2.5 text-sm text-slate-300 leading-relaxed"
              style={{ borderLeft: `2px solid ${selectedPlanet.color}66` }}
            >
              {post.drawing ? (
                <img
                  src={post.drawing}
                  alt="Anonymous doodle"
                  className="w-full rounded-lg"
                  loading="lazy"
                />
              ) : (
                <p className="break-words">{post.content}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {new Date(post.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <ReactionBar post={post} accentColor={selectedPlanet.color} />
              <ReplyThread post={post} accentColor={selectedPlanet.color} />
            </div>
          ))
        )}
      </div>
    </div>

    {/* Auth prompt modal — uses the proper AuthPromptModal component */}
    <AuthPromptModal
      open={showAuthPrompt}
      onClose={handleDismissAuthPrompt}
      planetContext={selectedPlanet?.label || selectedPlanet?.id}
    />
    </>
  )
}
