import { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { REPORT_REASONS } from '../../data/reactions'
import { apiFetch } from '../../lib/api'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import Banner from '../ui/Banner'
import { Z } from '../../design/tokens'

/**
 * ReportModal — lets a reader flag a post.
 *
 * Reports are anonymous and one per session per post. A post is auto-hidden
 * once three distinct sessions report it, which makes single-user brigading
 * ineffective.
 *
 * Uses ModalShell for responsive layout (BottomSheet on mobile portrait,
 * centered card on landscape, draggable floating panel on desktop).
 */
export default function ReportModal() {
  const { reportTarget, setReportTarget, sessionId, removePost } = useAppStore()

  const [reason, setReason] = useState(null)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [referral, setReferral] = useState(null)

  const open = Boolean(reportTarget)

  /** Reset all internal state to defaults. */
  const resetState = () => {
    setReason(null)
    setNote('')
    setStatus('idle')
    setReferral(null)
  }

  /** Close modal without submitting, reset state. */
  const handleClose = () => {
    setReportTarget(null)
    resetState()
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
      if (!data.referral) setTimeout(handleClose, 1800)
    } catch (err) {
      console.error('[ReportModal]', err)
      setStatus('error')
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      type="modal"
      zIndex={Z.REPORT_MODAL}
      desktopWidth={448}
      draggable={false}
      ariaLabel="Report this post"
    >
      <div className="p-6 flex flex-col gap-5">

        {/* ── Success state ──────────────────────────────────────────── */}
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
                    className="border border-white/[0.08] bg-white/[0.03] rounded-xl px-4 py-2.5 flex items-center justify-between"
                  >
                    <span className="text-sm text-white">{h.name}</span>
                    <span className="text-sm font-mono font-bold text-violet-300">
                      {h.number}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="primary"
              fullWidth
              onClick={handleClose}
            >
              Return to Space
            </Button>
          </>
        ) : (
          <>
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-white text-lg">Report this post</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your report is anonymous. The author is never told who reported them.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-500 hover:text-white transition-colors text-xl leading-none
                           min-w-[44px] min-h-[44px] flex items-center justify-center
                           focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                aria-label="Close report dialog"
              >
                ✕
              </button>
            </div>

            {/* ── Quoted post preview ─────────────────────────────────── */}
            {reportTarget && (
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl px-3 py-2
                              text-xs text-slate-400 italic max-h-20 overflow-y-auto">
                "{reportTarget.content}"
              </div>
            )}

            {/* ── Reason picker ───────────────────────────────────────── */}
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-xs font-semibold uppercase tracking-widest
                                 text-slate-500 mb-1.5">
                Why are you reporting this?
              </legend>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                              cursor-pointer transition-all min-h-[44px]
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

            {/* ── Optional note ───────────────────────────────────────── */}
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
                onChange={(e) => {
                  if (e.target.value.length <= 300) setNote(e.target.value)
                }}
                maxLength={300}
                rows={2}
                placeholder="Anything else our reviewers should know?"
                className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3 py-2
                           text-slate-200 placeholder-slate-600 text-sm resize-none
                           focus:outline-none focus:border-white/25
                           transition-colors duration-200 min-h-[44px]"
              />
              <p className="text-xs text-slate-600 mt-1 text-right">
                {note.length}/300
              </p>
            </div>

            {/* ── Error banner ─────────────────────────────────────────── */}
            {status === 'error' && (
              <Banner type="warning">
                <span className="flex items-start gap-2">
                  <span>⚠️</span>
                  <span>Could not submit the report. Please try again.</span>
                </span>
              </Banner>
            )}

            {/* ── Actions ─────────────────────────────────────────────── */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                fullWidth
                disabled={!reason || status === 'sending'}
                loading={status === 'sending'}
                onClick={handleSubmit}
              >
                Submit report
              </Button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  )
}
