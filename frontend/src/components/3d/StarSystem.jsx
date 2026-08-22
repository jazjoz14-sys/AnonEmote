import React from 'react'
import { PLANETS } from '../../data/planets'
import EmotionPlanet from './EmotionPlanet'
import OrbitPath from './OrbitPath'
import CentralStar from './CentralStar'
import UserAvatar from './UserAvatar'

/**
 * StarSystem — composes the central star, the orbit rings, all emotion
 * planets, and the user's avatar into one scene group.
 */
export default function StarSystem() {
  return (
    <group>
      {/* Central star (the "sun" of the AnonEmote system) */}
      <CentralStar />

      {/* Orbit tracks — drawn first so planets render on top of them */}
      {PLANETS.map((planet) => (
        <OrbitPath key={`orbit-${planet.id}`} planet={planet} />
      ))}

      {/* All emotion planets */}
      {PLANETS.map((planet) => (
        <EmotionPlanet key={planet.id} planet={planet} />
      ))}

      {/* User's avatar floating near the centre */}
      <UserAvatar />
    </group>
  )
}
