# AnonEmote — Technology Stack Justification

> **Purpose:** This document explains *why* every technology in AnonEmote was chosen. Use this to answer panelist questions like "Why did you choose React?" or "Why not Firebase?" during the capstone defense.

---

## Table of Contents

1. [Frontend Technologies](#1-frontend-technologies)
2. [Backend Technologies](#2-backend-technologies)
3. [Database & Infrastructure](#3-database--infrastructure)
4. [Testing](#4-testing)
5. [Deployment](#5-deployment)
6. [Summary Table](#6-summary-table)

---

## 1. Frontend Technologies

### React 18

**What it is:** A JavaScript library for building user interfaces using reusable components.

**Why React over Vue, Angular, or Svelte?**

| Factor | React | Vue | Angular | Svelte |
|--------|-------|-----|---------|--------|
| Three.js integration | React Three Fiber (mature) | TresJS (newer, smaller community) | No official wrapper | Threlte (newer) |
| Ecosystem size | Largest (npm downloads, StackOverflow answers) | Medium | Large | Small |
| Learning resources | Most tutorials, courses, documentation | Good | Good | Limited |
| Job market relevance | #1 frontend library in PH job postings | Growing | Enterprise-focused | Niche |
| Component model | Functional + Hooks (modern) | Options/Composition API | Class-based + decorators | Compiler-based |

**Key reasons for our project:**
1. **React Three Fiber** — The only production-ready way to build 3D scenes with React's component model. Vue and Svelte alternatives are too immature for a full 3D star system.
2. **Team familiarity** — All three members learned React in coursework. Switching to another framework would add unnecessary learning time.
3. **Ecosystem** — Need for state management (Zustand), UI testing (@testing-library/react), and post-processing libraries all have first-class React support.
4. **Hooks API** — `useFrame`, `useRef`, `useMemo`, `useEffect` make managing 60fps animation loops and side effects clean and readable.

**How to explain to panelists:**
> "We chose React because it has the only mature 3D integration library (React Three Fiber) for building our star system. The component model lets us treat each planet, each orbit ring, and each particle effect as a reusable component. The team was also already proficient in React from our web development courses."

---

### Vite 5

**What it is:** A frontend build tool that bundles your code for production and provides instant hot-module replacement (HMR) during development.

**Why Vite over Webpack or Create React App (CRA)?**

| Factor | Vite | Webpack (CRA) |
|--------|------|---------------|
| Dev server startup | < 1 second (native ES modules) | 10-30 seconds (bundles everything first) |
| Hot reload speed | Instant (only reloads changed module) | 2-5 seconds (re-bundles dependency tree) |
| Configuration | Near-zero config needed | Complex webpack.config.js |
| Build output | Rollup-based (optimized chunks) | Webpack (larger bundles) |
| Maintenance | Actively developed (Evan You, creator of Vue) | CRA is officially deprecated |

**Key reasons:**
1. **Developer productivity** — With a 3D scene that requires constant tweaking, waiting 5+ seconds for every code change would kill productivity. Vite reloads in under 100ms.
2. **CRA is dead** — Create React App is no longer maintained. The React team officially recommends Vite or Next.js for new projects.
3. **ES modules native** — Vite serves ES modules directly to the browser during development, which is the modern standard (no transpilation step).
4. **Proxy support** — Vite's dev proxy forwards `/api` calls to our backend, eliminating CORS issues during development without extra configuration.

**How to explain:**
> "Vite gives us instant feedback when tweaking 3D scenes — changes appear in under 100ms. Create React App, the old standard, is deprecated and takes 10-30 seconds for the same reload. For a 3D project with constant visual adjustments, this speed difference is critical."

---

### Tailwind CSS 3

**What it is:** A utility-first CSS framework where you style elements with small, composable utility classes directly in your HTML/JSX.

**Why Tailwind over Bootstrap or custom CSS?**

| Factor | Tailwind | Bootstrap | Custom CSS |
|--------|----------|-----------|-----------|
| Customization | Fully configurable (colors, spacing, breakpoints) | Predefined look (Bootstrap-y) | Unlimited but slow |
| Bundle size | Only ships classes you actually use (tree-shaking) | Full framework loaded | Grows unpredictably |
| Responsive design | Built-in breakpoint prefixes (`md:`, `lg:`) | Grid system only | Manual media queries |
| Dark mode | `dark:` prefix built-in | Requires overrides | Manual implementation |
| Class collisions | None (utility classes are atomic) | Common with component overrides | Frequent in large projects |

**Key reasons:**
1. **Rapid prototyping** — We're building a capstone with a deadline. Tailwind lets us style components 3-5x faster than writing custom CSS files.
2. **No visual conflict with 3D** — The 3D canvas IS the design. Tailwind handles only the UI overlays (HUD, modals, panels) without imposing a visual identity like Bootstrap would.
3. **Responsive utilities** — Our app supports mobile with `sm:`, `md:`, `lg:` prefixes. No separate mobile CSS file needed.
4. **Consistency** — The spacing scale (4px increments) and color palette are consistent across the entire UI without creating a design system from scratch.

**How to explain:**
> "Tailwind gives us a consistent UI in minimal code. We're not building a traditional website — our main interface is the 3D scene. Tailwind handles the minimal UI overlays (modals, HUD, navigation) without conflicting with the canvas or imposing a Bootstrap-like visual style."

---

### Three.js + React Three Fiber (R3F)

**What it is:** Three.js is the standard JavaScript library for 3D graphics in the browser (WebGL). React Three Fiber wraps it so we can write 3D scenes using React components.

**Why 3D instead of a regular 2D feed?**

1. **Novelty for capstone** — A standard social media feed would not demonstrate Multimedia Technology specialization. The 3D star system showcases advanced web graphics skills.
2. **Affordance Theory (Gibson/Norman)** — The 3D environment *affords* exploration rather than passive scrolling. Users navigate space, creating a sense of agency.
3. **Spatial separation of emotions** — Each planet is a distinct emotional container. This creates psychological boundaries between emotional states (you consciously "travel" to a different feeling).
4. **Reduced doom-scrolling** — Traditional feeds encourage infinite scrolling. A spatial interface requires intentional navigation, reducing compulsive consumption.
5. **Immersion** — The star system metaphor (orbiting planets, glowing central star) creates a calming aesthetic appropriate for emotional expression.

**Why R3F instead of raw Three.js?**
- Three.js alone is imperative: `const mesh = new THREE.Mesh(geometry, material); scene.add(mesh)`. You must manually manage creation, updates, and disposal.
- R3F is declarative: `<mesh><sphereGeometry /><meshStandardMaterial /></mesh>`. React handles lifecycle.
- R3F enables: component reuse (EmotionPlanet used 7 times with different props), automatic GPU resource cleanup (unmount = dispose), and React hooks inside 3D scenes.

**How to explain:**
> "The 3D star system is the core innovation of our project. Based on Affordance Theory, spatial navigation creates psychological distance from traditional social media feeds. Users don't passively scroll — they consciously navigate to emotional spaces. React Three Fiber lets us build this with reusable React components, not imperative Three.js code."

---

### @react-three/drei

**What it is:** A collection of pre-built helpers for React Three Fiber — things like camera controls, environment maps, text rendering, particle effects, etc.

**Why use it?**
- **OrbitControls** — Camera drag/zoom/pan with damping. Writing this from scratch is 200+ lines.
- **Sparkles** — Particle effects for avatar decoration. Native Three.js particles need manual buffer geometry.
- **View** — Multiple 3D viewports sharing one WebGL context (used in the landing carousel to avoid context explosion).
- **Html** — Renders HTML inside 3D space (planet labels, tooltips).
- **useGLTF** — Loads .glb 3D models with caching (for upcoming Maya planet models).

**How to explain:**
> "drei provides production-ready 3D utilities so we don't reinvent the wheel. OrbitControls alone would be 200 lines of math. Using these well-tested components lets us focus on our unique features — the moderation system, the emotional framework — instead of debugging camera quaternions."

---

### @react-three/postprocessing

**What it is:** GPU-based visual effects applied after the scene renders — bloom (glow), vignette (darkened edges), etc.

**Why use it?**
- **Bloom** — Makes the central star and planet auras glow naturally. Without it, emissive materials look flat.
- **Vignette** — Darkens edges for a cinematic, focused feeling.
- **Performance** — Effects are GPU-computed (fragment shaders), not CPU. Negligible performance impact on modern hardware.

**How to explain:**
> "Post-processing adds the warm glow that makes our star system feel alive. The Bloom effect makes emissive objects radiate light naturally, which is essential for the star and planet auras."

---

### Zustand

**What it is:** A lightweight state management library (3KB) for React applications.

**Why Zustand over Redux or React Context?**

| Factor | Zustand | Redux | React Context |
|--------|---------|-------|---------------|
| Boilerplate | ~10 lines for a full store | 50+ lines (actions, reducers, types, dispatch) | Moderate (providers, consumers) |
| Bundle size | 3KB | 20KB+ | 0KB (built-in) but causes re-renders |
| Access outside React | Yes (`useAppStore.getState()`) | Only via middleware | No |
| Render optimization | Automatic (selector-based) | Requires `useSelector` + memoization | Re-renders entire tree on any change |
| Real-time friendly | Yes (direct mutation, instant propagation) | Requires dispatching actions | Causes cascade re-renders |

**Key reasons:**
1. **3D + UI coordination** — The camera rig (inside R3F's render loop) needs to read `selectedPlanet` state. Zustand's `getState()` works outside React components. Redux and Context require being inside a React tree.
2. **Real-time updates** — When a post arrives via Supabase Realtime, we add it to the store directly. No action creators, no dispatch, no reducers.
3. **Minimal boilerplate** — Our store is one file. Redux would require actions/, reducers/, types/, store/ directories for the same functionality.
4. **Selective re-rendering** — `useAppStore(s => s.phase)` only re-renders when `phase` changes. Context would re-render every consumer on any state change.

**How to explain:**
> "Zustand is our single source of truth. Unlike Redux, it needs no boilerplate — no actions, reducers, or dispatch. A key advantage: Zustand can be read from inside the 3D render loop (60fps) using getState(), which Redux and Context cannot do without causing performance issues."

---

### @supabase/supabase-js

**What it is:** The official Supabase client library for JavaScript. Handles authentication, database reads, real-time subscriptions, and presence tracking.

**Why use it on the frontend?**
1. **Direct reads** — Posts load directly from Supabase (protected by Row Level Security), bypassing the backend for read operations. This is faster than routing through Express.
2. **Real-time subscriptions** — One line subscribes to new posts: when the backend inserts a moderated post, all connected clients see it instantly via WebSocket.
3. **Presence** — Tracks who is in the 3D space right now (for multiplayer avatars). Supabase handles the heartbeat and cleanup.
4. **Authentication** — Email/password sign-up, JWT issuance, session refresh — all handled by Supabase Auth.

**How to explain:**
> "The frontend connects directly to Supabase for fast reads and real-time updates. When someone posts on a planet, all other users see it appear instantly via WebSocket — no polling, no manual refresh. Authentication and presence tracking are also built into this one library."

---

## 2. Backend Technologies

### Node.js + Express 4

**What it is:** Node.js is a JavaScript runtime for server-side code. Express is the most popular HTTP framework for Node.js.

**Why Node.js over Python/Django, Java/Spring, or PHP?**

| Factor | Node.js + Express | Python + Django | Java + Spring |
|--------|------------------|-----------------|---------------|
| Language consistency | Same JavaScript as frontend | Different language | Different language |
| Async I/O | Native (non-blocking event loop) | Requires async frameworks | Thread-based |
| API speed | Fast for I/O-bound work (our use case) | Fast but GIL limits concurrency | Fast but verbose |
| Team familiarity | All members know JS | Mixed | None |
| Deployment (free tier) | Render, Railway, Fly.io | Fewer free options | Almost none free |

**Key reasons:**
1. **Full-stack JavaScript** — One language across frontend and backend. Team doesn't need to context-switch between languages.
2. **Non-blocking I/O** — Our backend mostly talks to Supabase and the Perspective API. Node's event loop handles these concurrent external calls efficiently without threads.
3. **Express is minimal** — It doesn't impose structure. We organize routes, middleware, and moderation logic as we need. Django or Spring would force patterns we don't need.
4. **Deployment** — Render's free tier supports Node.js natively. No Docker required.

**How to explain:**
> "Node.js gives us JavaScript consistency across the entire stack — one language, one mental model. Express is lightweight and middleware-based, which perfectly matches our moderation pipeline architecture (rate limit → auth → moderate → store)."

---

### Helmet

**What it is:** Express middleware that sets security-related HTTP headers automatically.

**What it does:**
- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing attacks
- `Strict-Transport-Security` — forces HTTPS
- `X-Frame-Options: DENY` — prevents clickjacking
- `Content-Security-Policy` — restricts what resources can load
- `X-XSS-Protection` — legacy XSS filter (browsers that still support it)

**Why?**
> "Helmet is one line of code (`app.use(helmet())`) that adds 11 security headers. Without it, we'd need to manually set each header and risk forgetting one. It's an industry best practice for Express applications."

---

### CORS (cors package)

**What it is:** Controls which websites can make requests to our API.

**Why?**
- Without CORS, any website could call our `/api/moderate` endpoint.
- We restrict it to our Vercel frontend domain only.
- Prevents cross-site request forgery from malicious sites.

**How to explain:**
> "CORS ensures only our official frontend can talk to the backend. If someone built a fake AnonEmote client, our CORS policy would reject their requests at the browser level."

---

### express-rate-limit

**What it is:** Middleware that limits how many requests an IP address can make in a time window.

**Why?**
- **Spam prevention** — Without it, one user could flood a planet with hundreds of posts per minute.
- **DDoS mitigation** — Limits damage from automated attacks.
- **Free tier protection** — Render's free tier has limited compute. Rate limiting prevents one user from exhausting it.

**Configuration:** 20 requests per minute per IP on write endpoints.

**How to explain:**
> "Rate limiting prevents abuse. A user can post at most 20 times per minute. This protects both the community from spam and our server from resource exhaustion."

---

### Google Perspective API

**What it is:** A machine learning API by Google/Jigsaw that scores text for toxicity, threats, profanity, and other harmful attributes.

**Why not build our own ML model?**

| Factor | Perspective API | Custom ML Model |
|--------|----------------|-----------------|
| Training data | Millions of labeled comments | We have none |
| Languages | English (well-supported) | Would need Filipino corpus |
| Accuracy | State-of-the-art (published research) | Unpredictable |
| Development time | 1 day to integrate | 3-6 months |
| Cost | Free (1 QPS, doNotStore: true) | GPU training costs |
| Maintenance | Google maintains it | We'd need to retrain |

**Key reasons:**
1. **No training data** — Building a toxicity classifier requires millions of labeled examples. We have zero.
2. **Research-backed** — Perspective is published in academic papers. Using a proven system strengthens our ISO/IEC 25010 evaluation.
3. **Free tier sufficient** — 1 query per second is fine for a university deployment.
4. **Privacy** — We set `doNotStore: true` so Google never retains our users' text.

**Limitation acknowledged:** Perspective doesn't support Tagalog or Bicolano. That's why we built Layer 2 (local vernacular matching).

**How to explain:**
> "We use Google's Perspective API because building our own ML model would take months and require training data we don't have. Perspective handles English toxicity with state-of-the-art accuracy. For Filipino and Bicolano, which Perspective doesn't support, we built our own keyword-based system with safe-context suppression."

---

### Local Keyword Lexicons + Aho-Corasick

**What it is:** JSON files containing crisis and toxicity keywords in English, Tagalog, and Bicolano. Matched using the Aho-Corasick algorithm for O(n) multi-pattern search.

**Why local lists when we have Perspective?**

1. **Filipino language coverage** — Perspective API does not support Tagalog, Bicolano, or code-switching (Taglish). Without local lists, 70%+ of our users' language is unmoderated.
2. **Crisis detection must be instant** — Self-harm keywords are checked locally with zero network latency. A 4-second API timeout is unacceptable for crisis situations.
3. **Offline resilience** — If Perspective API is down, local lists ensure moderation never fails open. Content is never let through unmoderated.
4. **Customizable** — Administrators can add new terms via the admin console without redeployment.

**Why Aho-Corasick over simple loops?**
- Simple approach: loop through 500+ keywords for every post = O(n × k) where k = keyword count
- Aho-Corasick: build a state machine once, then scan any text in O(n) regardless of keyword count
- For 500+ terms across 3 languages, this is significantly faster

**How to explain:**
> "Local keyword matching handles three things Perspective cannot: Filipino/Bicolano toxicity, instant crisis detection, and offline fallback. We use the Aho-Corasick algorithm which matches ALL keywords simultaneously in one pass through the text — this is O(n) regardless of how many keywords we have."

---

## 3. Database & Infrastructure

### Supabase (PostgreSQL)

**What it is:** An open-source Firebase alternative built on PostgreSQL, with Auth, Realtime, and Row Level Security built-in.

**Why Supabase over Firebase or MongoDB?**

| Factor | Supabase (PostgreSQL) | Firebase (Firestore) | MongoDB Atlas |
|--------|----------------------|---------------------|---------------|
| Query model | SQL (powerful, standard) | NoSQL (limited queries) | NoSQL (flexible but no joins) |
| Security model | Row Level Security (DB-enforced) | Security rules (separate layer) | No built-in row-level security |
| Real-time | Built-in (PostgreSQL CDC) | Built-in | Requires Change Streams ($$$) |
| Auth | Built-in (email, OAuth, etc.) | Built-in | Separate service needed |
| Pricing (free tier) | 500MB DB, 2GB bandwidth, 50k MAU | 1GB storage, limited reads | 512MB only |
| Hosting control | Can self-host | Google-locked | MongoDB-locked |
| Joins | Native SQL joins | None (denormalize everything) | $lookup (slow) |

**Key reasons:**
1. **Row Level Security** — Privacy is enforced at the database level. Even if our backend code has a bug, RLS prevents unauthorized data access. Critical for an anonymous platform.
2. **SQL for complex queries** — Filtering posts by planet, ordering by date, paginating, joining reactions — all trivial in SQL. In Firebase you'd need composite indexes and client-side processing.
3. **Built-in Auth** — Email/password registration, JWT issuance, token refresh all handled. No need to build auth from scratch.
4. **Realtime via WebSocket** — One subscription gets new posts instantly. No polling, no external WebSocket server.
5. **Free tier is generous** — 500MB database, 50k monthly active users. More than enough for a university deployment.

**How to explain:**
> "Supabase gives us PostgreSQL with Row Level Security, built-in Auth, and real-time WebSocket subscriptions — all in one service. Row Level Security is critical for our anonymous platform: even if code has bugs, the database itself enforces that users can only read public data and cannot access other users' information."

---

### Row Level Security (RLS)

**What it is:** PostgreSQL policies that restrict which rows a user can see or modify, enforced by the database engine itself.

**Example from our schema:**
```sql
-- Anyone can READ posts that aren't hidden
CREATE POLICY "posts_read" ON public.posts
  FOR SELECT USING (is_hidden = FALSE);

-- Only our backend (service_role) can INSERT posts
CREATE POLICY "posts_insert" ON public.posts
  FOR INSERT WITH CHECK (FALSE);
  -- Blocked for anon key; backend uses service_role to bypass
```

**Why it matters for us:**
- Frontend reads use the `anon` key → RLS ensures they can only see non-hidden posts
- Even if someone steals our anon key, they cannot write posts (INSERT blocked by policy)
- The backend uses the `service_role` key which bypasses RLS → it can insert moderated posts
- Defense-in-depth: security at the application layer AND the database layer

**How to explain:**
> "Row Level Security means even if someone bypasses our frontend and directly queries Supabase, they still can't see hidden posts or insert data. It's security enforced by PostgreSQL itself, not just our code."

---

### Realtime + Presence

**What it is:**
- **Realtime** — Supabase listens for database changes (INSERT, UPDATE, DELETE) and pushes them to connected clients via WebSocket.
- **Presence** — Tracks which users are currently online and shares their state (avatar, position) with all other connected users.

**Why?**
1. **Live posts** — When someone posts on Joy planet, everyone else sees it appear within ~200ms. No refresh needed.
2. **Multiplayer avatars** — Users see other abstract avatars floating in the 3D space. Creates a sense of community without identity.
3. **No WebSocket server needed** — Supabase handles all the WebSocket infrastructure. We just subscribe.

**How to explain:**
> "Realtime makes posts appear instantly for all users without refreshing. Presence shows other people's avatars in the 3D space, creating a sense of shared community — all without building our own WebSocket server."

---

## 4. Testing

### Vitest

**What it is:** A fast test runner built specifically for Vite projects. API-compatible with Jest (the industry standard).

**Why Vitest over Jest?**
1. **Native Vite integration** — Uses the same config, plugins, and module resolution as our build tool. No separate Babel/transform config.
2. **Speed** — Tests run 2-5x faster than Jest because Vite's module system is used instead of Jest's custom require.
3. **ES modules** — Our project is entirely ES modules (`"type": "module"`). Jest has poor ESM support. Vitest handles it natively.
4. **Same API** — `describe`, `it`, `expect`, `vi.fn()` — identical to Jest. Easy to find documentation and examples.

**How to explain:**
> "Vitest is the test runner designed for Vite projects. Since our build tool is Vite, the test runner uses the same configuration — no duplicate setup. It's also 2-5x faster than Jest and handles ES modules natively."

---

### fast-check (Property-Based Testing)

**What it is:** A testing library that generates random inputs to test *properties* (invariants) rather than specific examples.

**Why property-based testing?**

Traditional testing:
```javascript
// Test ONE specific case
expect(normalize('HELLO')).toBe('hello')
```

Property-based testing:
```javascript
// Test ALL possible strings
fc.assert(fc.property(fc.string(), (s) => {
  const result = normalize(s)
  // Property: output is always lowercase
  expect(result).toBe(result.toLowerCase())
}))
```

**Key reasons:**
1. **Catches edge cases automatically** — fast-check generates strings with Unicode, special characters, emoji, zero-width characters that we'd never think to test manually.
2. **Tests invariants, not examples** — "Normalization output is always lowercase" is tested with hundreds of random inputs, not just "HELLO".
3. **Academic rigor** — Property-based testing demonstrates sophisticated QA methodology. Panelists see we test mathematical properties, not just happy paths.
4. **500+ tests** — Combined with unit tests, we have 500+ total tests covering moderation, state management, persistence, and authentication.

**How to explain:**
> "Property-based testing with fast-check generates hundreds of random inputs to verify that our invariants always hold. For example: 'crisis detection never misses a keyword regardless of casing, spacing, or leet speak.' This catches bugs that traditional example-based tests miss."

---

## 5. Deployment

### Vercel (Frontend)

**What it is:** A platform for deploying static websites and serverless functions. Perfect for Vite/React builds.

**Why Vercel?**
1. **Free tier** — Unlimited static deployments, global CDN, HTTPS automatic.
2. **Perfect for static builds** — Our `vite build` outputs a static `dist/` folder. Vercel serves it from edge CDN nodes worldwide.
3. **Preview deployments** — Every push creates a preview URL for testing before production.
4. **Singapore edge** — CDN node in Singapore = lowest latency for Philippine users.

---

### Render (Backend)

**What it is:** A cloud platform for deploying web services, APIs, and databases.

**Why Render for the backend?**
1. **Free tier** — Free Node.js service with 512MB RAM. Sufficient for our API.
2. **Auto-deploy** — Push to GitHub → Render automatically rebuilds and deploys.
3. **Environment variables** — Easy dashboard for secrets (Supabase keys, API keys).
4. **render.yaml** — Infrastructure-as-code. Our deployment is version-controlled.

**Limitation:** Free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds (cold start). Acceptable for a university project.

---

### Region Choice: Singapore

**Why Singapore?**
- Closest major cloud region to the Philippines.
- ~30ms latency vs ~200ms for US West.
- Both Supabase and the CDN edge nodes serve from Singapore.
- Target users are at Partido State University, Camarines Sur, Philippines.

**How to explain:**
> "We deploy to Singapore because it's the closest cloud region to our target users in the Philippines. This gives ~30ms latency instead of 200ms from US servers."

---

## 6. Summary Table

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| UI Framework | React | 18.3.1 | R3F integration, team familiarity, ecosystem |
| Build Tool | Vite | 5.3.4 | Instant HMR, modern ESM, CRA is deprecated |
| Styling | Tailwind CSS | 3.4.6 | Rapid prototyping, responsive utilities, no conflicts with 3D |
| 3D Engine | Three.js | 0.166.1 | Industry standard for web 3D |
| 3D Framework | React Three Fiber | 8.16.8 | Declarative 3D with React lifecycle |
| 3D Helpers | drei | 9.109.2 | OrbitControls, View, Sparkles, useGLTF |
| Post-processing | @react-three/postprocessing | 2.16.3 | Bloom, vignette for visual quality |
| State | Zustand | 4.5.4 | Minimal, fast, works outside React |
| Runtime | Node.js | 18+ | JS consistency, non-blocking I/O |
| HTTP Framework | Express | 4.19.2 | Lightweight, middleware pipeline |
| Security Headers | Helmet | 7.1.0 | 11 headers in one line |
| Rate Limiting | express-rate-limit | 7.3.1 | Spam/DDoS prevention |
| ML Moderation | Google Perspective API | — | English toxicity, no training data needed |
| Pattern Matching | ahocorasick | 1.0.2 | O(n) multi-pattern matching for lexicons |
| Database | Supabase (PostgreSQL) | — | RLS, Auth, Realtime, free tier |
| DB Client | @supabase/supabase-js | 2.43.4 | Official client, handles auth + realtime |
| Raw SQL | pg (node-postgres) | 8.13.1 | Migrations, complex admin queries |
| Test Runner | Vitest | 4.1.10 | Native Vite integration, fast, ESM |
| Property Testing | fast-check | 4.9.0 | Random input generation, invariant testing |
| Frontend Deploy | Vercel | — | Free, global CDN, static hosting |
| Backend Deploy | Render | — | Free Node.js service, auto-deploy |

---

*Prepared for the capstone defense. Use this alongside DEFENSE_PREPARATION.md and CODE_LEARNING_GUIDE.md.*
