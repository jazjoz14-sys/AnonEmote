import { useState, useRef, useCallback } from 'react'
import useAppStore from '../../store/useAppStore'
import { apiFetch } from '../../lib/api'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import Banner from '../ui/Banner'
import { Z } from '../../design/tokens'

/**
 * Moon-phase rating options — maps value (1–5) to icon + label.
 * Icons progress from new moon (worst) to full moon (best).
 */
const RATING_OPTIONS = [
  { value: 1, icon: '🌑', label: 'Poor' },
  { value: 2, icon: '🌒', label: 'Fair' },
  { value: 3, icon: '🌓', label: 'Good' },
  { value: 4, icon: '🌔', label: 'Very Good' },
  { value: 5, icon: '🌕', label: 'Excellent' },
]

/**
 * CosmicRating — WAI-ARIA compliant radiogroup with moon-phase icons.
 *
 * Implements roving tabindex pattern:
 * - Only the focused/selected item has tabIndex=0
 * - Arrow Left/Up moves focus backward; Arrow Right/Down moves forward
 * - Enter/Space selects the currently focused option
 * - Each option has aria-label in the format "[Label] — [N] of 5"
 *
 * Visual behavior:
 * - When a rating is selected, all icons at index ≤ selected-1 are full opacity
 * - Icons after the selection render at reduced opacity (40%)
 * - Transition applies within 100ms via CSS transition-opacity
 *
 * @param {Object} props
 * @param {number|null} props.value - Currently selected rating (1–5 or null)
 * @param {(rating: number) => void} props.onChange - Called when user selects a rating
 * @param {boolean} props.hasError - Whether to show error styling (red border)
 */
function CosmicRating({ value, onChange, hasError }) {
  // Track which option is focused (for roving tabindex)
  const [focusedIndex, setFocusedIndex] = useState(value ? value - 1 : 0)
  const optionRefs = useRef([])

  /**
   * Roving tabindex: the "active" index is whichever is currently selected,
   * or the focused index if nothing is selected yet.
   */
  const activeIndex = value != null ? value - 1 : focusedIndex

  /**
   * Handle keyboard navigation within the radiogroup.
   * Arrow keys move focus; Enter/Space confirm selection.
   */
  const handleKeyDown = useCallback(
    (e) => {
      let newIndex = focusedIndex

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          newIndex = (focusedIndex + 1) % RATING_OPTIONS.length
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          newIndex =
            (focusedIndex - 1 + RATING_OPTIONS.length) % RATING_OPTIONS.length
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          onChange(RATING_OPTIONS[focusedIndex].value)
          return
        default:
          return
      }

      setFocusedIndex(newIndex)
      optionRefs.current[newIndex]?.focus()
    },
    [focusedIndex, onChange]
  )

  return (
    <div
      role="radiogroup"
      aria-label="Rate your experience"
      className={`flex items-center justify-center gap-3 sm:gap-4 p-3 rounded-xl border transition-colors duration-100 ${
        hasError
          ? 'border-red-500/80 bg-red-500/5'
          : 'border-white/[0.08] bg-white/[0.02]'
      }`}
      onKeyDown={handleKeyDown}
    >
      {RATING_OPTIONS.map((option, index) => {
        const isSelected = value === option.value
        const isActive = value != null && index <= value - 1
        const isFocusTarget = index === activeIndex

        return (
          <div
            key={option.value}
            className="flex flex-col items-center gap-1.5"
          >
            {/* Radio option button */}
            <span
              ref={(el) => {
                optionRefs.current[index] = el
              }}
              role="radio"
              aria-checked={isSelected}
              aria-label={`${option.label} — ${option.value} of 5`}
              tabIndex={isFocusTarget ? 0 : -1}
              onClick={() => onChange(option.value)}
              onFocus={() => setFocusedIndex(index)}
              className={`text-2xl sm:text-3xl cursor-pointer select-none rounded-lg p-1.5 transition-all duration-100 
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400
                hover:scale-110 ${
                  isActive ? 'opacity-100' : 'opacity-40'
                }`}
            >
              {option.icon}
            </span>

            {/* Label below the icon */}
            <span
              className={`text-[10px] sm:text-xs tracking-wide transition-opacity duration-100 ${
                isActive ? 'text-slate-200' : 'text-slate-500'
              }`}
            >
              {option.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Recognized feedback area identifiers and their cosmic-themed labels.
 * Order here defines the display order of checkboxes.
 */
const FEEDBACK_AREAS = [
  { id: 'navigation', label: 'Easy to navigate' },
  { id: 'visuals', label: 'Visuals are appealing' },
  { id: 'safety', label: 'I feel safe here' },
  { id: 'support', label: 'Emotionally supportive' },
  { id: 'exploration', label: 'Fun to explore' },
]

/** Min/max character constraints for planet suggestion field */
const SUGGESTION_MIN = 3
const SUGGESTION_MAX = 140

/**
 * SuggestionField — textarea with character counter and inline error.
 *
 * Validation rules:
 * - Field is optional — empty string is valid
 * - If non-empty, trimmed length must be 3–140 characters
 * - Whitespace-only input is invalid
 *
 * @param {Object} props
 * @param {string} props.value - Current textarea value
 * @param {(value: string) => void} props.onChange - Called on each keystroke
 * @param {string|null} props.error - Error message to display, or null if valid
 */
function SuggestionField({ value, onChange, error }) {
  const charCount = value.length

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="eval-suggestion"
        className="text-xs font-medium text-slate-300 tracking-wide"
      >
        Suggest a new Emotion Planet topic
        <span className="text-slate-500 ml-1">(optional)</span>
      </label>

      <div className="relative">
        <textarea
          id="eval-suggestion"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Suggest a new Emotion Planet topic..."
          maxLength={SUGGESTION_MAX}
          rows={2}
          className={`w-full resize-none rounded-lg bg-white/[0.04] border px-3 py-2.5 text-sm text-slate-200
            placeholder:text-slate-500 transition-colors duration-100
            focus:outline-none focus:ring-1 focus:ring-violet-500/50
            ${error ? 'border-red-500/60' : 'border-white/[0.08] hover:border-white/[0.15]'}`}
        />

        {/* Character counter — positioned bottom-right of textarea */}
        <span
          className={`absolute bottom-2 right-3 text-[10px] tracking-wide select-none ${
            charCount > SUGGESTION_MAX
              ? 'text-red-400'
              : charCount >= SUGGESTION_MAX - 10
                ? 'text-amber-400/80'
                : 'text-slate-500'
          }`}
          aria-live="polite"
          aria-atomic="true"
        >
          {charCount}/{SUGGESTION_MAX}
        </span>
      </div>

      {/* Inline error message */}
      {error && (
        <p className="text-xs text-red-400 mt-0.5" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * FeedbackCheckboxes — 5 cosmic-themed checkboxes for categorical feedback.
 *
 * Selection order is preserved: checking pushes to end of array,
 * unchecking filters out. This ordering is meaningful for analytics.
 *
 * @param {Object} props
 * @param {string[]} props.selectedAreas - Currently selected area IDs (ordered)
 * @param {(areaId: string) => void} props.onToggle - Called with area ID to toggle
 */
function FeedbackCheckboxes({ selectedAreas, onToggle }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-medium text-slate-300 tracking-wide mb-2">
        What stood out?
        <span className="text-slate-500 ml-1">(optional)</span>
      </legend>

      <div className="grid grid-cols-1 gap-2">
        {FEEDBACK_AREAS.map(({ id, label }) => {
          const isChecked = selectedAreas.includes(id)

          return (
            <label
              key={id}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer select-none
                border transition-all duration-100
                ${
                  isChecked
                    ? 'border-violet-500/40 bg-violet-500/10'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                }`}
            >
              {/* Custom checkbox visual */}
              <span
                className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-100
                  ${
                    isChecked
                      ? 'bg-violet-500 border-violet-400'
                      : 'border-white/20 bg-transparent'
                  }`}
              >
                {isChecked && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 5L4 7L8 3"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>

              {/* Hidden native checkbox for accessibility */}
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggle(id)}
                className="sr-only"
                aria-label={label}
              />

              <span
                className={`text-sm transition-colors duration-100 ${
                  isChecked ? 'text-slate-100' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/**
 * EvaluationModal — dialog for collecting user experience feedback.
 *
 * Contains:
 * - Modal shell with cosmic dark theme
 * - CosmicRating sub-component (WAI-ARIA radiogroup, moon-phase icons)
 * - SuggestionField sub-component (optional textarea, 3–140 chars)
 * - FeedbackCheckboxes sub-component (5 optional checkboxes, order-preserving)
 * - Submit button with required-rating validation
 *
 * Future tasks will add:
 * - Submission logic + error handling (7.3)
 * - Full accessibility + theming polish (7.4)
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is visible
 * @param {() => void} props.onClose - Called when the modal should close
 */
export default function EvaluationModal({ open, onClose }) {
  // ─── Store actions ──────────────────────────────────────────────────────────
  const { openCrisis, showToast, closeEvaluationModal } = useAppStore()

  // ─── Internal state ────────────────────────────────────────────────────────
  const [rating, setRating] = useState(null)
  const [ratingError, setRatingError] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [suggestionError, setSuggestionError] = useState(null)
  const [selectedAreas, setSelectedAreas] = useState([])
  const [status, setStatus] = useState('idle') // 'idle' | 'submitting' | 'success' | 'error' | 'suggestion-blocked'
  const [errorMsg, setErrorMsg] = useState('')
  const [pendingReview, setPendingReview] = useState(false)

  // ─── Handlers ──────────────────────────────────────────────────────────────

  /** Update rating and clear any validation error */
  const handleRatingChange = (value) => {
    setRating(value)
    if (ratingError) setRatingError(false)
  }

  /** Update suggestion and clear error on change */
  const handleSuggestionChange = (value) => {
    setSuggestion(value)
    if (suggestionError) setSuggestionError(null)
    // Clear suggestion-blocked status when user edits the field
    if (status === 'suggestion-blocked') {
      setStatus('idle')
    }
  }

  /**
   * Toggle a feedback area in the selectedAreas array.
   * Preserves insertion order: push on check, filter on uncheck.
   */
  const handleToggleArea = (areaId) => {
    setSelectedAreas((prev) =>
      prev.includes(areaId)
        ? prev.filter((id) => id !== areaId)
        : [...prev, areaId]
    )
  }

  /**
   * Validate the suggestion field.
   * Returns true if valid (empty is valid, non-empty must be 3–140 trimmed chars).
   */
  const validateSuggestion = () => {
    const trimmed = suggestion.trim()
    // Empty is valid — field is optional
    if (trimmed.length === 0 && suggestion.length === 0) return true
    // Non-empty but whitespace-only
    if (trimmed.length === 0) {
      setSuggestionError('Suggestion cannot be only whitespace')
      return false
    }
    // Too short
    if (trimmed.length < SUGGESTION_MIN) {
      setSuggestionError(`Suggestion must be at least ${SUGGESTION_MIN} characters`)
      return false
    }
    // Too long (shouldn't happen with maxLength, but guard)
    if (trimmed.length > SUGGESTION_MAX) {
      setSuggestionError(`Suggestion must be at most ${SUGGESTION_MAX} characters`)
      return false
    }
    return true
  }

  /**
   * Validate and submit evaluation to the backend.
   *
   * Response handling:
   * - 201: success → toast + close + sessionStorage flag
   * - 403: crisis → close modal, open CrisisModal with preserved draft
   * - 406: toxic suggestion → inline error on suggestion field only
   * - 429: rate limited → toast + close
   * - 4xx/5xx/network error → inline error banner, keep modal open
   * - 201 with moderation_status "pending_review" → inline confirmation
   */
  const handleSubmit = async () => {
    // Prevent double-submit
    if (status === 'submitting') return

    let valid = true

    if (rating == null) {
      setRatingError(true)
      valid = false
    }

    if (!validateSuggestion()) {
      valid = false
    }

    if (!valid) return

    // Clear previous errors
    setStatus('submitting')
    setErrorMsg('')
    setPendingReview(false)

    const trimmedSuggestion = suggestion.trim()

    try {
      const res = await apiFetch('/api/evaluations', {
        method: 'POST',
        body: JSON.stringify({
          rating,
          suggestion: trimmedSuggestion || undefined,
          feedback_areas: selectedAreas.length ? selectedAreas : undefined,
        }),
      })

      // ── 403: Crisis detected in suggestion ────────────────────────────────
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}))
        closeEvaluationModal()
        onClose?.()
        openCrisis({ draft: trimmedSuggestion, referral: data.referral })
        return
      }

      // ── 406: Toxic suggestion ─────────────────────────────────────────────
      if (res.status === 406) {
        const data = await res.json().catch(() => ({}))
        setStatus('suggestion-blocked')
        setSuggestionError(
          data.error || 'Your suggestion contains inappropriate language. Please revise it.'
        )
        return
      }

      // ── 429: Rate limited ─────────────────────────────────────────────────
      if (res.status === 429) {
        showToast({ message: "You've already shared feedback recently", type: 'info', duration: 3000 })
        setStatus('idle')
        closeEvaluationModal()
        onClose?.()
        return
      }

      // ── Other 4xx/5xx errors ──────────────────────────────────────────────
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setStatus('error')
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
        return
      }

      // ── 201: Success ──────────────────────────────────────────────────────
      const data = await res.json().catch(() => ({}))

      // Check if the suggestion moderation timed out (pending_review)
      if (data.moderation_status === 'pending_review') {
        setPendingReview(true)
      }

      // Mark session as evaluated so the notification doesn't reappear
      try {
        sessionStorage.setItem('anonemote_evaluated', 'true')
      } catch {
        // sessionStorage may be unavailable in private browsing
      }

      // Show success toast
      showToast({ message: 'Thanks for sharing your feedback!', type: 'success', duration: 3000 })

      // Close modal within 500ms of toast appearing
      setStatus('success')
      setTimeout(() => {
        closeEvaluationModal()
        onClose?.()
      }, 500)
    } catch (err) {
      // Network error or unexpected failure
      setStatus('error')
      setErrorMsg('Could not reach the server. Please check your connection and try again.')
    }
  }

  /** Close handler — reset state only when not in success transition */
  const handleClose = () => {
    onClose?.()
    closeEvaluationModal()
    // Reset form state on close
    setRating(null)
    setRatingError(false)
    setSuggestion('')
    setSuggestionError(null)
    setSelectedAreas([])
    setStatus('idle')
    setErrorMsg('')
    setPendingReview(false)
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      zIndex={Z.POST_MODAL}
      desktopWidth={440}
      draggable={false}
      ariaLabelledBy="evaluation-modal-title"
    >
      <div className="flex flex-col gap-5 p-5">
        {/* ── Inline Error Banner (network/server errors) ──────────────────── */}
        {status === 'error' && (
          <Banner type="error">
            {errorMsg}
          </Banner>
        )}

        {/* ── Pending Review Confirmation ──────────────────────────────────── */}
        {pendingReview && (
          <Banner type="info">
            Your suggestion was recorded and is awaiting review.
          </Banner>
        )}

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="evaluation-modal-title"
              className="text-base font-medium text-white tracking-wide"
            >
              How's your experience?
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Your feedback helps us improve
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            aria-label="Close feedback dialog"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* ── Cosmic Rating Scale ──────────────────────────────────────────── */}
        <div>
          <CosmicRating
            value={rating}
            onChange={handleRatingChange}
            hasError={ratingError}
          />
          {ratingError && (
            <p className="text-xs text-red-400 mt-2 text-center" role="alert">
              Please select a rating before submitting
            </p>
          )}
        </div>

        {/* ── Planet Suggestion Field ─────────────────────────────────────── */}
        <SuggestionField
          value={suggestion}
          onChange={handleSuggestionChange}
          error={suggestionError}
        />

        {/* ── Quick Feedback Checkboxes ────────────────────────────────────── */}
        <FeedbackCheckboxes
          selectedAreas={selectedAreas}
          onToggle={handleToggleArea}
        />

        {/* ── Submit button ────────────────────────────────────────────────── */}
        <Button
          variant="cta"
          fullWidth
          onClick={handleSubmit}
          disabled={status === 'submitting' || status === 'success'}
        >
          {status === 'submitting' ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </div>
    </ModalShell>
  )
}
