import React from 'react'
import { PLANETS } from '../../data/planets.js'

/**
 * PlanetBars — Planet activity distribution horizontal bars.
 *
 * Renders a row per emotion planet with emoji + label on the left,
 * a colored progress bar in the middle (width proportional to the
 * highest-count planet), and the numeric count on the right.
 *
 * @param {{ byPlanet: Object<string, number> }} props
 * byPlanet is keyed by planet id with numeric count values
 */
export default function PlanetBars({ byPlanet = {} }) {
  // Determine the maximum count across all planets for proportional scaling
  const maxCount = PLANETS.reduce(
    (max, planet) => Math.max(max, byPlanet[planet.id] || 0),
    0
  )

  return (
    <div className="space-y-2" role="list" aria-label="Planet activity distribution">
      {PLANETS.map((planet) => {
        const count = byPlanet[planet.id] || 0
        const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0

        return (
          <div
            key={planet.id}
            className="flex items-center gap-3"
            role="listitem"
            aria-label={`${planet.label}: ${count} posts`}
          >
            {/* Emoji + Label */}
            <div className="flex items-center gap-1.5 w-32 shrink-0">
              <span className="text-base" aria-hidden="true">
                {planet.emoji}
              </span>
              <span className="text-xs text-slate-300 truncate">
                {planet.label}
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex-1 h-3 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: planet.color,
                }}
              />
            </div>

            {/* Count */}
            <span className="text-xs text-slate-400 w-8 text-right tabular-nums">
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
