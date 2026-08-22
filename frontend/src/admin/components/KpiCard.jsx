import React from 'react'

/**
 * KpiCard — Dashboard metric card.
 *
 * Displays a single KPI value with a label, optional accent color, and optional hint text.
 * Uses the glass card pattern consistent with the admin console's cosmic dark theme.
 *
 * @param {{
 *   label: string,
 *   value: number|string,
 *   accent?: string,
 *   hint?: string
 * }} props
 */
export default function KpiCard({ label, value, accent = 'text-white', hint }) {
  return (
    <div className="rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/5 px-4 py-3">
      {/* Label — 12px uppercase slate-500 */}
      <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
        {label}
      </p>

      {/* Value — 2xl bold with optional accent color */}
      <p className={`text-2xl font-bold ${accent}`}>
        {value}
      </p>

      {/* Optional hint text below value */}
      {hint && (
        <p className="text-xs text-slate-400 mt-1">
          {hint}
        </p>
      )}
    </div>
  )
}
