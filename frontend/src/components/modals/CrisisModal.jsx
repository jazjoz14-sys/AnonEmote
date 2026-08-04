import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'

/**
 * CrisisModal — shown when the moderation engine detects crisis indicators.
 *
 * Design principle: the post is not published, but the user's writing is never
 * destroyed by the system. Someone who has just found the words to describe
 * wanting to die should not watch those words disappear. They are shown support
 * resources and then given control over their own text — keep editing, save it
 * privately to this device, or discard it themselves.
 *
 * The tone deliberately avoids anything that reads as rejection or punishment.
 */

const HOTLINES = [
  { name: 'NCMH Crisis Hotline', number: '1553', note: 'Toll-free, 24/7 (PH)', flag: '🇵🇭' },
  { name: 'HOPELINE Philippines', number: '8804-4673', note: '24/7', flag: '🇵🇭' },
  { name: 'In Touch Crisis Line', number: '(02) 8893-7603', note: '24/7', flag: '🇵🇭' },
  { name: 'Crisis Text Line', number: 'Text HOME to 741741', note: 'International', flag: '🌍' },
]

export default function CrisisModal() {
  const {
    crisis,
    closeCrisis,
    clearCrisisDraft,
    savePrivateNote,
    setPostModalOpen,
  } = useAppStore()

  const [view, setView] = useState('support') // 'support' | 'choices' | 'saved'
  const draft = crisis.draft || ''

  /** Return to the composer with their words still there. */
  const keepWriting = () => {
    closeCrisis()
    setPostModalOpen(true)
  }

  const saveForMyself = () => {
    if (draft.trim()) savePrivateNote(draft)
    setView('saved')
  }

  const discard = () => {
    clearCrisisDraft()
    setPostModalOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(6,6,16,0.9)', backdropFilter: 'blur(10px)' }}
      role="alertdialog"
      aria-modal="true"
      aria-label="Support resources"
      aria-live="assertive"
    >
      <div className="w-full max-w-md glass-dark rounded-3xl p-7 flex flex-col gap-5
                      animate-slide-up border border-violet-500/25 my-8">

        {/* ── Support view ─────────────────────────────────────────────── */}
        {view === 'support' && (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="text-5xl">💙</div>
              <h2 className="text-2xl font-semibold text-white">
                That sounds really heavy
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Thank you for putting it into words. What you wrote stays with
                you — nothing has been deleted. Before anything else, please
                consider talking to someone who can help right now.
              </p>
            </div>

            {/* Hotlines */}
            <div className="flex flex-col gap-2">
              {HOTLINES.map((h) => (
                <div
                  key={h.name}
                  className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {h.flag} {h.name}
                    </p>
                    <p className="text-xs text-slate-500">{h.note}</p>
                  </div>
                  <a
                    href={`tel:${h.number.replace(/[^\d+]/g, '')}`}
                    className="text-sm font-mono font-bold text-violet-300
                               hover:text-violet-200 transition-colors shrink-0"
                  >
                    {h.number}
                  </a>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1 text-center">
              <a
                href="https://doh.gov.ph/philippine-council-for-mental-health"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                DOH Philippine Council for Mental Health ↗
              </a>
              <p className="text-xs text-slate-600">
                If you are in immediate danger, please call 911.
              </p>
            </div>

            <button
              onClick={() => setView('choices')}
              className="w-full py-3.5 rounded-2xl font-semibold text-white
                         bg-gradient-to-r from-violet-700 to-indigo-700
                         hover:from-violet-600 hover:to-indigo-600 transition-all"
            >
              Continue
            </button>
          </>
        )}

        {/* ── Choices view — the user decides, not the system ──────────── */}
        {view === 'choices' && (
          <>
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-white">
                What would you like to do with what you wrote?
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                We are not posting it publicly — posts describing self-harm can
                be distressing for other students reading the planets. But these
                are your words, so it is your call.
              </p>
            </div>

            {/* Their words, preserved and visible */}
            {draft && (
              <div className="glass rounded-xl px-4 py-3 max-h-32 overflow-y-auto">
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                  {draft}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <ChoiceButton
                icon="✍️"
                title="Keep writing"
                sub="Go back with your words still there"
                onClick={keepWriting}
              />
              <ChoiceButton
                icon="🔒"
                title="Save just for me"
                sub="Kept on this device only, never sent anywhere"
                onClick={saveForMyself}
              />
              <ChoiceButton
                icon="🗑️"
                title="Discard it"
                sub="Remove what I wrote"
                onClick={discard}
                muted
              />
            </div>
          </>
        )}

        {/* ── Saved confirmation ───────────────────────────────────────── */}
        {view === 'saved' && (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="text-4xl">🔒</div>
              <h2 className="text-xl font-semibold text-white">Saved for you</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your writing is stored on this device only — it was never sent to
                our servers. It will clear when you close this tab, so nothing is
                left behind on a shared computer.
              </p>
              <p className="text-xs text-slate-600">
                You can find it under “My notes” in the star system.
              </p>
            </div>

            <button
              onClick={() => { closeCrisis(); setPostModalOpen(false) }}
              className="w-full py-3.5 rounded-2xl font-semibold text-white
                         bg-gradient-to-r from-violet-700 to-indigo-700
                         hover:from-violet-600 hover:to-indigo-600 transition-all"
            >
              Return to the stars
            </button>

            <p className="text-center text-xs text-slate-600">
              Please still consider reaching out to one of those hotlines.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function ChoiceButton({ icon, title, sub, onClick, muted = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left
                  transition-all duration-200
                  ${muted
                    ? 'bg-white/[0.04] hover:bg-white/[0.08]'
                    : 'bg-white/[0.08] hover:bg-white/[0.14]'}`}
    >
      <span className="text-xl shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className={`block text-sm font-medium ${muted ? 'text-slate-400' : 'text-white'}`}>
          {title}
        </span>
        <span className="block text-xs text-slate-500 leading-snug">{sub}</span>
      </span>
    </button>
  )
}
