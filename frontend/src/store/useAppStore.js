import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_AVATAR } from '../data/avatarOptions'
import { supabase } from '../lib/supabase'

/**
 * Global Zustand store for AnonEmote.
 * Manages auth, session, avatar config, app phase, selected planet, and posts.
 */
const useAppStore = create((set, get) => ({
  // ── Auth (centralized — no more independent useAuth hooks per component) ──
  authUser: null,
  authLoading: true,
  isAuthenticated: false,

  initAuth: () => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null
      set({ authUser: user, isAuthenticated: !!user, authLoading: false })
    })

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user ?? null
        set({ authUser: user, isAuthenticated: !!user })
      }
    )

    // Store cleanup function (called nowhere currently, but available)
    set({ _authUnsubscribe: () => subscription.unsubscribe() })
  },

  // ── Session ──────────────────────────────────────────────────────────────
  sessionId: null,
  initSession: () => {
    const existing = sessionStorage.getItem('anonemote_session')
    const id = existing || uuidv4()
    if (!existing) sessionStorage.setItem('anonemote_session', id)
    set({ sessionId: id })
  },

  // ── App Phase ─────────────────────────────────────────────────────────────
  // 'landing' | 'auth' | 'avatar' | 'checkin' | 'space'
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
  setSelectedPlanet: (planet) => set({
    selectedPlanet: planet,
    // Post modal is opened by the App based on auth state — not here.
    // This just selects the planet for camera focus.
  }),

  // ── Pending Planet (preserves selection across auth flow) ────────────────
  // When an unauthenticated user clicks "Sign In / Register" from a planet,
  // the planet ID is saved here so we can return them to 'space' after login
  // instead of sending them to the avatar screen.
  pendingPlanetId: null,
  setPendingPlanetId: (id) => set({ pendingPlanetId: id }),
  clearPendingPlanetId: () => set({ pendingPlanetId: null }),

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

  // ── Crisis support ────────────────────────────────────────────────────────
  /**
   * When the moderation engine detects crisis indicators the post is not
   * stored, but the user's writing is never thrown away. The draft is held
   * here so they decide what happens to it — not the system.
   */
  crisis: {
    open: false,
    draft: '',        // exactly what the user wrote
    referral: null,   // hotline payload from the backend
  },

  openCrisis: ({ draft, referral }) =>
    set({ crisis: { open: true, draft: draft || '', referral: referral || null } }),

  closeCrisis: () =>
    set((s) => ({ crisis: { ...s.crisis, open: false } })),

  /** Clear the draft only once the user has explicitly discarded it. */
  clearCrisisDraft: () =>
    set({ crisis: { open: false, draft: '', referral: null } }),

  // ── Private notes ─────────────────────────────────────────────────────────
  /**
   * Writing the user chose to keep for themselves. Held in sessionStorage
   * only — never sent to the server, and cleared when the tab closes so
   * nothing is left behind on a shared campus computer.
   */
  privateNotes: [],

  loadPrivateNotes: () => {
    try {
      const raw = sessionStorage.getItem('anonemote_private_notes')
      set({ privateNotes: raw ? JSON.parse(raw) : [] })
    } catch {
      set({ privateNotes: [] })
    }
  },

  savePrivateNote: (text) =>
    set((s) => {
      const next = [
        { id: crypto.randomUUID(), text, savedAt: new Date().toISOString() },
        ...s.privateNotes,
      ]
      try {
        sessionStorage.setItem('anonemote_private_notes', JSON.stringify(next))
      } catch { /* storage full or blocked — keep in memory */ }
      return { privateNotes: next }
    }),

  deletePrivateNote: (id) =>
    set((s) => {
      const next = s.privateNotes.filter((n) => n.id !== id)
      try {
        sessionStorage.setItem('anonemote_private_notes', JSON.stringify(next))
      } catch { /* ignore */ }
      return { privateNotes: next }
    }),

  // ── Offline detection (set by SW message or navigator.onLine) ────────────
  isOffline: false,
  setIsOffline: (v) => set({ isOffline: v }),

  // ── Bottom sheet tracking (for body scroll-lock management) ─────────────
  // Array of string IDs representing currently open sheets,
  // e.g. ['planetInfoPanel', 'postModal', 'doodleModal']
  openSheets: [],
  registerSheet: (id) =>
    set((s) => ({
      openSheets: s.openSheets.includes(id) ? s.openSheets : [...s.openSheets, id],
    })),
  unregisterSheet: (id) =>
    set((s) => ({
      openSheets: s.openSheets.filter((x) => x !== id),
    })),

  // ── Modals ────────────────────────────────────────────────────────────────
  postModalOpen: false,
  setPostModalOpen: (v) => set({ postModalOpen: v }),

  // ── Onboarding slice ──────────────────────────────────────────────────────
  onboarding: {
    active: false,       // overlay currently visible
    step: 0,            // 0-indexed current step (0..5)
    totalSteps: 6,
  },
  startOnboarding: () => set({ onboarding: { active: true, step: 0, totalSteps: 6 } }),
  nextOnboardingStep: () => set((s) => ({
    onboarding: { ...s.onboarding, step: Math.min(s.onboarding.step + 1, 5) }
  })),
  prevOnboardingStep: () => set((s) => ({
    onboarding: { ...s.onboarding, step: Math.max(s.onboarding.step - 1, 0) }
  })),
  completeOnboarding: () => set({ onboarding: { active: false, step: 0, totalSteps: 6 } }),

  // ── Toast slice ───────────────────────────────────────────────────────────
  toasts: [], // [{ id, message, type, duration }]
  showToast: ({ message, type = 'success', duration = 3000 }) =>
    set((s) => ({
      toasts: [...s.toasts, { id: crypto.randomUUID(), message, type, duration }]
    })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ── Pending metadata writes for retry ─────────────────────────────────────
  pendingMetadataWrites: [],
}))

export default useAppStore
