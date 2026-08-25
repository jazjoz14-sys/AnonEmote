import { useCallback } from 'react'

/**
 * NuanceConstellation — renders 6 nuance words in a card-based 2×3 grid layout.
 * Each card displays the nuance label and its writing prompt, and is selectable
 * via click or keyboard.
 *
 * Layout: CSS Grid (2 columns, 3 rows), centered within parent container.
 *
 * Accessibility:
 * - Full keyboard navigation (Tab through cards, Enter/Space to select)
 * - Each button has aria-label including the prompt text
 * - Visible focus indicator (2px violet-500/60 ring)
 * - Min 44px touch target height (WCAG 2.5.5)
 *
 * @param {Object} props
 * @param {Array<{id: string, label: string, prompt: string}>} props.nuances - The 6 nuance options
 * @param {(nuance: {id: string, label: string, prompt: string}) => void} props.onSelect - Called when a nuance is chosen
 */
export default function NuanceConstellation({ nuances, onSelect }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="border border-white/[0.06] bg-white/[0.02] rounded-2xl p-5 max-w-lg w-full mx-auto backdrop-blur-sm">
        <div
          className="grid grid-cols-2 gap-3 w-full"
          role="group"
          aria-label="Nuance options — select the word that resonates with you"
        >
          {nuances.map((nuance) => (
            <NuanceCard
              key={nuance.id}
              nuance={nuance}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * NuanceCard — individual card button within the grid.
 * Displays the nuance label and its writing prompt.
 *
 * @param {Object} props
 * @param {{id: string, label: string, prompt: string}} props.nuance
 * @param {(nuance: Object) => void} props.onSelect
 */
function NuanceCard({ nuance, onSelect }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(nuance)
      }
    },
    [onSelect, nuance]
  )

  return (
    <button
      type="button"
      className={[
        'flex flex-col items-start text-left',
        'border border-white/[0.08] bg-white/[0.03]',
        'rounded-xl px-4 py-3',
        'min-h-[44px] w-full',
        'cursor-pointer select-none',
        'transition-all duration-200',
        'hover:border-violet-500/30 hover:bg-white/[0.06] hover:scale-[1.02]',
        'focus:outline-none focus:ring-2 focus:ring-violet-500/60',
      ].join(' ')}
      aria-label={`${nuance.label} — ${nuance.prompt}`}
      onClick={() => onSelect(nuance)}
      onKeyDown={handleKeyDown}
    >
      <span className="text-sm font-semibold text-white/80">
        {nuance.label}
      </span>
      <span className="text-xs text-white/40 mt-1">
        {nuance.prompt}
      </span>
    </button>
  )
}
