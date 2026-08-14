import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import useAuth from '../../hooks/useAuth'
import { REACTIONS } from '../../data/reactions'
import { apiFetch } from '../../lib/api'

/**
 * ReactionBar — emoji-only reactions plus a report action for a single post.
 *
 * One reaction per session per post. Tapping the same emoji removes it,
 * tapping a different one switches. Counts are shown to the reader but posts
 * are never sorted or ranked by them, so there is no leaderboard effect.
 */
export default function ReactionBar({ post, accentColor = '#8b5cf6' }) {
  const { sessionId, reactions, applyReaction, setReportTarget } = useAppStore()
  const { isAuthenticated } = useAuth()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const entry = reactions[post.id] || { counts: {}, mine: null }

  const handleReact = async (emoji) => {
    if (busy || !sessionId || !isAuthenticated) return
    setBusy(true)
    setFailed(false)

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
      setFailed(true)
      setTimeout(() => setFailed(false), 2500)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        {/* Emoji reactions */}
        <div className="flex items-center gap-1 flex-wrap">
          {REACTIONS.map(({ emoji, label }) => {
            const count = entry.counts[emoji] || 0
            const isMine = entry.mine === emoji

            return (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                disabled={busy}
                title={label}
                aria-label={`${label}${count > 0 ? ` — ${count}` : ''}`}
                aria-pressed={isMine}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs
                            transition-all duration-150 disabled:opacity-40
                            ${isMine ? 'bg-white/15 ring-1' : 'hover:bg-white/10'}`}
                style={isMine ? { '--tw-ring-color': accentColor } : undefined}
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

      {failed && (
        <p className="text-[10px] text-orange-400/90" role="status">
          Couldn't save that reaction. Try again.
        </p>
      )}
    </div>
  )
}
