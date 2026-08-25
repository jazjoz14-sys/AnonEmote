# AnonEmote — Code Learning Guide

> **Purpose:** Understand how the entire codebase works from scratch. Written for someone who knows basic programming but needs to understand THIS project's architecture, patterns, and data flow. Read this before diving into individual files.

---

## Table of Contents

1. [The Big Picture (How Everything Connects)](#1-the-big-picture)
2. [How Each Screen Works](#2-how-each-screen-works)
3. [How State Works (Zustand Store)](#3-how-state-works-zustand-store)
4. [How Authentication Works](#4-how-authentication-works)
5. [How Moderation Works (The Three Layers)](#5-how-moderation-works)
6. [How Real-time Works](#6-how-real-time-works)
7. [How the 3D Scene Works](#7-how-the-3d-scene-works)
8. [How the Database is Structured](#8-how-the-database-is-structured)
9. [Key Code Patterns](#9-key-code-patterns)
10. [File Reading Order (Start Here)](#10-file-reading-order)
11. [Complete Data Flow Examples](#11-complete-data-flow-examples)
12. [Glossary (Terms You'll Hear)](#12-glossary)

---

## 1. The Big Picture

AnonEmote has three main parts that talk to each other:

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + 3D)                       │
│                 What the user sees and touches                 │
│                                                               │
│  • 3D star system with 7 planets                             │
│  • Post composer modal                                        │
│  • Avatar customizer                                          │
│  • Emotion check-in                                           │
│  • Admin console                                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   READS directly from Supabase      WRITES go to Backend     │
│   (fast, real-time updates)          (content gets moderated) │
│                                                               │
└──────────────┬───────────────────────────────┬───────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────┐         ┌─────────────────────────────┐
│      SUPABASE        │◄────────│         BACKEND             │
│   (Database + Auth)   │         │     (Express API Server)    │
│                      │         │                             │
│  • PostgreSQL tables  │         │  • JWT verification         │
│  • Row Level Security │         │  • Rate limiting            │
│  • Auth (JWT tokens) │         │  • 3-Layer moderation       │
│  • Realtime events   │         │  • Audit logging            │
│  • Presence tracking │         │  • Admin endpoints          │
└──────────────────────┘         └─────────────────────────────┘
```

### The Golden Rule

> **Frontend READS directly from Supabase. All WRITES go through the Backend.**

Why? Reading is safe (Row Level Security protects data). Writing needs moderation — if the frontend could write directly, users could bypass moderation by editing browser requests.

### What Happens When a User Posts

```
User types → Frontend sends to Backend → Backend moderates → 
Backend stores in Supabase → Supabase broadcasts to ALL frontends → 
Everyone sees the new post
```

---

## 2. How Each Screen Works

The app doesn't use URL routing (like `/home`, `/profile`). Instead, it uses a "phase" system — a variable in the Zustand store that controls which screen is shown.

```
phase = 'landing'  →  LandingScreen.jsx
phase = 'auth'     →  AuthScreen.jsx
phase = 'avatar'   →  AvatarScreen.jsx
phase = 'checkin'  →  CheckInScreen.jsx
phase = 'space'    →  SpaceScreen.jsx
```

In `App.jsx`, this looks like:
```jsx
{phase === 'landing' && <LandingScreen />}
{phase === 'auth'    && <AuthScreen />}
{phase === 'avatar'  && <AvatarScreen />}
{phase === 'checkin' && <CheckInScreen />}
{phase === 'space'   && <SpaceScreen />}
```

Only one screen renders at a time. Navigation is just: `setPhase('avatar')`.

---

### LandingScreen

**File:** `frontend/src/screens/LandingScreen.jsx`

**What it shows:** The first thing users see — a scroll-jacking horizontal carousel showing each planet with descriptions, quotes, and a 3D preview.

**How it works:**
- One persistent `<Canvas>` renders 3D planets using `<CarouselPlanetScene>`
- Vertical scroll is intercepted and converted to horizontal `translateX` movement
- Each "slide" shows a planet's icon, name, description, and traits
- The Call-to-Action button sets `phase = 'auth'`

**Key technical detail:** Uses a SINGLE Canvas with `<View>` components from drei to avoid creating multiple WebGL contexts (browsers cap at 8-16).

---

### AuthScreen

**File:** `frontend/src/screens/AuthScreen.jsx`

**What it shows:** Sign-up and sign-in forms.

**How it works:**
- Two modes: "register" and "login" (toggled with a link)
- Calls `supabase.auth.signUp()` or `supabase.auth.signInWithPassword()`
- On success, the `onAuthStateChange` listener in the store fires → sets `isAuthenticated = true`
- Then sets `phase = 'avatar'` (or restores from persistence if returning user)

---

### AvatarScreen

**File:** `frontend/src/screens/AvatarScreen.jsx`

**What it shows:** A 3D preview of the user's abstract avatar with customization controls.

**How it works:**
- R3F Canvas shows the current avatar shape (orb, prism, spirit, etc.)
- `AvatarCustomizer` component provides shape picker, color picker, particle selector
- Choices write to `useAppStore.avatar` → persisted to localStorage
- "Continue" button sets `phase = 'checkin'`

---

### CheckInScreen

**File:** `frontend/src/screens/CheckInScreen.jsx`

**What it shows:** Two-phase emotion check-in.

**Phase 1 — MoodSpace:**
- A continuous 2D field where cursor/touch position maps to an emotional state
- Not discrete buttons — a spectrum from calm→intense, positive→negative
- User selects their broad emotional area

**Phase 2 — NuanceConstellation:**
- Based on the broad feeling, shows specific sub-emotions arranged in a constellation pattern
- User taps one (e.g., under "Anxiety": "overwhelm", "dread", "uncertainty")
- A tailored writing prompt appears

**After check-in:** Sets `phase = 'space'` → user enters the 3D star system.

---

### SpaceScreen

**File:** `frontend/src/screens/SpaceScreen.jsx`

**What it shows:** The main experience — the full 3D star system.

**Components inside:**
- `<Canvas>` — The WebGL rendering surface (full-screen)
- `<StarSystem>` — Central star + 7 orbiting planets + orbit rings
- `<GalacticBackdrop>` — Star field background
- `<PeerAvatars>` — Other users' abstract avatars (multiplayer)
- `<CameraRig>` — Manages camera fly-in/out when selecting planets
- `<OrbitControls>` — Drag/zoom/pan camera
- `<EffectComposer>` — Post-processing (Bloom glow, Vignette)
- `<HUD>` — HTML overlay: top bar with avatar + sign out
- `<PlanetNav>` — HTML overlay: bottom navigation strip
- `<PlanetInfoPanel>` — Shows posts when a planet is selected

**Camera behavior:**
1. Default: overview position showing the entire star system
2. Click planet → camera flies toward it (smooth lerp animation)
3. Arrives → OrbitControls re-enables, pivot follows the orbiting planet
4. Deselect → camera flies back to overview

---

## 3. How State Works (Zustand Store)

**File:** `frontend/src/store/useAppStore.js`

Zustand is like a global variable that React components can subscribe to. When the variable changes, only the components that USE that specific variable re-render.

### The Store Structure

```javascript
const useAppStore = create((set, get) => ({
  // ── Auth ──
  authUser: null,           // The Supabase user object (or null if logged out)
  isAuthenticated: false,   // Quick boolean check
  authLoading: true,        // True while checking if there's an existing session

  // ── Session ──
  sessionId: null,          // Random UUID stored in sessionStorage

  // ── Phase (Navigation) ──
  phase: 'landing',         // Which screen to show

  // ── Avatar ──
  avatar: { shape: 'orb', auraColor: '#7c3aed', particles: 'stardust' },

  // ── Emotion Check-in ──
  checkIn: { feeling: null, nuance: null, prompt: null },

  // ── Selected Planet ──
  selectedPlanet: null,     // Which planet the camera is focused on

  // ── Posts ──
  posts: [],                // All loaded posts

  // ── Reactions ──
  reactions: {},            // { postId: { '🫂': 3, '💙': 1, ... } }

  // ── Crisis ──
  crisis: { open: false, draft: '', referral: null },

  // ── Modals ──
  postModalOpen: false,
  reportTarget: null,

  // ... plus actions (functions that modify state)
}))
```

### How Components Use the Store

```jsx
// Reading state (subscribes to changes)
function MyComponent() {
  const phase = useAppStore((state) => state.phase)
  const avatar = useAppStore((state) => state.avatar)
  // Component re-renders ONLY when phase or avatar changes
}

// Writing state
function handleClick() {
  useAppStore.getState().setPhase('space')
  // OR inside a component:
  const setPhase = useAppStore((s) => s.setPhase)
  setPhase('space')
}
```

### Key Concept: Selectors

```jsx
// BAD — re-renders on ANY store change
const store = useAppStore()

// GOOD — re-renders ONLY when `phase` changes
const phase = useAppStore((s) => s.phase)
```

Always select the smallest piece of state you need. This prevents unnecessary re-renders (critical for 60fps 3D performance).

### Persistence

For authenticated users, certain state (phase, avatar, checkIn) is saved to localStorage:
- `saveState(userId, data)` — writes to `anonemote_state_{userId}`
- `loadState(userId)` — reads and validates with schema check
- `clearState(userId)` — deletes on sign-out

This means if you refresh the page while logged in, you come back to where you were (not back to landing).

---

## 4. How Authentication Works

### The Flow

```
1. User signs up → supabase.auth.signUp({ email, password })
2. Supabase creates account → returns a JWT (JSON Web Token)
3. Frontend stores JWT automatically (Supabase handles storage)
4. Every API call → apiFetch() gets JWT → adds "Authorization: Bearer <token>"
5. Backend → verifyAuth middleware extracts token → asks Supabase "is this valid?"
6. If valid → req.userId = user's UUID, req.isAuthenticated = true
7. requireAuth middleware → blocks the request if not authenticated
```

### Key Files

| File | Role |
|------|------|
| `frontend/src/lib/supabase.js` | Creates the Supabase client |
| `frontend/src/lib/api.js` | `apiFetch()` — auto-attaches JWT to requests |
| `backend/src/middleware/verifyAuth.js` | Extracts user from JWT (never blocks) |
| `backend/src/middleware/requireAuth.js` | Blocks if not authenticated |

### Guest vs. Authenticated

| Action | Guest | Authenticated |
|--------|-------|---------------|
| Browse posts | Yes | Yes |
| See 3D scene | Yes | Yes |
| Post/react/reply | No (shows AuthPromptModal) | Yes |
| Admin console | No | Only with admin password |

### Why Two Auth Middlewares?

```
verifyAuth → runs on EVERY request, NEVER blocks
             Just adds user info to the request if a token exists

requireAuth → runs ONLY on write endpoints, BLOCKS guests
              Returns 401 if user isn't authenticated
```

This separation allows:
- `GET /api/posts` → anyone can read (verifyAuth only)
- `POST /api/moderate` → only authenticated users can write (verifyAuth + requireAuth)

---

## 5. How Moderation Works

**File:** `backend/src/moderation/engine.js`

Every single post goes through this before being stored. Three layers, in order:

### Layer 1: Crisis Detection (Local, Instant)

```
Input text → Normalize → Aho-Corasick scan against crisis keywords
```

- Keywords in English, Tagalog, Bicolano (100+ terms)
- Examples: "kill myself", "papatayin ko sarili ko", "gusto ko nang mawala"
- If ANY crisis keyword found → verdict: `crisis` → HTTP 403
- User sees crisis modal with hotline numbers
- User's draft is PRESERVED (never deleted)
- CANNOT be overridden by any allow-list (safety is absolute)

### Layer 2: Vernacular Toxicity (Local)

```
Input text → Normalize → Aho-Corasick scan against toxic keywords →
Word-boundary check → Safe-context suppression
```

- Filipino/Bicolano profanity, slurs, hate speech (500+ terms)
- **Word-boundary validation:** "class" doesn't trigger "ass"
- **Safe-context suppression:** "I feel like shit" → safe (emotional expression) vs "you're shit" → toxic
- If toxic with ≥3 safe-context phrases → verdict: `review` (held for admin)
- Otherwise → verdict: `toxic` → HTTP 406

### Layer 3: Perspective API (Remote, English ML)

```
Input text → Send to Google API → Get scores → Check thresholds
```

- Scores 6 attributes: TOXICITY, SEVERE_TOXICITY, IDENTITY_ATTACK, INSULT, PROFANITY, THREAT
- Each scored 0.0 to 1.0 (probability of being toxic)
- If any score exceeds threshold → verdict: `toxic` → HTTP 406
- If API is down (timeout/error) → falls back to local English keyword scan

### The Normalization Pipeline

Before matching, text goes through 10 cleaning steps:

```
Original:  "h3LL0!! guSt0 k0 nA mAwaLa 🙃"
Step 1:    "h3ll0!! gusto ko na mawala 🙃"     (lowercase)
Step 2:    "h3ll0!! gusto ko na mawala"          (remove emoji)
Step 3:    "h3ll0 gusto ko na mawala"            (remove punctuation)
Step 4:    "hello gusto ko na mawala"            (leet speak → letters)
Step 5:    "hello gusto ko na mawala"            (remove repeated chars)
... (more steps for diacritics, zero-width chars, unicode tricks)
Final:     "hello gusto ko na mawala"
```

This makes evasion much harder — `h3ll0`, `HELLO`, `h.e.l.l.o`, and `héllo` all normalize to "hello".

### Safe-Context Example

```
Text: "I feel like shit today, ang hirap ng buhay"

Toxic matches: ["shit"]
Safe-context matches: ["i feel like", "ang hirap"]

"shit" starts at position 12
"i feel like" spans positions 0-11

Is "shit" within/adjacent to "i feel like"? YES → suppressed!

Result: verdict 'safe' (emotional expression, not directed insult)
```

---

## 6. How Real-time Works

### Posts Appearing Instantly

```
1. Backend inserts post into Supabase (after moderation passes)
2. Supabase detects the INSERT (PostgreSQL Change Data Capture)
3. Supabase pushes the new row to ALL subscribed frontend clients via WebSocket
4. Frontend's subscription callback fires:
```

```javascript
// In SpaceScreen or a data-loading hook:
supabase
  .channel('public:posts')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'posts' },
    (payload) => {
      // payload.new = the newly inserted row
      useAppStore.getState().addPost(payload.new)
    }
  )
  .subscribe()
```

### Deduplication

The same post arrives TWICE:
1. From the API response (immediately after your own post)
2. From the Realtime subscription (broadcast to everyone)

That's why `addPost` checks for duplicates:
```javascript
addPost: (post) => set((state) => {
  if (state.posts.some(p => p.id === post.id)) return state  // Already have it
  return { posts: [post, ...state.posts] }
})
```

### Presence (Multiplayer Avatars)

```javascript
// Join a presence channel
const channel = supabase.channel('space-room')

// Track your own state
channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    channel.track({
      avatar: myAvatar,
      position: { x: 0, y: 0, z: 0 }
    })
  }
})

// Listen for others joining/leaving/moving
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState()
  // state = { 'user-uuid-1': [{ avatar, position }], 'user-uuid-2': [...] }
  updatePeerAvatars(state)
})
```

Each user's abstract avatar appears in the 3D scene for others. No names, no identity — just a floating energy form.

---

## 7. How the 3D Scene Works

### React Three Fiber Basics

Normal React renders HTML. React Three Fiber renders 3D objects using the same component model:

```jsx
// HTML React (normal)
<div className="box">
  <p>Hello</p>
</div>

// 3D React (R3F)
<mesh position={[0, 1, 0]}>
  <sphereGeometry args={[1, 32, 32]} />
  <meshStandardMaterial color="hotpink" />
</mesh>
```

The `<Canvas>` component creates a WebGL context and starts the render loop (60fps):

```jsx
<Canvas camera={{ position: [0, 8, 40] }}>
  {/* Everything inside here is 3D */}
  <ambientLight intensity={0.3} />
  <pointLight position={[0, 0, 0]} />
  <StarSystem />
  <OrbitControls />
</Canvas>
```

### Key 3D Concepts

| Concept | What it means |
|---------|--------------|
| Mesh | A 3D object (geometry + material) |
| Geometry | The shape (sphere, cube, custom blob) |
| Material | The surface appearance (color, roughness, glow) |
| Camera | Your "eye" in the scene |
| Light | Illuminates objects (ambient = everywhere, point = from one spot) |
| Scene | The container holding all 3D objects |
| useFrame | Hook that runs every frame (60 times/second) |
| useRef | Reference to a 3D object for direct manipulation |

### The Star System Structure

```
StarSystem
├── CentralStar (glowing sun at origin)
├── EmotionPlanet × 7 (orbiting at different distances)
│   ├── Planet mesh (clay blob geometry + color)
│   ├── Planet decorations (per-emotion: sun rays, storm, etc.)
│   └── Orbit animation (useFrame rotates around center)
├── OrbitPath × 7 (visible ring showing each orbit)
└── PeerAvatars (other users' abstract forms)
```

### How Planets Orbit

```javascript
function EmotionPlanet({ planet }) {
  const meshRef = useRef()

  useFrame((state, delta) => {
    // delta = time since last frame (~0.016 seconds at 60fps)
    // planet.orbitSpeed = how fast this planet orbits (unique per planet)
    
    const time = state.clock.elapsedTime
    const angle = time * planet.orbitSpeed
    
    // Circle formula: x = r*cos(θ), z = r*sin(θ)
    meshRef.current.position.x = Math.cos(angle) * planet.orbitRadius
    meshRef.current.position.z = Math.sin(angle) * planet.orbitRadius
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[planet.size, 32, 32]} />
      <meshStandardMaterial color={planet.color} />
    </mesh>
  )
}
```

### Camera Fly-in (CameraRig)

When user clicks a planet:
1. Disable OrbitControls (so user can't drag during transition)
2. Each frame, lerp camera position toward the planet
3. When close enough, re-enable OrbitControls with pivot on the planet

```javascript
useFrame(() => {
  if (phase === 'flying') {
    // Move 6% of remaining distance each frame (smooth ease-out)
    camera.position.lerp(targetPosition, 0.06)
    camera.lookAt(planetPosition)
    
    // Are we close enough?
    if (camera.position.distanceTo(targetPosition) < 1.2) {
      phase = 'tracking'
      controls.enabled = true  // User can drag again
    }
  }
})
```

### Clay Blob Geometry

Planets use a custom "clay blob" geometry for the claymation art style:

```javascript
function makeClayBlob(radius, detail) {
  const geometry = new THREE.IcosahedronGeometry(radius, detail)
  const positions = geometry.attributes.position.array
  
  // Displace each vertex randomly for lumpy appearance
  for (let i = 0; i < positions.length; i += 3) {
    const noise = Math.random() * 0.1 - 0.05  // ±5% displacement
    positions[i] *= (1 + noise)
    positions[i + 1] *= (1 + noise)
    positions[i + 2] *= (1 + noise)
  }
  
  geometry.computeVertexNormals()
  return geometry
}
```

---

## 8. How the Database is Structured

**File:** `supabase/schema.sql`

### Tables

```
posts
├── id           UUID (auto-generated)
├── content      TEXT (1-280 characters)
├── planet_id    TEXT ('joy', 'vent', 'advice', 'grief', 'anxiety', 'neutral', 'doodle')
├── session_id   TEXT (user's UUID)
├── author_id    UUID (Supabase Auth user ID — for admin investigation)
├── is_hidden    BOOLEAN (auto-set after too many reports)
├── is_doodle    BOOLEAN (true for drawing posts)
└── created_at   TIMESTAMP

reactions
├── id           UUID
├── post_id      UUID → references posts
├── session_id   TEXT
├── emoji        TEXT (only: 🫂, 💙, 😢, 🌱, ✨)
└── created_at   TIMESTAMP
└── UNIQUE(post_id, session_id)  ← one reaction per user per post

reports
├── id           UUID
├── post_id      UUID → references posts
├── session_id   TEXT
├── reason       TEXT ('harassment', 'hate_speech', 'self_harm', 'spam', 'other')
├── note         TEXT (optional, max 300 chars)
├── reviewed     BOOLEAN
└── created_at   TIMESTAMP
└── UNIQUE(post_id, session_id)  ← one report per user per post

replies (Seek Advice planet only)
├── id           UUID
├── post_id      UUID → references posts
├── content      TEXT
├── session_id   TEXT
├── author_id    UUID
└── created_at   TIMESTAMP
```

### Row Level Security Policies

```sql
-- Anyone can READ non-hidden posts
CREATE POLICY "posts_read" ON posts FOR SELECT
  USING (is_hidden = FALSE);

-- Only service_role (backend) can INSERT
-- This means the anon key (frontend) CANNOT insert directly
CREATE POLICY "posts_insert" ON posts FOR INSERT
  WITH CHECK (FALSE);  -- blocked for anon; service_role bypasses RLS
```

### Why This Matters

Even if someone:
- Finds the Supabase anon key (it's in the frontend bundle)
- Connects to Supabase directly
- Tries to INSERT a post

The database itself says "NO" because of RLS. Only the backend's service_role key can insert, and the backend always moderates first.

---

## 9. Key Code Patterns

These patterns appear everywhere in the codebase. Learn them once, recognize them everywhere.

### Pattern 1: useFrame (Animation Loop)

```javascript
import { useFrame } from '@react-three/fiber'

function AnimatedThing() {
  const meshRef = useRef()
  
  useFrame((state, delta) => {
    // state.clock.elapsedTime = total seconds since scene started
    // delta = seconds since last frame (~0.016 at 60fps)
    
    meshRef.current.rotation.y += delta * 0.5  // Rotate 0.5 rad/sec
  })
  
  return <mesh ref={meshRef}>...</mesh>
}
```

**Rule:** Never allocate objects inside useFrame (it runs 60x/second). Pre-allocate outside:
```javascript
// GOOD — allocated once
const _tempVec = new THREE.Vector3()

function MyComponent() {
  useFrame(() => {
    _tempVec.set(1, 2, 3)  // Reuse, don't create new
  })
}

// BAD — allocates every frame (memory leak!)
useFrame(() => {
  const vec = new THREE.Vector3(1, 2, 3)  // 60 new objects/second!
})
```

### Pattern 2: useMemo (Expensive Computation Cache)

```javascript
import { useMemo } from 'react'

function Planet({ radius }) {
  // This geometry is expensive to create
  // useMemo ensures it's only created ONCE (or when radius changes)
  const geometry = useMemo(() => makeClayBlob(radius, 4), [radius])
  
  return <mesh geometry={geometry}>...</mesh>
}
```

Without `useMemo`, the clay blob would be recomputed on every render (potentially 60x/second during animations).

### Pattern 3: useRef (Persistent Reference)

```javascript
import { useRef } from 'react'

function CameraController() {
  const controlsRef = useRef()
  
  // controlsRef.current = the OrbitControls instance
  // Survives re-renders without causing re-renders
  
  function resetCamera() {
    controlsRef.current.reset()
  }
  
  return <OrbitControls ref={controlsRef} />
}
```

`useRef` is for values that:
- Need to persist between renders
- Should NOT cause re-renders when changed
- Give you direct access to DOM/3D objects

### Pattern 4: Zustand Selector

```javascript
// Subscribe to ONE piece of state
const phase = useAppStore((s) => s.phase)

// Subscribe to a derived value
const postCount = useAppStore((s) => s.posts.length)

// Get an action (these never change, so no unnecessary re-renders)
const setPhase = useAppStore((s) => s.setPhase)

// Read state OUTSIDE a component (in useFrame, event handlers, etc.)
const currentPhase = useAppStore.getState().phase
```

### Pattern 5: apiFetch (API Calls)

```javascript
import { apiFetch } from '../lib/api'

// POST (create something)
const res = await apiFetch('/api/moderate', {
  method: 'POST',
  body: JSON.stringify({ text: 'hello', planet_id: 'joy' }),
})
const data = await res.json()

if (res.ok) {
  // Success (200-299)
} else if (res.status === 403) {
  // Crisis detected
} else if (res.status === 406) {
  // Toxic content blocked
} else if (res.status === 401) {
  // Not authenticated
}
```

`apiFetch` automatically:
- Resolves the correct URL (proxy in dev, full URL in prod)
- Attaches JWT token if user is logged in
- Sets Content-Type to application/json

### Pattern 6: Supabase Query

```javascript
import { supabase } from '../lib/supabase'

// Read posts for a specific planet
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .eq('planet_id', 'joy')
  .eq('is_hidden', false)
  .order('created_at', { ascending: false })
  .limit(50)

// data = array of post objects
// error = null if successful
```

### Pattern 7: Express Middleware Chain

```javascript
// Each function in the chain: (req, res, next)
// Call next() to pass to the next middleware
// Call res.json() to end the chain and respond

router.post('/',
  rateLimit({ max: 20 }),    // 1. Check rate limit
  requireAuth,                // 2. Check authentication
  async (req, res) => {       // 3. Handle the request
    // If we got here, rate limit passed AND user is authenticated
    const { text } = req.body
    // ... do stuff ...
    res.json({ success: true })
  }
)
```

Middleware runs left-to-right. If any middleware calls `res.status(429).json(...)` or `res.status(401).json(...)`, the chain stops. The handler never runs.

### Pattern 8: Conditional JSX Rendering

```jsx
function App() {
  const { crisis, postModalOpen, selectedPlanet } = useAppStore()
  
  return (
    <div>
      {/* Only renders when crisis.open is true */}
      {crisis.open && <CrisisModal />}
      
      {/* Only renders when postModalOpen AND selectedPlanet exist */}
      {postModalOpen && selectedPlanet && <PostModal />}
    </div>
  )
}
```

---

## 10. File Reading Order

Read these files in this exact order to build understanding layer by layer:

### Level 1: Understand the App Structure (30 min)

| # | File | What you learn |
|---|------|---------------|
| 1 | `frontend/src/App.jsx` | How screens are routed, what modals exist |
| 2 | `frontend/src/store/useAppStore.js` | ALL state in the app (the single source of truth) |
| 3 | `frontend/src/main.jsx` | How the app boots (just renders `<App />`) |

### Level 2: Understand the Backend (30 min)

| # | File | What you learn |
|---|------|---------------|
| 4 | `backend/src/index.js` | How Express boots, middleware order, route mounting |
| 5 | `backend/src/middleware/verifyAuth.js` | How JWT tokens are extracted |
| 6 | `backend/src/middleware/requireAuth.js` | How guests are blocked from writing |
| 7 | `backend/src/routes/moderation.js` | The POST /api/moderate endpoint |

### Level 3: Understand Moderation (45 min)

| # | File | What you learn |
|---|------|---------------|
| 8 | `backend/src/moderation/engine.js` | The three-layer pipeline |
| 9 | `backend/src/moderation/normalize.js` | The 10-step text cleaning |
| 10 | `backend/src/moderation/matcher.js` | Aho-Corasick pattern matching |
| 11 | `backend/src/moderation/safeContext.js` | False-positive suppression |
| 12 | `backend/src/moderation/lexicons/all-crisis.json` | Actual crisis keywords |

### Level 4: Understand the 3D Scene (45 min)

| # | File | What you learn |
|---|------|---------------|
| 13 | `frontend/src/screens/SpaceScreen.jsx` | Canvas setup, camera rig |
| 14 | `frontend/src/components/3d/StarSystem.jsx` | Scene composition |
| 15 | `frontend/src/components/3d/EmotionPlanet.jsx` | Planet rendering + orbit |
| 16 | `frontend/src/components/3d/CentralStar.jsx` | The sun in the center |
| 17 | `frontend/src/data/planets.js` | Planet config (colors, speeds, sizes) |

### Level 5: Understand Data Flow (30 min)

| # | File | What you learn |
|---|------|---------------|
| 18 | `frontend/src/lib/api.js` | How frontend talks to backend |
| 19 | `frontend/src/lib/supabase.js` | Supabase client setup |
| 20 | `frontend/src/components/modals/PostModal.jsx` | Post creation UI + submission |
| 21 | `supabase/schema.sql` | Database table definitions |

---

## 11. Complete Data Flow Examples

### Example 1: User Posts "Masaya ako today!"

```
1. USER types in PostModal textarea
   └─ React state: setText("Masaya ako today!")

2. USER clicks "Broadcast"
   └─ handleSubmit() called
   └─ setStatus('checking') → rocket starts rumbling animation

3. FRONTEND calls apiFetch('/api/moderate', { method: 'POST', body: {...} })
   └─ apiFetch gets JWT from Supabase: "eyJhbG..."
   └─ Sends: POST /api/moderate
              Authorization: Bearer eyJhbG...
              Body: { text: "Masaya ako today!", planet_id: "joy" }

4. BACKEND receives request
   └─ helmet → cors → json parser → verifyAuth → rateLimit → requireAuth
   └─ verifyAuth: extracts user UUID from JWT → req.userId = "abc-123"
   └─ requireAuth: req.isAuthenticated === true ✓ → passes

5. BACKEND runs moderate("Masaya ako today!")
   └─ normalize() → "masaya ako today"
   └─ Layer 1 (Crisis): scan → no crisis keywords ✓
   └─ Layer 2 (Vernacular): scan → no toxic keywords ✓
   └─ Layer 3 (Perspective): API returns TOXICITY: 0.02 → safe ✓
   └─ Result: { verdict: 'safe' }

6. BACKEND inserts into Supabase
   └─ INSERT INTO posts (content, planet_id, session_id, author_id)
   └─ VALUES ('Masaya ako today!', 'joy', 'abc-123', 'abc-123')

7. BACKEND responds: 200 { verdict: 'safe', post: { id, content, ... } }

8. FRONTEND receives response
   └─ addPost(data.post) → post in local state immediately
   └─ Rocket launches animation 🚀
   └─ Toast: "Post broadcast successfully!"

9. SUPABASE REALTIME broadcasts INSERT to ALL other clients
   └─ Other users' subscription callbacks fire
   └─ addPost(payload.new) → post appears for everyone

10. ALL USERS see "Masaya ako today!" under Joy planet
```

### Example 2: User Posts Crisis Content

```
1. USER types: "Gusto ko nang mawala sa mundo"

2. FRONTEND sends to backend (same as above)

3. BACKEND runs moderate("Gusto ko nang mawala sa mundo")
   └─ normalize() → "gusto ko nang mawala sa mundo"
   └─ Layer 1 (Crisis): Aho-Corasick finds "gusto ko nang mawala" ⚠️
   └─ STOPS HERE — Layer 2 and 3 never run

4. BACKEND responds: 403 { verdict: 'crisis', referral: '...' }
   └─ Post is NOT stored in database

5. FRONTEND receives 403
   └─ openCrisis({ draft: "Gusto ko nang mawala sa mundo", referral: '...' })
   └─ CrisisModal opens with:
      - Emergency hotline numbers (1553, Tawag Paglaom)
      - Option to save draft as private note
      - Option to return to editing
   └─ User's text is PRESERVED in memory — never deleted

6. User's choices:
   a) Call hotline → opens phone dialer
   b) Save as private note → stored in sessionStorage only (never sent to server)
   c) Go back → PostModal reopens with their text still there
```

### Example 3: Reaction Toggle

```
1. USER clicks 🫂 on a post

2. FRONTEND: optimistic update
   └─ Immediately shows reaction as added (before server confirms)
   └─ apiFetch('/api/reactions', { method: 'POST', body: { post_id, emoji: '🫂' } })

3. BACKEND: requireAuth passes → insert/toggle in Supabase
   └─ If reaction exists (same user, same post, same emoji): DELETE
   └─ If reaction doesn't exist: INSERT

4. SUPABASE REALTIME broadcasts the change
   └─ All clients update their reaction counts

5. If server fails:
   └─ Frontend reverts the optimistic update (un-shows the reaction)
```

---

## 12. Glossary

| Term | What it means in this project |
|------|-------------------------------|
| **JWT** | JSON Web Token — a signed string proving who you are. Supabase issues it on login. |
| **RLS** | Row Level Security — PostgreSQL policies that control data access at the row level. |
| **R3F** | React Three Fiber — React wrapper for Three.js. |
| **drei** | German for "three" — helper library for R3F (OrbitControls, View, etc.) |
| **Zustand** | German for "state" — our state management library. |
| **Canvas** | The HTML element where WebGL renders 3D graphics. |
| **WebGL** | Browser API for GPU-accelerated 3D rendering. |
| **Mesh** | A 3D object = geometry (shape) + material (appearance). |
| **useFrame** | R3F hook that runs every animation frame (60fps). |
| **Lerp** | Linear interpolation — smoothly blend between two values. Used for camera movement. |
| **Aho-Corasick** | Algorithm for matching many patterns in one text pass (O(n) time). |
| **Normalize** | Clean text to defeat evasion: lowercase, remove leet speak, strip special chars. |
| **Safe-context** | Phrases that indicate emotional expression, suppressing false-positive toxic matches. |
| **Middleware** | Functions that process a request before reaching the route handler. A pipeline. |
| **Anon key** | Supabase public key — safe to expose in frontend. Limited by RLS. |
| **Service role** | Supabase admin key — bypasses RLS. ONLY on backend. Never expose to frontend. |
| **Cold start** | Render free tier wakes up the server after 15min sleep. Takes ~30 seconds. |
| **HMR** | Hot Module Replacement — Vite reloads only changed code without full page refresh. |
| **CDN** | Content Delivery Network — serves frontend files from nearest geographic location. |
| **Presence** | Supabase feature tracking who's online and sharing their state (avatar position). |
| **Realtime** | Supabase WebSocket subscriptions that push database changes to connected clients. |
| **Phase** | Our navigation system — controls which screen is currently shown. |
| **Selector** | Zustand pattern — subscribe to one slice of state for efficient re-renders. |
| **Property-based testing** | Testing invariants with random inputs instead of fixed examples. |
| **fast-check** | The PBT library we use — generates random test inputs automatically. |
| **Bloom** | Post-processing effect that makes bright objects glow. |
| **HMAC-SHA256** | Cryptographic hash for report deduplication (one report per person per post). |
| **Optimistic update** | Show the result immediately before server confirms (revert if it fails). |
| **Lexicon** | A list of words/phrases used by the moderation engine. |
| **Automaton** | The compiled Aho-Corasick state machine built from a lexicon. |

---

## Quick Shortcuts

### "I need to understand the store"
→ Read `frontend/src/store/useAppStore.js`

### "I need to understand moderation"
→ Read `backend/src/moderation/engine.js` (the `_evaluate` function)

### "I need to understand the 3D scene"
→ Read `frontend/src/screens/SpaceScreen.jsx` + `frontend/src/components/3d/StarSystem.jsx`

### "I need to understand how posts are created"
→ Read `frontend/src/components/modals/PostModal.jsx` → `frontend/src/lib/api.js` → `backend/src/routes/moderation.js` → `backend/src/moderation/engine.js`

### "I need to understand authentication"
→ Read `frontend/src/lib/api.js` → `backend/src/middleware/verifyAuth.js` → `backend/src/middleware/requireAuth.js`

### "I need to understand the database"
→ Read `supabase/schema.sql` + migration files (002-008)

---

*Take your time with this. Understanding the architecture is more important than memorizing code. If you can explain the data flow of a post from typing to appearing for everyone, you understand the entire system.*
