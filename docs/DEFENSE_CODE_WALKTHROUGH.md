# AnonEmote — Defense Code Walkthrough

> **Purpose:** This document is your cheat sheet for the capstone defense. It explains how the code works, what each file does, and how to recreate key functions from scratch while presenting. Written in plain language so you can explain confidently to the panel.

---

## Table of Contents

1. [System Architecture (Big Picture)](#1-system-architecture-big-picture)
2. [Project Structure Quick Reference](#2-project-structure-quick-reference)
3. [How to Run Locally](#3-how-to-run-locally)
4. [Frontend: App Boot & Phase Routing](#4-frontend-app-boot--phase-routing)
5. [Frontend: Zustand Global Store](#5-frontend-zustand-global-store)
6. [Frontend: API Layer (apiFetch)](#6-frontend-api-layer-apifetch)
7. [Frontend: Supabase Client & Realtime](#7-frontend-supabase-client--realtime)
8. [Frontend: 3D Scene (React Three Fiber)](#8-frontend-3d-scene-react-three-fiber)
9. [Frontend: Post Creation (PostModal)](#9-frontend-post-creation-postmodal)
10. [Backend: Express Server Setup](#10-backend-express-server-setup)
11. [Backend: Auth Middleware (verifyAuth + requireAuth)](#11-backend-auth-middleware-verifyauth--requireauth)
12. [Backend: Moderation Engine (Three Layers)](#12-backend-moderation-engine-three-layers)
13. [Backend: Post Write Route (/api/moderate)](#13-backend-post-write-route-apimoderate)
14. [Full Data Flow: User Writes a Post](#14-full-data-flow-user-writes-a-post)
15. [Key Design Decisions (Defense Talking Points)](#15-key-design-decisions-defense-talking-points)
16. [How to Recreate Key Functions Live](#16-how-to-recreate-key-functions-live)

---

## 1. System Architecture (Big Picture)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                           │
│                                                                  │
│  React + Vite + React Three Fiber (3D) + Zustand (State)        │
│                                                                  │
│   READS directly ──────┐        WRITES via ──────┐              │
│   (realtime, fast)      │        (moderated)      │              │
└─────────────────────────┼────────────────────────┼──────────────┘
                          │                         │
                          ▼                         ▼
              ┌──────────────────┐      ┌─────────────────────┐
              │   Supabase DB    │◄─────│   Express Backend   │
              │  (PostgreSQL +   │      │  (Node.js on Render)│
              │   Realtime +     │      │                     │
              │   Auth + RLS)    │      │  • Auth verification│
              └──────────────────┘      │  • Rate limiting    │
                                        │  • 3-Layer Moderation│
                                        │  • Audit logging    │
                                        └─────────────────────┘
```

**Key Rule:** The frontend can READ directly from Supabase (fast, realtime), but ALL WRITES go through the backend so content is moderated before reaching the database. No unmoderated content ever enters the system.

---

## 2. Project Structure Quick Reference

```
AnonEmote/
├── frontend/                  # React SPA (what users see)
│   └── src/
│       ├── App.jsx            # Root component, phase router
│       ├── main.jsx           # Entry point, boots the app
│       ├── store/useAppStore.js  # Global state (Zustand)
│       ├── lib/
│       │   ├── api.js         # apiFetch() — talks to backend
│       │   ├── supabase.js    # Supabase client (reads + auth)
│       │   └── persistence.js # localStorage session restore
│       ├── screens/           # Full-page views per phase
│       │   ├── LandingScreen.jsx
│       │   ├── AvatarScreen.jsx
│       │   ├── CheckInScreen.jsx
│       │   └── SpaceScreen.jsx   # THE 3D STAR SYSTEM
│       ├── components/
│       │   ├── 3d/            # Three.js scene components
│       │   └── modals/        # PostModal, CrisisModal, etc.
│       └── data/planets.js    # Planet config (orbits, colors)
│
├── backend/                   # Express API (security layer)
│   └── src/
│       ├── index.js           # Express bootstrap
│       ├── middleware/
│       │   ├── verifyAuth.js  # Extract user from JWT
│       │   └── requireAuth.js # Block if not authenticated
│       ├── moderation/
│       │   ├── engine.js      # THREE-LAYER AI MODERATION
│       │   ├── normalize.js   # Text normalization (leet speak, etc.)
│       │   ├── matcher.js     # Aho-Corasick pattern matching
│       │   └── perspective.js # Google Perspective API client
│       └── routes/
│           ├── moderation.js  # POST /api/moderate (create post)
│           ├── posts.js       # GET /api/posts (read)
│           ├── reactions.js   # POST /api/reactions
│           └── reports.js     # POST /api/reports
│
└── supabase/schema.sql        # Database schema
```

---

## 3. How to Run Locally

```powershell
# Terminal 1 — Backend (port 3005)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## 4. Frontend: App Boot & Phase Routing

**File:** `frontend/src/App.jsx`

**What it does:** This is the root component. Instead of a URL router like React Router, we use "phases" stored in Zustand state to decide which screen to show.

### How it works:

```jsx
// App.jsx — simplified explanation
export default function App() {
  // Get current phase and initializers from the global store
  const { phase, initSession, initAuth } = useAppStore()

  // On first mount: set up auth listener, create session ID
  useEffect(() => {
    initAuth()      // Listen for Supabase auth changes
    initSession()   // Create/restore anonymous session UUID
  }, [])

  // Phase-based rendering — no URL routing needed
  return (
    <div>
      {phase === 'landing' && <LandingScreen />}
      {phase === 'auth'    && <AuthScreen />}
      {phase === 'avatar'  && <AvatarScreen />}
      {phase === 'checkin' && <CheckInScreen />}
      {phase === 'space'   && <SpaceScreen />}

      {/* Global modals that can appear over any screen */}
      {crisis.open && <CrisisModal />}
      {postModalOpen && <PostModal />}
    </div>
  )
}
```

### Navigation Flow:
```
Landing → Auth (sign in/register) → Avatar Creator → Emotion Check-in → 3D Space
```

**Panel question:** "Why not use React Router?"
**Answer:** Our app is a linear flow, not a website with multiple URLs. Users move through phases in order. Zustand state is simpler and avoids URL manipulation. The only hash route is `#admin` for the admin console.

---

## 5. Frontend: Zustand Global Store

**File:** `frontend/src/store/useAppStore.js`

**What it does:** Single source of truth for all app state. Instead of passing props through 10 levels of components, any component can read/write the store directly.

### Structure (simplified):

```javascript
import { create } from 'zustand'

const useAppStore = create((set, get) => ({
  // ── Auth ──
  authUser: null,           // Supabase user object
  isAuthenticated: false,   // Quick boolean check
  initAuth: () => { /* subscribes to Supabase auth changes */ },

  // ── Session ──
  sessionId: null,          // Random UUID (anonymous identity)
  initSession: () => {
    const id = sessionStorage.getItem('anonemote_session') || uuidv4()
    sessionStorage.setItem('anonemote_session', id)
    set({ sessionId: id })
  },

  // ── Phase Navigation ──
  phase: 'landing',
  setPhase: (phase) => set({ phase }),

  // ── Avatar ──
  avatar: { shape: 'orb', auraColor: '#7c3aed', particles: 'stardust' },
  setAvatar: (updates) => set((s) => ({ avatar: { ...s.avatar, ...updates } })),

  // ── Emotion Check-in ──
  checkIn: { feeling: null, nuance: null, prompt: null },
  setCheckIn: (checkIn) => set({ checkIn }),

  // ── Selected Planet ──
  selectedPlanet: null,
  setSelectedPlanet: (planet) => set({ selectedPlanet: planet }),

  // ── Posts (from Supabase) ──
  posts: [],
  addPost: (post) => set((s) => {
    // Deduplicate — the same post arrives from API response AND realtime
    if (s.posts.some(p => p.id === post.id)) return s
    return { posts: [post, ...s.posts] }
  }),

  // ── Reactions (empathy-only emoji) ──
  reactions: {},
  applyReaction: (postId, emoji) => { /* optimistic toggle logic */ },

  // ── Crisis support (never discards user's writing) ──
  crisis: { open: false, draft: '', referral: null },
  openCrisis: ({ draft, referral }) =>
    set({ crisis: { open: true, draft, referral } }),
}))

export default useAppStore
```

### Key Concept — Why Zustand?

```javascript
// Any component can use the store — no prop drilling
function SomeDeepComponent() {
  const selectedPlanet = useAppStore(state => state.selectedPlanet)
  const setPhase = useAppStore(state => state.setPhase)
  // ...use them directly
}
```

**Panel question:** "What is Zustand and why did you use it instead of Redux?"
**Answer:** Zustand is a lightweight state management library (3KB). Unlike Redux, it requires no boilerplate (no actions, reducers, or dispatch). You just create a store with `create()` and any component can subscribe to specific slices of state. It re-renders only components that use the changed data.

---

## 6. Frontend: API Layer (apiFetch)

**File:** `frontend/src/lib/api.js`

**What it does:** Wraps `fetch()` to automatically attach the authentication JWT token and resolve the correct backend URL.

### The Code (this is the full file, it's short):

```javascript
import { supabase } from './supabase'

// In dev: Vite proxy handles /api → backend (no CORS issues)
// In prod: prepend the deployed backend URL
const BASE = import.meta.env.VITE_API_URL || ''
const USE_PROXY = import.meta.env.DEV

// Build the full URL for an API path
export function apiUrl(path) {
  return USE_PROXY ? path : `${BASE}${path}`
}

// Get the JWT token from Supabase Auth
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

// Main fetch wrapper — used by ALL frontend API calls
export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Automatically attach auth token if user is logged in
  if (!headers['Authorization']) {
    const token = await getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  return fetch(apiUrl(path), { ...options, headers })
}
```

### How Components Use It:

```javascript
// In PostModal:
const res = await apiFetch('/api/moderate', {
  method: 'POST',
  body: JSON.stringify({ text: 'hello world', planet_id: 'joy' }),
})
const data = await res.json()
// data = { verdict: 'safe', post: { id, content, created_at, ... } }
```

**Panel question:** "How does authentication work between frontend and backend?"
**Answer:** When a user logs in, Supabase gives them a JWT (JSON Web Token). Our `apiFetch` wrapper automatically pulls this token from the Supabase session and puts it in the `Authorization: Bearer <token>` header. The backend then verifies this token to identify the user.

---

## 7. Frontend: Supabase Client & Realtime

**File:** `frontend/src/lib/supabase.js`

### The Code (entire file):

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### How We Use Supabase in the App:

```javascript
// 1. Authentication (login/register)
await supabase.auth.signUp({ email, password })
await supabase.auth.signInWithPassword({ email, password })

// 2. Reading posts directly (fast, no backend needed)
const { data } = await supabase
  .from('posts')
  .select('*')
  .eq('planet_id', 'joy')
  .order('created_at', { ascending: false })

// 3. Realtime subscriptions (posts appear instantly for all users)
supabase
  .channel('posts-realtime')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' },
    (payload) => {
      addPost(payload.new)  // Immediately shows new post to everyone
    }
  )
  .subscribe()

// 4. Presence (see other users in the 3D space)
const channel = supabase.channel('presence-room')
channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    channel.track({ avatar: myAvatar, position: myPosition })
  }
})
```

**Panel question:** "Why do reads go directly to Supabase but writes go through your backend?"
**Answer:** Reading is safe — Row Level Security (RLS) in PostgreSQL controls what data is visible. But writes need moderation. If the frontend could write directly, users could bypass our AI moderation by editing their browser requests. Routing writes through the backend guarantees every post is checked.

---

## 8. Frontend: 3D Scene (React Three Fiber)

**File:** `frontend/src/screens/SpaceScreen.jsx`

**What it does:** Renders the interactive 3D star system using React Three Fiber (a React wrapper for Three.js).

### Key Concepts:

```jsx
import { Canvas } from '@react-three/fiber'      // React wrapper for Three.js
import { OrbitControls } from '@react-three/drei' // Camera controls (drag/zoom)
import { Bloom } from '@react-three/postprocessing' // Glow effects

export default function SpaceScreen() {
  return (
    <div style={{ height: '100dvh' }}>
      {/* Canvas = the 3D rendering surface */}
      <Canvas camera={{ position: [0, 8, 40] }}>
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 0, 0]} intensity={2} />

        {/* The scene content */}
        <StarSystem />           {/* Sun + planets + orbits */}
        <GalacticBackdrop />     {/* Star field background */}
        <PeerAvatars />          {/* Other users (multiplayer) */}

        {/* Camera controls — drag to orbit, scroll to zoom */}
        <OrbitControls enableDamping dampingFactor={0.05} />

        {/* Post-processing (glow effects) */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.6} intensity={0.5} />
        </EffectComposer>
      </Canvas>

      {/* HTML overlays on top of the 3D scene */}
      <HUD />           {/* Top bar with user avatar + sign out */}
      <PlanetNav />     {/* Bottom navigation strip */}
    </div>
  )
}
```

### Camera State Machine (CameraRig):

```
User clicks a planet:
  → Camera flies toward planet (lerp animation)
  → Arrives → OrbitControls re-enabled, pivot follows moving planet

User deselects (clicks away / presses Escape):
  → Camera flies back to default overview position
  → OrbitControls reset to center
```

```javascript
// Simplified camera fly-in logic (runs every frame via useFrame)
useFrame(() => {
  if (phase === 'flying') {
    // Move camera 6% closer to destination each frame (smooth lerp)
    camera.position.lerp(targetPosition, 0.06)
    camera.lookAt(planetPosition)

    // Check if we've arrived (close enough)
    if (camera.position.distanceTo(targetPosition) < 1.2) {
      phase = 'tracking'  // Switch to free orbit mode
      controls.enabled = true
    }
  }
})
```

**Panel question:** "How does React Three Fiber work?"
**Answer:** React Three Fiber lets us write Three.js scenes using JSX. Instead of imperatively creating objects (`new THREE.Mesh()`), we declare them as components (`<mesh />`). React handles the lifecycle (mount/unmount/update). The `useFrame` hook gives us a render loop callback that runs 60 times per second.

---

## 9. Frontend: Post Creation (PostModal)

**File:** `frontend/src/components/modals/PostModal.jsx`

**What it does:** The composer where users type their message and submit it. Handles all moderation response states (success, blocked, crisis).

### Simplified Flow:

```jsx
function PostModal() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle')
  // status: 'idle' | 'checking' | 'blocked' | 'success' | 'error'

  const handleSubmit = async () => {
    setStatus('checking')

    // Send to backend for moderation + storage
    const res = await apiFetch('/api/moderate', {
      method: 'POST',
      body: JSON.stringify({
        text: text.trim(),
        planet_id: selectedPlanet.id,
      }),
    })
    const data = await res.json()

    // Handle the three possible outcomes:
    if (res.status === 403) {
      // CRISIS — user may be in danger
      // Preserve their draft (NEVER discard it), show helpline
      openCrisis({ draft: text, referral: data.referral })
    }
    else if (res.status === 406) {
      // TOXIC — blocked, show inline error
      setStatus('blocked')
      setErrorMsg(data.error)
    }
    else if (res.ok) {
      // SAFE — post created! Add to local state, close modal
      addPost(data.post)
      setStatus('success')
      showToast({ message: 'Post broadcast successfully!' })
    }
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={280}
        placeholder="Share what's on your mind..."
      />
      <span>{280 - text.length} characters remaining</span>
      <button onClick={handleSubmit} disabled={!text.trim()}>
        Broadcast
      </button>
    </div>
  )
}
```

### Key UX Decisions:
- **280 char limit** — keeps posts concise (like old Twitter)
- **Rocket animation** — visual feedback during submission (rumble → launch / fail)
- **Crisis draft preservation** — if crisis is detected, the user's writing is saved, not deleted
- **Dirty-close protection** — closing with unsaved text shows a confirm dialog

---

## 10. Backend: Express Server Setup

**File:** `backend/src/index.js`

**What it does:** Creates the Express HTTP server, sets up security, and mounts all routes.

### The Boot Sequence:

```javascript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { verifyAuth } from './middleware/verifyAuth.js'

const app = express()

// 1. Trust the proxy (Render's load balancer) for correct IP addresses
app.set('trust proxy', 1)

// 2. Security headers (XSS protection, HSTS, etc.)
app.use(helmet())

// 3. CORS — only allow requests from our frontend domains
app.use(cors({
  origin(origin, callback) {
    // Allow: localhost, our Vercel domain, preview deployments
    if (allowedOrigins.includes(origin)) return callback(null, true)
    if (/anonemoteproject\.vercel\.app/.test(origin)) return callback(null, true)
    return callback(new Error('Not allowed by CORS'))
  }
}))

// 4. Parse JSON bodies (limit 1MB for doodle drawings)
app.use(express.json({ limit: '1mb' }))

// 5. Auth extraction on EVERY request (but doesn't block)
app.use(verifyAuth)

// 6. Mount route handlers
app.use('/api/moderate', moderationRouter)   // Create posts
app.use('/api/posts', postsRouter)           // Read posts
app.use('/api/reactions', reactionsRouter)   // React to posts
app.use('/api/reports', reportsRouter)       // Report posts
app.use('/api/replies', repliesRouter)       // Reply (Seek Advice only)
app.use('/api/admin', adminRouter)           // Admin console

// 7. Start listening
app.listen(3001, () => console.log('Backend running on :3001'))
```

**Panel question:** "What does middleware mean?"
**Answer:** Middleware are functions that run on every request before reaching the route handler. They form a pipeline: `Request → helmet → cors → json parser → verifyAuth → route handler → Response`. Each one processes the request and passes it to the next with `next()`.

---

## 11. Backend: Auth Middleware (verifyAuth + requireAuth)

**Files:** `backend/src/middleware/verifyAuth.js` + `requireAuth.js`

### How Authentication Works (Two-Step):

**Step 1 — verifyAuth (runs on ALL requests, never blocks):**

```javascript
export async function verifyAuth(req, res, next) {
  // Default: unauthenticated
  req.userId = null
  req.isAuthenticated = false

  // Check for Bearer token in the Authorization header
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()  // No token — continue as guest
  }

  // Extract the token
  const token = authHeader.slice(7)  // Remove "Bearer " prefix

  // Verify with Supabase — is this a real, valid token?
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (!error && user) {
    req.userId = user.id          // UUID of authenticated user
    req.isAuthenticated = true
  }

  next()  // Always continue — never blocks
}
```

**Step 2 — requireAuth (only on write routes, BLOCKS guests):**

```javascript
export function requireAuth(req, res, next) {
  if (!req.isAuthenticated) {
    return res.status(401).json({
      error: 'Authentication required. Please sign in.'
    })
  }
  next()  // Authenticated — continue to route handler
}
```

### Why Two Separate Middlewares?

```
GET /api/posts     → verifyAuth → postsRouter       (guests CAN read)
POST /api/moderate → verifyAuth → requireAuth → moderationRouter (guests CANNOT write)
```

Guests can browse freely. Only writing requires login.

**Panel question:** "What is a JWT?"
**Answer:** A JSON Web Token is a signed string containing the user's ID and expiration time. It's signed by Supabase's secret key, so we can verify it's authentic without a database lookup. The frontend gets it on login and sends it with every request.

---

## 12. Backend: Moderation Engine (Three Layers)

**File:** `backend/src/moderation/engine.js`

This is the core innovation of AnonEmote — the hybrid AI content moderation system.

### The Three Layers (in priority order):

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: CRISIS DETECTION (Highest Priority)                 │
│ • Suicidal ideation / self-harm keywords                     │
│ • Languages: English, Filipino, Bikol                        │
│ • Method: Aho-Corasick multi-pattern matching                │
│ • Result: verdict 'crisis' → 403 + emergency referral       │
│ • CANNOT be overridden by any allow-list                     │
├─────────────────────────────────────────────────────────────┤
│ LAYER 2: VERNACULAR TOXICITY (Local Keywords)                │
│ • Filipino/Bikol profanity & slurs (not in Perspective API)  │
│ • Method: Aho-Corasick + word-boundary check + safe-context  │
│ • If ≥3 safe-context phrases present → 'review' (held)      │
│ • Otherwise → verdict 'toxic' → 406                         │
├─────────────────────────────────────────────────────────────┤
│ LAYER 3: ML TOXICITY (Google Perspective API)                │
│ • English machine learning (TOXICITY, SEVERE_TOXICITY, etc.) │
│ • Catches nuanced/novel toxicity keywords miss               │
│ • Fallback: if API down, local Aho-Corasick scan instead    │
│ • Result: verdict 'toxic' → 406 OR 'safe' → 200            │
└─────────────────────────────────────────────────────────────┘
```

### Simplified Code:

```javascript
export async function moderate(text) {
  // Validation
  if (!text || text.length > 280) return { verdict: 'toxic', reason: 'Invalid.' }

  // Normalize: remove leet speak, repeated chars, diacritics, etc.
  const clean = normalize(text)       // "h3ll0" → "hello"
  const raw = text.toLowerCase()

  // ── LAYER 1: Crisis (can NEVER be bypassed) ──
  const crisisHits = searchAll(crisisAutomaton, clean)
  if (crisisHits.length > 0) {
    return { verdict: 'crisis', reason: 'Crisis indicators detected.' }
  }

  // ── LAYER 2: Vernacular toxicity ──
  const toxicHits = searchAll(toxicAutomaton, clean)
    .filter(match => hasWordBoundary(clean, match))        // "class" ≠ "ass"
    .filter(match => !isCoveredBySafeContext(match, ...))  // "I feel like shit" = emotional

  if (toxicHits.length > 0) {
    // If the post has many emotional phrases, hold for review instead of blocking
    const safeContextCount = countDistinctSafeContexts(clean)
    if (safeContextCount >= 3) {
      return { verdict: 'review', reason: 'Held for human review.' }
    }
    return { verdict: 'toxic', reason: 'Harmful language detected.' }
  }

  // ── LAYER 3: Google Perspective API (English ML) ──
  const scores = await scoreText(text)  // { TOXICITY: 0.8, ... }
  if (scores.ok && scores.blocked) {
    return { verdict: 'toxic' }
  }

  // If Perspective is DOWN — fallback to local keyword scan
  if (!scores.ok) {
    const fallbackHits = searchAll(fallbackAutomaton, clean)
    if (fallbackHits.length > 0) return { verdict: 'toxic' }
  }

  return { verdict: 'safe' }  // All layers passed!
}
```

### Key Technical Details:

**Aho-Corasick Algorithm:**
```javascript
// Traditional approach: loop through 500+ keywords, O(n × k)
// Aho-Corasick: scan text ONCE, find ALL matches, O(n + m)
// Where n = text length, m = total matches

const automaton = buildAutomaton(['putangina', 'gago', 'bobo', ...500 more])
const matches = searchAll(automaton, normalizedText)
// Returns: [{ term: 'gago', start: 12, end: 16 }, ...]
```

**10-Step Normalization Pipeline:**
```javascript
// normalize("h3LL0 w0rLd!!!")
// Step 1: Lowercase          → "h3ll0 w0rld!!!"
// Step 2: Remove diacritics  → (strip accents)
// Step 3: Leet speak         → "hello world!!!"
// Step 4: Repeated chars     → "helo world!!!"  (no triple+ chars)
// Step 5: Remove punctuation → "hello world"
// ... (5 more steps for Filipino-specific patterns)
```

**Safe-Context Suppression:**
```javascript
// "I feel like shit today" — has toxic word "shit" BUT...
// "I feel like" = safe-context phrase (emotional expression)
// The toxic match is INSIDE a safe-context span → suppressed

// "you're a piece of shit" — no safe-context → BLOCKED
```

**Panel question:** "Why not just use Google Perspective API for everything?"
**Answer:** Perspective API only works for English. Our users write in Filipino and Bikol, which the API does not support. That's why we built Layer 2 with local keyword matching for Filipino/Bikol, while Layer 3 handles English via ML. Also, if the API goes down, our local fallback ensures moderation never fails open — content is never silently let through.

---

## 13. Backend: Post Write Route (/api/moderate)

**File:** `backend/src/routes/moderation.js`

**What it does:** The single entry point for creating posts. Moderates content, then inserts into the database.

### Full Flow:

```javascript
import { requireAuth } from '../middleware/requireAuth.js'
import { moderate } from '../moderation/engine.js'

// Middleware chain: rate limit → auth check → handler
moderationRouter.post('/', rateLimit({ max: 20, windowMs: 60000 }), requireAuth, 
  async (req, res) => {

    // 1. Extract and validate input
    const { text, planet_id } = req.body
    if (!text) return res.status(400).json({ error: 'text is required.' })

    const VALID_PLANETS = ['joy', 'vent', 'advice', 'grief', 'anxiety', 'neutral', 'doodle']
    if (!VALID_PLANETS.includes(planet_id)) {
      return res.status(400).json({ error: 'Invalid planet_id.' })
    }

    // 2. Run moderation (the three-layer engine)
    const result = await moderate(text)

    // 3. Log audit entry (NEVER logs the actual text — privacy)
    appendAudit({ verdict: result.verdict, textLength: text.length, planet_id })

    // 4. Handle verdict
    if (result.verdict === 'crisis') {
      return res.status(403).json({
        verdict: 'crisis',
        referral: 'Please contact the mental health hotline at 1553.'
      })
    }

    if (result.verdict === 'toxic') {
      return res.status(406).json({
        verdict: 'toxic',
        error: 'Your message was flagged for harmful language.'
      })
    }

    // 5. Safe — insert into database
    // IMPORTANT: author_id comes from the verified JWT, NOT from the client
    const { data: post } = await supabase
      .from('posts')
      .insert({
        content: text.trim(),
        planet_id,
        session_id: req.userId,   // Server-derived (can't be faked)
        author_id: req.userId,    // Server-derived (can't be faked)
      })
      .select()
      .single()

    return res.status(200).json({ verdict: 'safe', post })
  }
)
```

### Security Layers in this Route:
1. **Rate limiting** — max 20 posts per minute per IP
2. **JWT verification** — user must be logged in
3. **Input validation** — text required, valid planet ID
4. **AI moderation** — three-layer content check
5. **Server-derived IDs** — author_id from JWT, not client input
6. **Audit logging** — without storing text content (privacy)

**Panel question:** "Why is author_id set by the server and not the client?"
**Answer:** If the client could set their own author_id, any user could impersonate another user by editing the request in their browser's dev tools. By deriving it from the verified JWT token (`req.userId`), we guarantee the author_id is authentic and cannot be forged.

---

## 14. Full Data Flow: User Writes a Post

This is the complete journey of a post from typing to appearing for all users:

```
1. USER types "Ang hirap ng exam" in PostModal
   └─ text state updates, character counter shows "261 remaining"

2. USER clicks "Broadcast" button
   └─ handleSubmit() called, rocket animation starts rumbling

3. FRONTEND calls apiFetch('/api/moderate', { text, planet_id: 'vent' })
   └─ apiFetch automatically gets JWT from Supabase session
   └─ Sends: POST https://anonemote.onrender.com/api/moderate
              Authorization: Bearer eyJhbG...
              Body: { "text": "Ang hirap ng exam", "planet_id": "vent" }

4. BACKEND receives request
   └─ helmet() adds security headers
   └─ cors() checks origin is allowed
   └─ express.json() parses the body
   └─ verifyAuth() extracts user ID from JWT → req.userId = "abc-123"
   └─ rateLimit() checks IP hasn't exceeded 20/min
   └─ requireAuth() confirms req.isAuthenticated === true

5. BACKEND runs moderate("Ang hirap ng exam")
   └─ normalize() → "ang hirap ng exam" (already clean)
   └─ Layer 1 (Crisis): No crisis keywords found ✓
   └─ Layer 2 (Vernacular): No toxic keywords found ✓
   └─ Layer 3 (Perspective): API returns TOXICITY: 0.05 (safe) ✓
   └─ Result: { verdict: 'safe' }

6. BACKEND inserts into Supabase
   └─ INSERT INTO posts (content, planet_id, session_id, author_id)
      VALUES ('Ang hirap ng exam', 'vent', 'abc-123', 'abc-123')
   └─ Returns the new row with id, created_at, etc.

7. BACKEND responds: 200 { verdict: 'safe', post: { id: '...', content: '...', ... } }

8. FRONTEND receives success
   └─ addPost(data.post) — adds to local Zustand store (instant for this user)
   └─ Rocket launches! 🚀 
   └─ Toast: "Post broadcast successfully!"

9. SUPABASE REALTIME fires INSERT event to ALL other connected browsers
   └─ Other users' SpaceScreen subscription triggers:
      channel.on('postgres_changes', { event: 'INSERT', table: 'posts' }, (payload) => {
        addPost(payload.new)  // Post appears for everyone instantly
      })

10. ALL USERS see the post under the "Venting" planet
```

---

## 15. Key Design Decisions (Defense Talking Points)

### "Why full anonymity?"
- Target users are Filipino college students dealing with social performance pressure
- Social stigma around mental health is high in Philippine culture
- Anonymity removes fear of judgment → encourages genuine emotional expression
- Based on Online Disinhibition Effect (Suler, 2004) — anonymity enables honest sharing

### "How do you prevent abuse without accounts?"
- Three-layer AI moderation catches toxicity before it enters the database
- Rate limiting (20 posts/min) prevents spam
- HMAC-SHA256 report deduplication prevents report manipulation
- Admin dashboard for human review of flagged content
- Auto-quarantine after multiple independent reports

### "What happens during a crisis detection?"
1. User's message is **NEVER deleted** — preserved as `crisis.draft` in the store
2. Emergency referral shown (1553 mental health hotline)
3. User can choose to:
   - Call the hotline
   - Keep their draft as a private note (sessionStorage only)
   - Return to editing (PostModal re-opens with their text intact)
4. Principle: **The system never decides what to do with the user's writing — the user does.**

### "How does the hybrid auth model work?"
- **Social layer:** Completely anonymous. No names, no profiles, no visible identity.
- **Behind the scenes:** Every post has `author_id` (Supabase Auth UUID) for admin investigation.
- **Guests:** Can browse everything. Writing requires sign-up (anonymous — only email, no real name).
- **Why:** Balances user privacy with platform safety. Admin can investigate harassment patterns without exposing identities to other users.

### "Why React Three Fiber instead of plain Three.js?"
- Declarative (JSX) instead of imperative — easier to manage complex scenes
- Automatic cleanup (unmounting components disposes GPU resources)
- React hooks work inside the 3D scene (`useState`, `useEffect`, `useRef`)
- Ecosystem: drei (helpers), postprocessing (effects) — no boilerplate

### "What is Aho-Corasick and why use it?"
- Algorithm for matching multiple patterns simultaneously in one pass
- Traditional approach: loop through 500 keywords = O(n × 500) per post
- Aho-Corasick: build an automaton (state machine) at startup, then scan any text in O(n) — regardless of how many keywords exist
- Critical for performance when we have 500+ terms across 3 languages

---

## 16. How to Recreate Key Functions Live

Here are the functions you can write from scratch during the defense to demonstrate understanding:

---

### A. Recreate: apiFetch (the simplest one — start here)

**What to type:**
```javascript
// lib/api.js — fetch wrapper with auto JWT

import { supabase } from './supabase'

// Get JWT from current session
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

// Main wrapper — attaches auth and resolves URL
export async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }

  // Auto-attach token if user is logged in
  if (!headers['Authorization']) {
    const token = await getAuthToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(path, { ...options, headers })
}
```

**Explain while typing:** "This wrapper ensures every API call from the frontend includes the user's authentication token. It reads the JWT from Supabase's session and puts it in the Authorization header. This way, the backend always knows who is making the request."

---

### B. Recreate: requireAuth middleware

**What to type:**
```javascript
// middleware/requireAuth.js

export function requireAuth(req, res, next) {
  // verifyAuth already ran — it set req.isAuthenticated
  if (!req.isAuthenticated) {
    return res.status(401).json({ error: 'Authentication required.' })
  }
  next()  // User is verified — continue to route handler
}
```

**Explain while typing:** "This is the gatekeeper for write operations. It runs after verifyAuth which extracts the user from the JWT. If the user isn't authenticated, they get a 401 error. If they are, `next()` passes them to the actual route handler. It's only 5 lines, but it protects every write endpoint."

---

### C. Recreate: verifyAuth middleware

**What to type:**
```javascript
// middleware/verifyAuth.js
import { getSupabase } from '../lib/supabase.js'

export async function verifyAuth(req, res, next) {
  req.userId = null
  req.isAuthenticated = false

  // Look for "Bearer <token>" in headers
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return next()

  const token = header.slice(7)  // Remove "Bearer " prefix

  // Ask Supabase: "Is this token valid? Who does it belong to?"
  const supabase = getSupabase()
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (!error && user) {
    req.userId = user.id
    req.isAuthenticated = true
  }

  next()  // Always continue — never blocks (guests can still read)
}
```

**Explain while typing:** "This runs on every single request. It extracts the JWT from the Authorization header, asks Supabase to verify it, and if valid, attaches the user's ID to the request. Importantly, it NEVER blocks — it just enriches the request with auth info. That way guests can still read posts."

---

### D. Recreate: Zustand store (core slice)

**What to type:**
```javascript
// store/useAppStore.js
import { create } from 'zustand'

const useAppStore = create((set, get) => ({
  // Current screen
  phase: 'landing',
  setPhase: (phase) => set({ phase }),

  // Selected planet in the 3D scene
  selectedPlanet: null,
  setSelectedPlanet: (planet) => set({ selectedPlanet: planet }),

  // All posts loaded from database
  posts: [],
  addPost: (post) => set((state) => {
    // Prevent duplicates (same post arrives from API + realtime)
    if (state.posts.some(p => p.id === post.id)) return state
    return { posts: [post, ...state.posts] }
  }),

  // Crisis support — NEVER discard user's writing
  crisis: { open: false, draft: '', referral: null },
  openCrisis: ({ draft, referral }) =>
    set({ crisis: { open: true, draft, referral } }),
}))

export default useAppStore
```

**Explain while typing:** "Zustand gives us global state with almost no boilerplate. `create()` takes a function that receives `set` and `get`. Each property is either state or an action. Any component can use `useAppStore(s => s.phase)` to subscribe to just the phase. The `addPost` action deduplicates because the same post arrives twice — once from our API response and once from Supabase Realtime."

---

### E. Recreate: Moderation route (simplified)

**What to type:**
```javascript
// routes/moderation.js
import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { moderate } from '../moderation/engine.js'

export const moderationRouter = Router()

moderationRouter.post('/', requireAuth, async (req, res) => {
  const { text, planet_id } = req.body

  // Validate input
  if (!text) return res.status(400).json({ error: 'text is required.' })

  // Run three-layer moderation
  const result = await moderate(text)

  // Crisis → show emergency resources
  if (result.verdict === 'crisis') {
    return res.status(403).json({
      verdict: 'crisis',
      referral: 'Contact mental health hotline: 1553'
    })
  }

  // Toxic → block the post
  if (result.verdict === 'toxic') {
    return res.status(406).json({ verdict: 'toxic', error: result.reason })
  }

  // Safe → store in database (author_id from verified JWT, not client)
  const { data: post } = await supabase.from('posts').insert({
    content: text.trim(),
    planet_id,
    author_id: req.userId,  // Server-derived, tamper-proof
  }).select().single()

  return res.status(200).json({ verdict: 'safe', post })
})
```

**Explain while typing:** "This is the write path. Every post goes through here. The middleware chain ensures the user is authenticated and rate-limited. Then we run the three-layer moderation engine. Crisis content gets a 403 with helpline info — but the user's draft is preserved on the frontend. Toxic content is blocked with 406. Safe content gets inserted with the author_id derived from the verified JWT — not from what the client sends."

---

### F. Recreate: handleSubmit in PostModal (frontend side)

**What to type:**
```javascript
const handleSubmit = async () => {
  if (!text.trim()) return
  setStatus('checking')

  const res = await apiFetch('/api/moderate', {
    method: 'POST',
    body: JSON.stringify({ text: text.trim(), planet_id: selectedPlanet.id }),
  })
  const data = await res.json()

  if (res.status === 403) {
    // Crisis detected — preserve draft, show helpline
    openCrisis({ draft: text, referral: data.referral })
  } else if (res.status === 406) {
    // Blocked — show error message
    setStatus('blocked')
    setErrorMsg(data.error)
  } else if (res.ok) {
    // Success — add post locally, close modal
    addPost(data.post)
    showToast({ message: 'Post broadcast successfully!' })
    setPostModalOpen(false)
  }
}
```

**Explain while typing:** "The frontend submits to our moderation endpoint and handles three possible responses. 403 means crisis — we preserve the draft and show emergency contacts. 406 means toxic content — we show the user a friendly error. 200 means safe — the post was moderated and stored, so we add it to local state and show success feedback."

---

## Presentation Tips

1. **Start with the architecture diagram** (Section 1) — give the panel the big picture first.
2. **If asked to code live**, pick function A or B first — they're the shortest and easiest to explain.
3. **Always explain WHY**, not just what. Every design choice has a reason tied to the thesis.
4. **Key terms to use naturally:**
   - "Hybrid AI moderation" (not just "keyword filter")
   - "Three-layer pipeline" (crisis → vernacular → ML)
   - "Server-derived identity" (not "client sends author_id")
   - "Crisis preservation" (not "blocking the message")
   - "Aho-Corasick automaton" (not "keyword loop")
5. **If the panel asks something you don't know**, it's okay to say "Let me check the code" and show them the actual file.

---

## Quick Reference: HTTP Status Codes

| Code | Meaning in AnonEmote | When |
|------|---------------------|------|
| 200  | Success             | Post saved, reactions applied |
| 400  | Bad request         | Missing text, invalid planet_id |
| 401  | Not authenticated   | Guest trying to write |
| 403  | Crisis detected     | Self-harm indicators found |
| 406  | Toxic content       | Harmful language blocked |
| 429  | Rate limited        | Too many requests |
| 500  | Server error        | Database unreachable |

---

## Quick Reference: Key Libraries

| Library | What it does | Where used |
|---------|-------------|-----------|
| React | UI framework | Frontend — all components |
| Zustand | Global state management | `useAppStore.js` |
| React Three Fiber | 3D rendering in React | SpaceScreen, all `3d/` components |
| @react-three/drei | 3D helpers (OrbitControls, etc.) | SpaceScreen, StarSystem |
| Supabase JS | Database + Auth + Realtime | Both frontend & backend |
| Express | HTTP server framework | Backend — all routes |
| Helmet | Security HTTP headers | Backend middleware |
| Vite | Frontend bundler (fast HMR) | Development & build |
| Tailwind CSS | Utility-first CSS | Frontend styling |

---

*Good luck sa defense! Kaya 'yan! 💪*
