import { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { Z } from '../../design/tokens'

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
 *
 * Uses ModalShell for:
 * - Focus trap (accessibility)
 * - Body scroll lock
 * - Z-index stacking (Z.CRISIS_MODAL = 100)
 * - Responsive layout (mobile portrait: BottomSheet, landscape: centered card, desktop: centered panel)
 * - preventBackdropClose (only closeable via explicit user choice)
 *
 * Requirements: 12.1–12.8
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
  const open = crisis.open

  /** Return to the composer with their words still there. */
  const keepWriting = () => {
    closeCrisis()
    setPostModalOpen(true)
  }

  /** Save the draft locally — never sent to any server. */
  const saveForMyself = () => {
    if (draft.trim()) savePrivateNote(draft)
    setView('saved')
  }

  /** Discard the draft — the user explicitly chose this. */
  const discard = () => {
    clearCrisisDraft()
    setPostModalOpen(false)
  }

  return (
    <ModalShell
      open={open}
      onClose={() => {}}
      type="modal"
      zIndex={Z.CRISIS_MODAL}
      preventBackdropClose={true}
      draggable={false}
      desktopWidth={480}
      role="alertdialog"
      ariaLabel="Crisis support resources"
    >
      <div
        className="flex flex-col gap-5 p-6"
        aria-live="assertive"
        style={{ overscrollBehaviorY: 'contain' }}
      >
        {/* ── Support view ─────────────────────────────────────────── */}
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

            {/* Hotline cards — using Card surface pattern */}
            <div className="flex flex-col gap-2">
              {HOTLINES.map((h) => (
                <Card key={h.name} variant="default" className="px-4 py-3 bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3">
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
                </Card>
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

            <Button
              variant="cta"
              fullWidth
              onClick={() => setView('choices')}
              className="min-h-[44px]"
            >
              Continue
            </Button>
          </>
        )}

        {/* ── Choices view — the user decides, not the system ──────── */}
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
              <Card variant="default" className="px-4 py-3 max-h-32 overflow-y-auto bg-white/[0.03]">
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                  {draft}
                </p>
              </Card>
            )}

            <div className="flex flex-col gap-2">
              <ChoiceButton
                icon="✍️"
                title="Keep Writing"
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
                title="Start Fresh"
                sub="Remove what I wrote and start over"
                onClick={discard}
                muted
              />
            </div>
          </>
        )}

        {/* ── Saved confirmation ───────────────────────────────────── */}
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
                You can find it under "My notes" in the star system.
              </p>
            </div>

            <Button
              variant="cta"
              fullWidth
              onClick={() => { closeCrisis(); setPostModalOpen(false) }}
              className="min-h-[44px]"
            >
              Return to the stars
            </Button>

            <p className="text-center text-xs text-slate-600">
              Please still consider reaching out to one of those hotlines.
            </p>
          </>
        )}
      </div>
    </ModalShell>
  )
}

/**
 * ChoiceButton — interactive card-style button for crisis choices.
 * Uses hover:bg-white/[0.08] to white/[0.14] per design spec.
 * Minimum 44px touch target for mobile accessibility.
 */
function ChoiceButton({ icon, title, sub, onClick, muted = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left
                  border border-white/[0.08] min-h-[44px]
                  transition-all duration-200
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
                  ${muted
                    ? 'bg-white/[0.03] hover:bg-white/[0.08]'
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
