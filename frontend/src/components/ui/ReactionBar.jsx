import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { REACTIONS } from '../../data/reactions'
import { apiFetch } from '../../lib/api'
import AuthPromptModal from '../modals/AuthPromptModal'

/**
 * ReactionBar — emoji-only reactions plus a report action for a single post.
 *
 * One reaction per session per post. Tapping the same emoji removes it,
 * tapping a different one switches. Counts are shown to the reader but posts
 * are never sorted or ranked by them, so there is no leaderboard effect.
 *
 * Loading state: when a reaction is in-flight, the tapped emoji shows at
 * opacity 0.4 and all reaction buttons on this post are disabled. On server
 * confirmation the emoji returns to full opacity. On failure the optimistic
 * update is rolled back and an auto-dismissing error toast is shown (2.5s).
 */
export default function ReactionBar({ post, accentColor = '#8b5cf6' }) {
  const { sessionId, reactions, applyReaction, setReportTarget, isAuthenticated, showToast, selectedPlanet } = useAppStore()
  // Track which emoji is currently pending (in-flight) for this post
  const [pendingEmoji, setPendingEmoji] = useState(null)
  // Auth prompt state for guest write-gating
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  const entry = reactions[post.id] || { counts: {}, mine: null }
  const busy = pendingEmoji !== null

  const handleReact = async (emoji) => {
    if (busy || !sessionId) return

    // Guest write-gating: show auth prompt instead of submitting
    if (!isAuthenticated) {
      setShowAuthPrompt(true)
      return
    }

    setPendingEmoji(emoji)

    // Snapshot for rollback, then update optimistically so it feels instant
    const snapshot = {
      counts: { ...entry.counts },
      mine: entry.mine,
    }
    applyReaction(post.id, emoji)

    try {
      const res = await apiFetch('/api/reactions', {
        method: 'POST',
        body: JSON.stringify({ post_id: post.id, session_id: sessionId, emoji }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      // Trust the server's authoritative result
      const data = await res.json()
      useAppStore.setState((s) => {
        const current = s.reactions[post.id] || { counts: {}, mine: null }
        return {
          reactions: {
            ...s.reactions,
            [post.id]: { ...current, mine: data.emoji ?? null },
          },
        }
      })
    } catch (err) {
      console.error('[ReactionBar] reaction failed:', err.message)
      // Roll back so the UI reflects reality rather than a phantom reaction
      useAppStore.setState((s) => ({
        reactions: { ...s.reactions, [post.id]: snapshot },
      }))
      showToast({ message: 'Reaction not saved', type: 'error', duration: 2500 })
    } finally {
      setPendingEmoji(null)
    }
  }

  return (
    <div data-onboarding="reactions" className="mt-2 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        {/* Emoji reactions */}
        <div className="flex items-center gap-1 flex-wrap">
          {REACTIONS.map(({ emoji, label }) => {
            const count = entry.counts[emoji] || 0
            const isMine = entry.mine === emoji
            const isPending = pendingEmoji === emoji

            return (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                disabled={busy}
                title={label}
                aria-label={`${label}${count > 0 ? ` — ${count}` : ''}`}
                aria-pressed={isMine}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs
                            transition-all duration-150
                            ${busy ? 'pointer-events-none' : ''}
                            ${isMine ? 'bg-white/15 ring-1' : 'hover:bg-white/10'}`}
                style={{
                  opacity: isPending ? 0.4 : 1,
                  ...(isMine ? { '--tw-ring-color': accentColor } : {}),
                }}
              >
                <span className="text-sm leading-none">{emoji}</span>
                {count > 0 && (
                  <span className={isMine ? 'text-white' : 'text-slate-500'}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Report */}
        <button
          onClick={() => setReportTarget(post)}
          title="Report this post"
          aria-label="Report this post"
          className="text-slate-600 hover:text-red-400 transition-colors text-xs px-1 shrink-0"
        >
          ⚑
        </button>
      </div>

      {/* Auth prompt modal for guest write-gating on reactions */}
      <AuthPromptModal
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        planetContext={selectedPlanet?.label || post.planet_id}
        actionLabel="Sign in to react"
      />
    </div>
  )
}
