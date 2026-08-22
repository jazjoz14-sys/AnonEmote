import { useState, useId } from 'react'
import useAppStore from '../../store/useAppStore'
import { qualityTier } from '../../lib/device'
import ModalShell from './ModalShell'
import Banner from './Banner'
import ConfirmDialog from './ConfirmDialog'
import { Z } from '../../design/tokens'

// ─── Constants ──────────────────────────────────────────────────────────────

/** Planet detail levels mapped to human-readable labels. */
const PLANET_DETAIL_OPTIONS = [
  { label: 'Low', value: 2 },
  { label: 'Medium', value: 3 },
  { label: 'High', value: 4 },
]

// ─── Sub-Components ─────────────────────────────────────────────────────────

/**
 * Toggle switch control with accessible labeling.
 *
 * @param {Object} props
 * @param {string} props.label - Visible label text
 * @param {boolean} props.checked - Current state
 * @param {function} props.onChange - Called with new boolean value
 * @param {string} [props.hint] - Optional hint text below the toggle
 */
function Toggle({ label, checked, onChange, hint }) {
  const id = useId()

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm text-slate-200 cursor-pointer">
          {label}
        </label>
        {hint && (
          <span className="text-[11px] text-slate-500 mt-0.5">{hint}</span>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0
          ${checked ? 'bg-violet-600' : 'bg-white/10'}
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
        `}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  )
}

/**
 * Range slider control with min/max labels and current value display.
 *
 * @param {Object} props
 * @param {string} props.label - Visible label text
 * @param {number} props.value - Current value
 * @param {number} props.min - Minimum value
 * @param {number} props.max - Maximum value
 * @param {number} props.step - Step increment
 * @param {function} props.onChange - Called with new numeric value
 * @param {function} [props.formatValue] - Optional value formatter for display
 * @param {string} [props.ariaLabel] - Accessible label for the slider
 */
function Slider({ label, value, min, max, step, onChange, formatValue, ariaLabel }) {
  const id = useId()
  const displayValue = formatValue ? formatValue(value) : value

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm text-slate-200">
          {label}
        </label>
        <span className="text-xs text-violet-400 font-mono tabular-nums">
          {displayValue}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel || label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          bg-white/10 accent-violet-500
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-violet-500
          [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
        "
      />
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

/**
 * Segmented selector for discrete options (radio-button style).
 *
 * @param {Object} props
 * @param {string} props.label - Visible group label
 * @param {{ label: string, value: number }[]} props.options - Selectable options
 * @param {number} props.value - Currently selected value
 * @param {function} props.onChange - Called with new value
 */
function SegmentedSelector({ label, options, value, onChange }) {
  const groupId = useId()

  return (
    <div className="flex flex-col gap-1.5">
      <span id={groupId} className="text-sm text-slate-200">
        {label}
      </span>
      <div
        className="flex gap-1.5"
        role="radiogroup"
        aria-labelledby={groupId}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150
              ${value === opt.value
                ? 'bg-violet-600/80 text-white border border-violet-500/60'
                : 'bg-white/5 text-slate-400 border border-white/[0.08] hover:bg-white/10 hover:text-slate-200'
              }
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

/**
 * SettingsPanel — User-facing graphics quality configuration panel.
 *
 * Renders as a bottom sheet on mobile (via ModalShell) and a centered modal
 * on desktop. Provides preset buttons (Low/Medium/High), individual toggles
 * and sliders for fine-tuning, and performance safety warnings for low-tier
 * devices.
 *
 * All settings changes are applied immediately to the 3D scene (live preview)
 * via the Zustand graphics store slice.
 *
 * @param {Object} props
 * @param {boolean} props.open - Panel visibility
 * @param {function} props.onClose - Called to dismiss the panel
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7,
 *              5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 7.1, 7.2, 7.3
 */
export default function SettingsPanel({ open, onClose }) {
  const headingId = useId()

  // ── Store State ────────────────────────────────────────────────────────────
  const bloomEnabled = useAppStore((s) => s.bloomEnabled)
  const decorEnabled = useAppStore((s) => s.decorEnabled)
  const starCount = useAppStore((s) => s.starCount)
  const dpr = useAppStore((s) => s.dpr)
  const shadowMapSize = useAppStore((s) => s.shadowMapSize)
  const planetDetail = useAppStore((s) => s.planetDetail)
  const activePreset = useAppStore((s) => s.activePreset)
  const setGraphicsSetting = useAppStore((s) => s.setGraphicsSetting)
  const applyPreset = useAppStore((s) => s.applyPreset)

  // ── Local UI State ─────────────────────────────────────────────────────────
  const [showShadowConfirm, setShowShadowConfirm] = useState(false)

  // ── Derived ────────────────────────────────────────────────────────────────
  const isLowTier = qualityTier === 'low'
  const shadowsEnabled = shadowMapSize > 0

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Handle shadow toggle — requires confirmation on low-tier devices. */
  const handleShadowToggle = () => {
    if (shadowsEnabled) {
      // Disabling shadows — no confirmation needed
      setGraphicsSetting('shadowMapSize', 0)
    } else if (isLowTier) {
      // Low-tier + enabling → show confirmation
      setShowShadowConfirm(true)
    } else {
      // Non-low tier — apply directly
      setGraphicsSetting('shadowMapSize', 1024)
    }
  }

  /** Confirm enabling shadows on low-tier device. */
  const handleShadowConfirm = () => {
    setShowShadowConfirm(false)
    setGraphicsSetting('shadowMapSize', 1024)
  }

  /** Cancel shadow confirmation. */
  const handleShadowCancel = () => {
    setShowShadowConfirm(false)
  }

  return (
    <>
      <ModalShell
        open={open}
        onClose={onClose}
        zIndex={Z.SETTINGS_PANEL}
        ariaLabel="Graphics Settings"
        desktopWidth={400}
        draggable={false}
      >
        <div className="flex flex-col gap-5 p-5">
          {/* ── Panel Heading ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <h2
              id={headingId}
              className="text-base font-medium text-white tracking-wide"
            >
              Graphics Settings
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="w-8 h-8 flex items-center justify-center rounded-lg
                text-slate-400 hover:text-white hover:bg-white/10 transition-colors
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
              "
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* ── Performance Warning Banner (low tier only) ─────────────── */}
          {isLowTier && (
            <Banner type="warning">
              Some advanced settings may cause performance issues on this device
            </Banner>
          )}

          {/* ── Preset Buttons ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 uppercase tracking-wider">
                Preset
              </span>
              {activePreset === 'custom' && (
                <span className="text-[10px] text-slate-500 uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded">
                  Custom
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => applyPreset(name)}
                  aria-pressed={activePreset === name}
                  className={`flex-1 py-2 rounded-lg text-xs uppercase tracking-wider font-medium transition-colors duration-150
                    ${activePreset === name
                      ? 'bg-violet-600 text-white border border-violet-500'
                      : 'bg-white/5 text-slate-300 border border-white/[0.08] hover:bg-white/10'
                    }
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
                  `}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* ── Divider ────────────────────────────────────────────────── */}
          <hr className="border-white/[0.06]" />

          {/* ── Individual Controls ────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Bloom toggle */}
            <Toggle
              label="Bloom"
              checked={bloomEnabled}
              onChange={(val) => setGraphicsSetting('bloomEnabled', val)}
              hint={isLowTier ? 'May cause performance issues on this device' : undefined}
            />

            {/* Decorations toggle */}
            <Toggle
              label="Planet Decorations"
              checked={decorEnabled}
              onChange={(val) => setGraphicsSetting('decorEnabled', val)}
            />

            {/* Shadows toggle with low-tier confirmation */}
            <Toggle
              label="Shadows"
              checked={shadowsEnabled}
              onChange={handleShadowToggle}
              hint={isLowTier ? 'May cause WebGL context loss on this device' : undefined}
            />

            {/* Star density slider */}
            <Slider
              label="Star Density"
              value={starCount}
              min={200}
              max={5000}
              step={100}
              onChange={(val) => setGraphicsSetting('starCount', val)}
              formatValue={(v) => `${v.toLocaleString()} stars`}
              ariaLabel="Star density count"
            />

            {/* Resolution (DPR) slider */}
            <Slider
              label="Resolution (DPR)"
              value={dpr}
              min={0.5}
              max={isLowTier ? 1.5 : 2.0}
              step={0.25}
              onChange={(val) => setGraphicsSetting('dpr', val)}
              formatValue={(v) => `${v.toFixed(2)}x`}
              ariaLabel="Device pixel ratio resolution scale"
            />

            {/* Planet detail selector */}
            <SegmentedSelector
              label="Planet Detail"
              options={PLANET_DETAIL_OPTIONS}
              value={planetDetail}
              onChange={(val) => setGraphicsSetting('planetDetail', val)}
            />
          </div>
        </div>
      </ModalShell>

      {/* ── Shadow Confirmation Dialog (low-tier only) ──────────────────── */}
      <ConfirmDialog
        open={showShadowConfirm}
        onConfirm={handleShadowConfirm}
        onCancel={handleShadowCancel}
        message="Enabling shadows may cause WebGL context loss on low-end devices. Are you sure?"
        confirmLabel="Apply"
        cancelLabel="Cancel"
        destructive={false}
      />
    </>
  )
}
