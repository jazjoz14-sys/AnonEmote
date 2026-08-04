import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { REPORT_REASONS } from '../../data/reactions'
import { apiFetch } from '../../lib/api'

/**
 * ReportModal — lets a reader flag a post.
 *
 * Reports are anonymous and one per session per post. A post is auto-hidden
 * once three distinct sessions report it, which makes single-user brigading
 * ineffective.
 */
export default function ReportModal() {
  const { reportTarget, setReportTarget, sessionId, removePost } = useAppStore()

  const [reason, setReason] = useState(null)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [referral, setReferral] = useState(null)

  if (!reportTarget) return null

  const close = () => {
    setReportTarget(null)
    setReason(null)
    setNote('')
    setStatus('idle')
    setReferral(null)
  }

  const handleSubmit = async () => {
    if (!reason || status === 'sending') return
    setStatus('sending')

    try {
      const res = await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          post_id: reportTarget.id,
          session_id: sessionId,
          reason,
          note: note.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'report failed')

      if (data.referral) setReferral(data.referral)
      setStatus('done')

      // Hide it locally right away so the reporter stops seeing it
      removePost(reportTarget.id)

      // Auto-close unless we're showing crisis resources
      if (!data.referral) setTimeout(close, 1800)
    } catch (err) {
      console.error('[ReportModal]', err)
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Report this post"
    >
      <div className="glass-dark w-full max-w-md rounded-3xl p-6 flex flex-col gap-5 animate-slide-up">

        {/* ── Success state ──────────────────────────────────────────────── */}
        {status === 'done' ? (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="text-4xl">{referral ? '💙' : '✅'}</div>
              <h2 className="text-lg font-bold text-white">Thank you for reporting</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                {referral
                  ? referral.message
                  : 'Our team will review this post. It has been hidden from your view.'}
              </p>
            </div>

            {referral && (
              <div className="flex flex-col gap-2">
                {referral.hotlines?.map((h) => (
                  <div
                    key={h.name}
                    className="glass rounded-xl px-4 py-2.5 flex items-center justify-between"
                  >
                    <span className="text-sm text-white">{h.name}</span>
                    <span className="text-sm font-mono font-bold text-violet-300">
                      {h.number}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={close}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm
                         bg-gradient-to-r from-violet-700 to-indigo-700
                         hover:from-violet-600 hover:to-indigo-600 transition-all"
            >
              Return to Space
            </button>
          </>
        ) : (
          <>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-white text-lg">Report this post</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your report is anonymous. The author is never told who reported them.
                </p>
              </div>
              <button
                onClick={close}
                className="text-slate-500 hover:text-white transition-colors text-xl leading-none"
                aria-label="Cancel"
              >
                ✕
              </button>
            </div>

            {/* ── Quoted post ─────────────────────────────────────────────── */}
            <div className="glass rounded-xl px-3 py-2 text-xs text-slate-400 italic
                            max-h-20 overflow-y-auto">
              “{reportTarget.content}”
            </div>

            {/* ── Reason picker ───────────────────────────────────────────── */}
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-xs font-semibold uppercase tracking-widest
                                 text-slate-500 mb-1.5">
                Why are you reporting this?
              </legend>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                              cursor-pointer transition-all
                              ${reason === r.id
                                ? 'bg-violet-600/25 text-white ring-1 ring-violet-500/50'
                                : 'text-slate-400 hover:bg-white/5'}`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                    className="accent-violet-500"
                  />
                  {r.label}
                </label>
              ))}
            </fieldset>

            {/* ── Optional note ───────────────────────────────────────────── */}
            <div>
              <label
                htmlFor="report-note"
                className="block text-xs font-semibold uppercase tracking-widest
                           text-slate-500 mb-1.5"
              >
                Add detail <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea
                id="report-note"
                value={note}
                onChange={(e) => e.target.value.length <= 300 && setNote(e.target.value)}
                rows={2}
                placeholder="Anything else our reviewers should know?"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2
                           text-slate-200 placeholder-slate-600 text-sm resize-none
                           focus:outline-none focus:border-violet-500/60
                           focus:ring-1 focus:ring-violet-500/30 transition-colors"
              />
            </div>

            {status === 'error' && (
              <div className="flex items-start gap-2 bg-orange-900/30 border
                              border-orange-700/40 rounded-xl px-4 py-3 text-sm
                              text-orange-300">
                <span>⚠️</span>
                <p>Could not submit the report. Please try again.</p>
              </div>
            )}

            {/* ── Actions ─────────────────────────────────────────────────── */}
            <div className="flex gap-3">
              <button
                onClick={close}
                className="flex-1 py-3 rounded-xl text-sm text-slate-400 glass
                           hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || status === 'sending'}
                className="flex-1 py-3 rounded-xl font-semibold text-white text-sm
                           bg-gradient-to-r from-red-700 to-rose-700
                           hover:from-red-600 hover:to-rose-600
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-all duration-200"
              >
                {status === 'sending' ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
