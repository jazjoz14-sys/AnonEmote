import React, { useState, useEffect, useCallback } from 'react'
import useAppStore from '../../store/useAppStore'
import { apiFetch } from '../../lib/api'
import AuthPromptModal from '../modals/AuthPromptModal'

/**
 * ReplyThread — expandable replies section for a post on the Advice planet.
 *
 * Only renders when the parent post belongs to the 'advice' planet.
 * Replies pass through the same moderation engine — crisis and toxic content
 * are caught identically to top-level posts.
 */
export default function ReplyThread({ post, accentColor }) {
  const { sessionId, isAuthenticated, selectedPlanet } = useAppStore()

  const [expanded, setExpanded] = useState(false)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(false)

  const [composing, setComposing] = useState(false)
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | blocked | error
  const [errorMsg, setErrorMsg] = useState('')
  // Auth prompt state for guest write-gating
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  const loadReplies = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/replies?post_id=${post.id}`)
      if (res.ok) {
        const data = await res.json()
        setReplies(data)
      }
    } catch (err) {
      console.error('[ReplyThread] fetch', err)
    } finally {
      setLoading(false)
    }
  }, [post.id])

  useEffect(() => {
    if (expanded) loadReplies()
  }, [expanded, loadReplies])

  const handleSubmit = async () => {
    if (!text.trim() || status === 'sending') return
    setStatus('sending')
    setErrorMsg('')

    try {
      const res = await apiFetch('/api/replies', {
        method: 'POST',
        body: JSON.stringify({
          post_id: post.id,
          session_id: sessionId,
          content: text.trim(),
        }),
      })

      const data = await res.json()

      if (res.status === 403 && data.verdict === 'crisis') {
        // Trigger the crisis flow through the store
        useAppStore.getState().openCrisis({ draft: text, referral: data.referral })
        setText('')
        setComposing(false)
        setStatus('idle')
        return
      }

      if (res.status === 406) {
        setStatus('blocked')
        setErrorMsg(data.error || 'Reply blocked.')
        return
      }

      if (!res.ok) throw new Error(data.error || 'Failed')

      // Success — add to list and reset
      setReplies((prev) => [...prev, data.reply])
      setText('')
      setComposing(false)
      setStatus('idle')
    } catch (err) {
      console.error('[ReplyThread] submit', err)
      setStatus('error')
      setErrorMsg('Could not save the reply.')
    }
  }

  // Only show on advice planet
  if (post.planet_id !== 'advice') return null

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {/* Toggle — more prominent when no replies exist yet so it's discoverable */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-xs transition-colors self-start px-1 py-0.5 rounded
                   hover:bg-white/5"
        style={{ color: accentColor || '#10b981' }}
      >
        {expanded
          ? '▾ Hide replies'
          : replies.length > 0
            ? `▸ ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`
            : '💬 Offer advice'}
      </button>

      {expanded && (
        <div className="flex flex-col gap-1.5 pl-2 border-l border-white/10">
          {/* Existing replies */}
          {loading && replies.length === 0 && (
            <p className="text-xs text-slate-600">Loading…</p>
          )}

          {replies.map((r) => (
            <div key={r.id} className="text-xs text-slate-300 bg-white/[0.04]
                                       rounded-lg px-2.5 py-2 leading-relaxed">
              <p className="break-words">{r.content}</p>
              <span className="text-[10px] text-slate-600 mt-1 block">
                {new Date(r.created_at).toLocaleTimeString([], {
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          ))}

          {/* Compose — only for authenticated users */}
          {!isAuthenticated ? (
            <>
              <button
                onClick={() => setShowAuthPrompt(true)}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors
                           self-start px-1 py-0.5"
              >
                + Sign in to offer advice
              </button>
              <AuthPromptModal
                open={showAuthPrompt}
                onClose={() => setShowAuthPrompt(false)}
                planetContext={selectedPlanet?.label || post.planet_id}
                actionLabel="Sign in to offer advice"
              />
            </>
          ) : !composing ? (
            <button
              onClick={() => setComposing(true)}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors
                         self-start px-1 py-0.5"
            >
              + Offer advice
            </button>
          ) : (
            <div className="flex flex-col gap-1.5">
              <textarea
                value={text}
                onChange={(e) => {
                  if (e.target.value.length <= 280) setText(e.target.value)
                  if (status === 'blocked') setStatus('idle')
                }}
                placeholder="Share your perspective…"
                rows={2}
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2
                           text-xs text-slate-200 placeholder-slate-600 resize-none
                           focus:outline-none focus:border-violet-500/50
                           focus:ring-1 focus:ring-violet-500/20 transition-colors"
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
              />

              {status === 'blocked' && (
                <p className="text-[10px] text-red-300">🚫 {errorMsg}</p>
              )}
              {status === 'error' && (
                <p className="text-[10px] text-orange-300">⚠ {errorMsg}</p>
              )}

              <div className="flex gap-1.5">
                <button
                  onClick={() => { setComposing(false); setText(''); setStatus('idle') }}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] text-slate-400
                             glass hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim() || status === 'sending'}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white
                             bg-violet-600 hover:bg-violet-500
                             disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {status === 'sending' ? '…' : 'Reply'}
                </button>
              </div>

              <p className="text-[10px] text-slate-600">
                Replies pass through the same AI moderation as posts.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
