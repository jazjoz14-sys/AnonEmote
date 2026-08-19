import { useEffect } from 'react'
import { termsAndConditions, privacyPolicy } from '../../data/terms'

/**
 * TermsModal — scrollable modal displaying Terms & Conditions or Privacy Policy.
 *
 * Props:
 *   - type: 'terms' | 'privacy' — selects which document to display
 *   - onClose: () => void — callback to dismiss the modal
 *
 * Features:
 *   - Fixed-position overlay with backdrop (click outside to close)
 *   - Scrollable content panel (max-height 80vh)
 *   - Prevents background page scrolling while mounted
 *   - Dark cosmic theme consistent with the rest of AnonEmote
 */
export default function TermsModal({ type, onClose }) {
  const sections = type === 'privacy' ? privacyPolicy : termsAndConditions
  const title = type === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-label={title}
      aria-modal="true"
    >
      {/* Backdrop — click to dismiss */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl rounded-lg border border-white/10
                   bg-slate-900/95 backdrop-blur-md shadow-2xl
                   flex flex-col overflow-hidden"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-semibold text-white tracking-wide">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors
                       w-8 h-8 flex items-center justify-center rounded-md
                       hover:bg-white/10"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="overflow-y-auto px-6 py-5 space-y-6
                     scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600"
        >
          {sections.map((section, index) => (
            <div key={index}>
              <h3 className="text-sm font-semibold text-violet-300 uppercase tracking-wider mb-2">
                {section.heading}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
