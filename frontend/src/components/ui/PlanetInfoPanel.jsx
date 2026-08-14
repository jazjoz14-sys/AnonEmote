import React, { useMemo, useEffect, useState } from 'react'
import useAppStore from '../../store/useAppStore'
import useAuth from '../../hooks/useAuth'
import useDraggable from '../../hooks/useDraggable'
import ReactionBar from './ReactionBar'
import ReplyThread from './ReplyThread'
import { apiFetch } from '../../lib/api'
import { isSmallScreen } from '../../lib/device'

const PANEL_W = isSmallScreen ? Math.min(360, window.innerWidth - 16) : 320

/**
 * PlanetInfoPanel — draggable floating panel listing recent posts for the
 * selected planet, each with emoji reactions and a report action.
 *
 * Starts docked near the right edge but can be moved anywhere on screen.
 */
export default function PlanetInfoPanel() {
  const {
    selectedPlanet,
    setSelectedPlanet,
    setPostModalOpen,
    setPhase,
    posts,
    sessionId,
    mergeReactions,
  } = useAppStore()
  const { isAuthenticated } = useAuth()
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  const { position, isDragging, dragProps, handleProps } = useDraggable({
    width: PANEL_W,
    height: 480,
    initial: isSmallScreen
      ? { x: 8, y: Math.max(60, window.innerHeight - 420) }
      : {
          x: Math.max(12, window.innerWidth - PANEL_W - 24),
          y: Math.max(12, window.innerHeight / 2 - 240),
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

  if (!selectedPlanet) return null

  // On mobile: full-width bottom sheet. On desktop: draggable side panel.
  if (isSmallScreen) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-30 glass-dark rounded-t-3xl
                   p-4 flex flex-col gap-3 safe-bottom animate-slide-up"
        style={{
          maxHeight: '65vh',
          border: `1px solid ${selectedPlanet.color}44`,
          borderBottom: 'none',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">{selectedPlanet.emoji}</span>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm">{selectedPlanet.label}</h3>
              <p className="text-xs text-slate-400 line-clamp-1">{selectedPlanet.description}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedPlanet(null)}
            className="text-slate-500 hover:text-white text-lg px-2 py-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Broadcast */}
        <button
          onClick={() => isAuthenticated ? setPostModalOpen(true) : setShowAuthPrompt(true)}
          className="w-full py-3 rounded-sm text-xs tracking-[0.1em] uppercase font-medium
                     text-white border border-white/30
                     hover:bg-white hover:text-[#050510] transition-all"
        >
          + Broadcast to {selectedPlanet.label}
        </button>

        {/* Posts */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
          {planetPosts.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              No posts yet. Be the first to share.
            </p>
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
                <p className="text-xs text-slate-600 mt-1">
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
      </div>
    )
  }

  // Desktop: draggable floating panel
  return (
    <>
    <div
      {...dragProps}
      className="fixed z-30 glass-dark rounded-3xl p-5 flex flex-col gap-4"
      style={{
        ...dragProps.style,
        left: position.x,
        top: position.y,
        width: PANEL_W,
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
          <span className="text-slate-600 text-base leading-none shrink-0" aria-hidden="true">
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
        onClick={() => isAuthenticated ? setPostModalOpen(true) : setShowAuthPrompt(true)}
        className="w-full py-2.5 rounded-sm text-xs tracking-[0.1em] uppercase font-medium
                   text-white border border-white/30
                   hover:bg-white hover:text-[#050510] transition-all shrink-0"
      >
        + Broadcast to {selectedPlanet.label}
      </button>

      {/* ── Posts feed ───────────────────────────────────────────────────────
          Draggable from anywhere in the feed. Mouse-wheel still scrolls, and
          reaction/report buttons are excluded from drag by the hook. */}
      <div
        className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 min-h-0"
        // pan-y lets touch devices scroll the feed vertically while a mouse
        // drag still repositions the whole panel
        style={{ touchAction: 'pan-y' }}
      >
        {planetPosts.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">
            No posts yet. Be the first to share.
          </p>
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
              <p className="text-xs text-slate-600 mt-1">
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

    {/* Auth prompt modal */}
    {showAuthPrompt && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
           style={{ background: 'rgba(5,5,16,0.85)' }}
           onClick={() => setShowAuthPrompt(false)}>
        <div className="max-w-xs w-full rounded-sm p-6 flex flex-col items-center gap-4 text-center
                        border border-white/[0.1] animate-pop-in"
             style={{ background: 'rgba(10,10,26,0.97)' }}
             onClick={(e) => e.stopPropagation()}>
          <img src="/icons/logo.png" alt="" className="w-12 h-12 opacity-80" draggable={false} />
          <p className="text-white text-sm font-medium">Sign in to broadcast</p>
          <p className="text-slate-400 text-xs leading-relaxed">
            Create a free account to post, reply, and react. Your identity stays anonymous to other users.
          </p>
          <button
            onClick={() => { setShowAuthPrompt(false); setPhase('auth') }}
            className="w-full py-3 rounded-sm text-xs tracking-[0.15em] uppercase font-medium
                       text-white border border-white/30
                       hover:bg-white hover:text-[#050510] transition-all"
          >
            Sign In / Register
          </button>
          <button
            onClick={() => setShowAuthPrompt(false)}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    )}
    </>
  )
}
