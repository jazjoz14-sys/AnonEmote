import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_AVATAR } from '../data/avatarOptions'

/**
 * Global Zustand store for AnonEmote.
 * Manages session UUID, avatar config, app phase, selected planet, and posts.
 */
const useAppStore = create((set, get) => ({
  // ── Session ──────────────────────────────────────────────────────────────
  sessionId: null,
  initSession: () => {
    const existing = sessionStorage.getItem('anonemote_session')
    const id = existing || uuidv4()
    if (!existing) sessionStorage.setItem('anonemote_session', id)
    set({ sessionId: id })
  },

  // ── App Phase ─────────────────────────────────────────────────────────────
  // 'landing' | 'avatar' | 'checkin' | 'space'
  phase: 'landing',
  setPhase: (phase) => set({ phase }),

  // ── Emotion check-in ──────────────────────────────────────────────────────
  // Result of the pre-entry triage: which feeling, which nuance, and the
  // tailored writing prompt shown in the composer.
  checkIn: { feeling: null, nuance: null, prompt: null },
  setCheckIn: (checkIn) => set({ checkIn }),
  clearCheckIn: () => set({ checkIn: { feeling: null, nuance: null, prompt: null } }),

  // ── Avatar ────────────────────────────────────────────────────────────────
  // An abstract energy form — never a human likeness. See data/avatarOptions.js
  //   shape:     'orb' | 'prism' | 'spirit'
  //   auraColor: hex string
  //   particles: 'stardust' | 'rings' | 'none'
  avatar: { ...DEFAULT_AVATAR },
  setAvatar: (avatar) => set((s) => ({ avatar: { ...s.avatar, ...avatar } })),
  resetAvatar: () => set({ avatar: { ...DEFAULT_AVATAR } }),

  // ── Selected Planet ───────────────────────────────────────────────────────
  selectedPlanet: null,
  setSelectedPlanet: (planet) => set({ selectedPlanet: planet }),

  // ── Live planet world positions (written every frame by EmotionPlanet) ────
  // { [planetId]: THREE.Vector3 } — plain object, not reactive (read via getState)
  planetPositions: {},
  setPlanetPosition: (id, vec3) => {
    // Mutate directly — we don't want React re-renders on every frame
    get().planetPositions[id] = vec3
  },

  // ── Posts ─────────────────────────────────────────────────────────────────
  posts: [],
  setPosts: (posts) => set({ posts }),

  /**
   * Add a post, ignoring duplicates.
   *
   * A newly created post arrives twice: once from the POST /api/moderate
   * response (so the author sees it instantly) and again from the Supabase
   * realtime INSERT event. Deduplicating by id keeps it to one entry.
   */
  addPost: (post) =>
    set((s) => {
      if (!post?.id || s.posts.some((p) => p.id === post.id)) return s
      return { posts: [post, ...s.posts] }
    }),

  removePost: (postId) =>
    set((s) => ({ posts: s.posts.filter((p) => p.id !== postId) })),

  // ── Reactions ─────────────────────────────────────────────────────────────
  // { [postId]: { counts: { '🫂': 3 }, mine: '🫂' | null } }
  reactions: {},
  setReactions: (reactions) => set({ reactions }),

  /** Merge a fetched summary into existing state */
  mergeReactions: (summary) =>
    set((s) => ({ reactions: { ...s.reactions, ...summary } })),

  /**
   * Optimistically apply a toggle before the server responds.
   * Mirrors backend semantics: same emoji removes, different switches.
   */
  applyReaction: (postId, emoji) =>
    set((s) => {
      const entry = s.reactions[postId] || { counts: {}, mine: null }
      const counts = { ...entry.counts }
      const prev = entry.mine

      // Remove previous vote if any
      if (prev) {
        counts[prev] = Math.max(0, (counts[prev] || 1) - 1)
        if (counts[prev] === 0) delete counts[prev]
      }

      // Toggling the same emoji off
      const mine = prev === emoji ? null : emoji
      if (mine) counts[mine] = (counts[mine] || 0) + 1

      return { reactions: { ...s.reactions, [postId]: { counts, mine } } }
    }),

  // ── Report modal ──────────────────────────────────────────────────────────
  reportTarget: null, // the post object being reported, or null
  setReportTarget: (post) => set({ reportTarget: post }),

  // ── Modals ────────────────────────────────────────────────────────────────
  crisisModalOpen: false,
  setCrisisModalOpen: (v) => set({ crisisModalOpen: v }),

  postModalOpen: false,
  setPostModalOpen: (v) => set({ postModalOpen: v }),
}))

export default useAppStore
