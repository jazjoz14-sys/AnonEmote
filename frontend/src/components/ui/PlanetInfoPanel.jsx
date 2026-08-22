import React, { useMemo, useEffect, useState, useRef } from 'react'
import useAppStore from '../../store/useAppStore'
import ReactionBar from './ReactionBar'
import ReplyThread from './ReplyThread'
import ModalShell from './ModalShell'
import ScrollFade from './ScrollFade'
import AuthPromptModal from '../modals/AuthPromptModal'
import { apiFetch } from '../../lib/api'
import { isHintDismissed, dismissHint, HINT_GUEST_PROMPT } from '../../lib/hintStore'

/**
 * PlanetInfoPanel — displays recent posts for the selected planet.
 *
 * Uses ModalShell with type="panel" to handle responsive layout:
 * - Mobile portrait: BottomSheet with scroll isolation + 32px fade gradient
 * - Desktop: draggable floating panel, bg-[#0d0d2b], border-white/[0.08], max-h-75vh
 * - Landscape mobile: right-aligned side panel, max-w-45vw
 *
 * All internal content (posts list, reactions, replies, composer trigger, loading states,
 * auth prompt) is preserved unchanged — only the outer shell is delegated to ModalShell.
 */
export default function PlanetInfoPanel({ postsLoading = false, maxHeight }) {
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

  /** Close the panel */
  const handleClose = () => setSelectedPlanet(null)

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

  return (
    <>
      <ModalShell
        open={!!selectedPlanet}
        onClose={handleClose}
        type="panel"
        zIndex={30}
        desktopWidth={420}
        draggable
        maxHeight={maxHeight}
        ariaLabel={`${selectedPlanet.label} posts panel`}
      >
        <div
          className="flex flex-col h-full p-4 gap-3"
          style={{
            border: `1px solid ${selectedPlanet.color}44`,
            borderBottom: 'none',
            // When PostModal is stacked above, hide content + disable pointer events
            ...(postModalOpen ? { pointerEvents: 'none', opacity: 0.4 } : {}),
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* ── Header row ── */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl shrink-0">{selectedPlanet.emoji}</span>
              <div className="min-w-0">
                <h3 className="font-bold text-white truncate text-sm">
                  {selectedPlanet.label}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  {selectedPlanet.description}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="shrink-0 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              style={{
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
              }}
              aria-label="Close panel"
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>✕</span>
            </button>
          </div>

          {/* ── Broadcast button: 44px effective tap target ── */}
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

          {/* ── Post feed: fills remaining space, wrapped in ScrollFade ── */}
          <div className="flex-1 min-h-0">
            <ScrollFade fadeHeight={32} className="h-full">
              <div className="flex flex-col gap-2 pr-1">
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
            </ScrollFade>
          </div>
        </div>
      </ModalShell>

      {/* Auth prompt modal */}
      <AuthPromptModal
        open={showAuthPrompt}
        onClose={handleDismissAuthPrompt}
        planetContext={selectedPlanet?.label || selectedPlanet?.id}
        actionLabel="Sign in to broadcast"
      />
    </>
  )
}
