import { useEffect, useState, useCallback, useRef } from 'react'
import { ONBOARDING_STEPS } from '../../data/onboardingSteps'
import useAppStore from '../../store/useAppStore'
import { supabase } from '../../lib/supabase'

/**
 * OnboardingOverlay — Full-screen guided tutorial overlay.
 *
 * Renders above the 3D Canvas (z-index 100) with a translucent backdrop.
 * Steps through ONBOARDING_STEPS, highlighting relevant DOM elements and
 * displaying tooltips with title/description. On completion or skip,
 * writes `onboarding_completed_at` to user metadata via Supabase Auth.
 *
 * Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.8
 */
export default function OnboardingOverlay() {
  const { onboarding, nextOnboardingStep, prevOnboardingStep, completeOnboarding } = useAppStore()
  const { active, step } = onboarding

  // Tooltip position state — defaults to centered
  const [tooltipPos, setTooltipPos] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
  const [highlightRect, setHighlightRect] = useState(null)
  const overlayRef = useRef(null)

  const currentStep = ONBOARDING_STEPS[step]
  const isLastStep = step === ONBOARDING_STEPS.length - 1

  /**
   * Highlight logic: find the target DOM element and position tooltip near it.
   * If element not found or selector is null, center the tooltip.
   */
  useEffect(() => {
    if (!active || !currentStep) return

    const { highlightSelector } = currentStep

    if (!highlightSelector) {
      // No element to highlight — center tooltip
      setTooltipPos({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
      setHighlightRect(null)
      return
    }

    const el = document.querySelector(highlightSelector)

    if (!el) {
      // Element not found — center tooltip, log warning
      console.warn(`[OnboardingOverlay] Element not found for selector: ${highlightSelector}`)
      setTooltipPos({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
      setHighlightRect(null)
      return
    }

    // Get element bounding rect and position tooltip below it
    const rect = el.getBoundingClientRect()
    setHighlightRect(rect)

    // Position tooltip below the highlighted element, centered horizontally
    const tooltipTop = rect.bottom + 16
    const tooltipLeft = rect.left + rect.width / 2

    // Clamp within viewport
    const clampedTop = Math.min(tooltipTop, window.innerHeight - 220)
    const clampedLeft = Math.max(180, Math.min(tooltipLeft, window.innerWidth - 180))

    setTooltipPos({
      top: `${clampedTop}px`,
      left: `${clampedLeft}px`,
      transform: 'translateX(-50%)',
    })
  }, [active, step, currentStep])

  /**
   * Write onboarding_completed_at to Supabase user metadata.
   * On failure, dismiss overlay for current session and queue for retry.
   */
  const writeCompletionMetadata = useCallback(async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { onboarding_completed_at: new Date().toISOString() },
      })
      if (error) throw error
    } catch (err) {
      console.warn('[OnboardingOverlay] Failed to write metadata, queuing for retry:', err)
      // Add to pending writes for retry on next Supabase interaction
      useAppStore.setState((s) => ({
        pendingMetadataWrites: [
          ...s.pendingMetadataWrites,
          { field: 'onboarding_completed_at', value: new Date().toISOString() },
        ],
      }))
    }
  }, [])

  /** Handle "Next" (or "Finish" on last step) */
  const handleNext = useCallback(() => {
    if (isLastStep) {
      completeOnboarding()
      writeCompletionMetadata()
    } else {
      nextOnboardingStep()
    }
  }, [isLastStep, completeOnboarding, nextOnboardingStep, writeCompletionMetadata])

  /** Handle "Skip" — dismiss immediately and mark complete */
  const handleSkip = useCallback(() => {
    completeOnboarding()
    writeCompletionMetadata()
  }, [completeOnboarding, writeCompletionMetadata])

  /** Handle "Back" */
  const handleBack = useCallback(() => {
    prevOnboardingStep()
  }, [prevOnboardingStep])

  // Don't render if not active
  if (!active || !currentStep) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding tutorial"
    >
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Highlight cutout — if an element is highlighted, show a glowing border around it */}
      {highlightRect && (
        <div
          className="absolute border-2 border-violet-400/80 rounded-lg shadow-[0_0_20px_rgba(139,92,246,0.4)] pointer-events-none"
          style={{
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-violet-500/30
                   bg-slate-900/95 backdrop-blur-md shadow-2xl shadow-violet-900/20
                   p-5 flex flex-col gap-4 animate-pop-in"
        style={tooltipPos}
      >
        {/* Step title */}
        <h3 className="text-base font-semibold text-violet-200 leading-tight">
          {currentStep.title}
        </h3>

        {/* Step description */}
        <p className="text-sm text-slate-300 leading-relaxed">
          {currentStep.description}
        </p>

        {/* Progress indicator */}
        <p className="text-xs text-slate-400 tracking-wide">
          Step {step + 1} of 6
        </p>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          {/* Back button — visible on steps 2–6 (index > 0) */}
          {step > 0 && (
            <button
              onClick={handleBack}
              className="px-3 py-2 rounded-md text-xs tracking-[0.05em] uppercase
                         text-slate-300 border border-white/15
                         hover:text-white hover:border-white/30
                         focus:outline-none focus:ring-2 focus:ring-white/20
                         transition-all duration-150"
            >
              Back
            </button>
          )}

          {/* Spacer pushes Skip and Next to the right */}
          <div className="flex-1" />

          {/* Skip button — always visible */}
          <button
            onClick={handleSkip}
            className="px-3 py-2 rounded-md text-xs tracking-[0.05em] uppercase
                       text-slate-400 hover:text-slate-200
                       focus:outline-none focus:ring-2 focus:ring-white/20
                       transition-all duration-150"
          >
            Skip
          </button>

          {/* Next / Finish button */}
          <button
            onClick={handleNext}
            className="px-4 py-2 rounded-md text-xs tracking-[0.05em] uppercase font-medium
                       text-white bg-violet-600/80 border border-violet-500/40
                       hover:bg-violet-500 hover:border-violet-400/60
                       focus:outline-none focus:ring-2 focus:ring-violet-400/40
                       transition-all duration-150"
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
