import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import useAppStore from '../store/useAppStore'

/**
 * usePresence — broadcasts this user's avatar config and current planet to all
 * other connected clients via Supabase Realtime Presence.
 *
 * No data is persisted. Presence state exists only while a client is connected
 * and disappears the moment they close the tab. This aligns with the
 * zero-knowledge architecture: there is no record of who was online or when.
 *
 * Each peer is identified only by their ephemeral session UUID, which cannot
 * be traced to a person.
 *
 * @returns {{ peers: Array<{sessionId, avatar, planetId}> }}
 */
export default function usePresence() {
  const { sessionId, avatar, selectedPlanet } = useAppStore()
  const [peers, setPeers] = useState([])
  const channelRef = useRef(null)
  const trackRef = useRef(null)

  // The state we broadcast — avatar config + which planet we're focused on
  const getPresenceState = useCallback(() => ({
    sessionId,
    avatar: {
      shape: avatar.shape,
      auraColor: avatar.auraColor,
      particles: avatar.particles,
      scale: avatar.scale,
    },
    planetId: selectedPlanet?.id || null,
  }), [sessionId, avatar, selectedPlanet])

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase.channel('anonemote-presence', {
      config: { presence: { key: sessionId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const list = []

        for (const [key, presences] of Object.entries(state)) {
          // Skip self
          if (key === sessionId) continue

          // Each key can have multiple presences (multiple tabs), take latest
          const latest = presences[presences.length - 1]
          if (latest) {
            list.push({
              sessionId: key,
              avatar: latest.avatar || {},
              planetId: latest.planetId || null,
            })
          }
        }

        setPeers(list)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const state = getPresenceState()
          trackRef.current = state
          await channel.track(state)
        }
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [sessionId]) // Only reconnect if session changes

  // Update presence when avatar or planet changes
  useEffect(() => {
    if (!channelRef.current || !sessionId) return

    const newState = getPresenceState()

    // Avoid spamming updates if nothing changed
    if (JSON.stringify(newState) === JSON.stringify(trackRef.current)) return

    trackRef.current = newState
    channelRef.current.track(newState)
  }, [avatar, selectedPlanet, sessionId, getPresenceState])

  return { peers }
}
