import React from 'react'
import useAppStore from '../../store/useAppStore'

/**
 * CrisisModal — Triggered by the AI when severe risk keywords are detected.
 * Displays emergency hotlines and mental health referrals.
 * This overrides the normal "block" behavior — the post is not posted,
 * and the user receives immediate, compassionate support information.
 */
export default function CrisisModal() {
  const setCrisisModalOpen = useAppStore((s) => s.setCrisisModalOpen)

  const resources = [
    {
      name: 'HOPELINE Philippines',
      number: '8804-4673',
      hours: '24/7',
      flag: '🇵🇭',
    },
    {
      name: 'In Touch Crisis Line',
      number: '(02) 893-7603',
      hours: '24/7',
      flag: '🇵🇭',
    },
    {
      name: 'NCMH Crisis Hotline',
      number: '1553',
      hours: '24/7',
      flag: '🇵🇭',
    },
    {
      name: 'Crisis Text Line (US)',
      number: 'Text HOME to 741741',
      hours: '24/7',
      flag: '🌍',
    },
  ]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      role="alertdialog"
      aria-modal="true"
      aria-label="Crisis support resources"
      aria-live="assertive"
    >
      <div className="w-full max-w-md glass-dark rounded-3xl p-7 flex flex-col gap-5 animate-slide-up border border-violet-500/20">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-5xl">💙</div>
          <h2 className="text-2xl font-bold text-white">You're Not Alone</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            We noticed your message may indicate you're going through something really difficult.
            We care about you. Please reach out to one of these free, confidential resources right now.
          </p>
        </div>

        {/* Resources */}
        <div className="flex flex-col gap-2">
          {resources.map((r) => (
            <div
              key={r.name}
              className="glass rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-white text-sm font-semibold">{r.flag} {r.name}</p>
                <p className="text-xs text-slate-400">{r.hours}</p>
              </div>
              <div className="text-right">
                <p className="text-violet-300 font-mono text-sm font-bold">{r.number}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Additional links */}
        <div className="flex flex-col gap-1 text-center">
          <p className="text-xs text-slate-500">Online support resources:</p>
          <a
            href="https://www.doh.gov.ph/mental-health"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            DOH Mental Health Program (Philippines) ↗
          </a>
          <a
            href="https://www.who.int/news-room/fact-sheets/detail/suicide"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            WHO Mental Health Resources ↗
          </a>
        </div>

        {/* Close */}
        <button
          onClick={() => setCrisisModalOpen(false)}
          className="w-full py-3 rounded-xl font-semibold text-white
                     bg-gradient-to-r from-violet-700 to-indigo-700
                     hover:from-violet-600 hover:to-indigo-600
                     transition-all duration-200"
        >
          I understand — Return to Space
        </button>

        <p className="text-center text-xs text-slate-600">
          Your message was not posted. Your anonymity is preserved.
        </p>
      </div>
    </div>
  )
}
