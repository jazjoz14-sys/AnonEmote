# AnonEmote

A web-based 3D anonymous emotional expression platform with hybrid AI content
moderation, built to give people a psychologically safe space to express
difficult feelings without fear of social stigma.

**Capstone project** — BS Information Technology (Multimedia Technology)  
Divine Word College of Legazpi  
**Team:** Kristel Salve Banday, Jazpher Jozhuah Lim, Clifford James Ravalo

---

## Live URLs

| Environment | URL |
|---|---|
| Frontend | https://anonemoteproject.vercel.app |
| Backend API | https://anonemote.onrender.com |
| Admin Console | https://anonemoteproject.vercel.app/#admin |

> Backend is on Render free tier — cold starts after 15 minutes of inactivity.

---

## Overview

AnonEmote replaces the identity-driven 2D feed with a navigable WebGL star
system. Seven **Emotion Planets** each hold posts for one emotional state, and
every submission passes through a three-layer moderation engine before it can
be stored.

| Planet | Category |
|---|---|
| Joy | Positive moments and celebrations |
| Venting | Frustrations and letting off steam |
| Seek Advice | Questions that support one-level replies |
| Grief & Loss | Processing loss and mourning |
| Anxiety | Worries and overwhelm |
| Reflections | Introspective thoughts and insights |
| Doodle Drift | Drawing canvas (no text) |

| Capability | Implementation |
|---|---|
| Hybrid auth model | Supabase Auth (email/password) + guest read-only mode; anonymous in social layer, accountable behind the scenes |
| 3D environment | Three.js r166 / React Three Fiber, claymation art direction |
| Landing page | Scroll-jacking horizontal carousel with live 3D clay planets (single persistent Canvas) |
| Emotion check-in | Two-phase flow: MoodSpace (continuous 2D emotion field) → NuanceConstellation (star constellation sub-emotions) |
| Hybrid AI moderation | Crisis keywords (EN/TL/BCL) → vernacular toxicity → Google Perspective API |
| Crisis intervention | Referral modal with PH hotlines; user's draft is preserved, never discarded |
| Reactions | Empathy-only emoji (🫂💙😢🌱✨) — no likes, downvotes, or ranking |
| Replies | One-level replies on Seek Advice planet only |
| Reporting | Privacy-preserving HMAC-SHA256 deduplication; auto-quarantine after multiple independent reports |
| Admin console | Activity monitoring, content review, editable lexicon, real-time SSE event stream |
| Multiplayer presence | Supabase Realtime + Presence for live peer avatars in the 3D scene |
| User evaluations | ISO/IEC 25010 Likert-scale evaluation modal, triggered by activity threshold |
| Responsive PWA | Bottom sheets, landscape mode, quality tiers, mobile optimization |
| Testing | 500+ tests (Vitest + fast-check property-based testing) |

---

## Tech stack

**Frontend** — React 18, Vite 5, Tailwind CSS 3, Three.js r166, React Three Fiber,
@react-three/drei, @react-three/postprocessing, Zustand, @supabase/supabase-js

**Backend** — Node.js 18+, Express 4, Helmet, cors, express-rate-limit,
@supabase/supabase-js (service role), pg (node-postgres), dotenv

**Database** — Supabase (PostgreSQL + Row Level Security + Realtime + Presence + Auth)

**Moderation** — Google Perspective API + local multilingual keyword lexicons (EN/TL/BCL)

**Testing** — Vitest + fast-check (property-based)

**Deployment** — Vercel (frontend static), Render (backend Node.js service)

---

## Local setup

### Prerequisites
- Node.js 18+
- A Supabase project (with Auth enabled)
- A Google Perspective API key (optional — falls back to local lists)

### 1. Install dependencies
```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Create the database
In the Supabase dashboard open **SQL Editor → New query**, paste the contents of
`supabase/schema.sql`, and run it. Then run the migration files in order
(`002_reactions_reports.sql` through `008_evaluations.sql`).

### 3. Configure environment
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in both files. Keys come from Supabase → **Project Settings → API**.

| Variable | File | Notes |
|---|---|---|
| `SUPABASE_URL` | backend | Project URL |
| `SUPABASE_SERVICE_KEY` | backend | **service_role** key — bypasses RLS, keep secret |
| `PERSPECTIVE_API_KEY` | backend | Optional — falls back to local lexicons |
| `ADMIN_PASSWORD` | backend | Admin console password |
| `REPORT_HASH_SECRET` | backend | HMAC secret for report deduplication |
| `CORS_ORIGIN` | backend | Allowed frontend origin |
| `VITE_SUPABASE_URL` | frontend | Project URL |
| `VITE_SUPABASE_ANON_KEY` | frontend | **anon public** key only |
| `VITE_API_URL` | frontend | Backend URL (production only) |

Never put the service role key in a `VITE_`-prefixed variable — those are
bundled into the browser build.

### 4. Run
Two terminals:
```bash
cd backend  && npm run dev    # http://localhost:3005
cd frontend && npm run dev    # http://localhost:5173
```

- App — <http://localhost:5173>
- Admin console — <http://localhost:5173/#admin>

### 5. Run tests
```bash
cd frontend && npx vitest --run
cd backend  && npx vitest --run
```

---

## Authentication & privacy model

AnonEmote uses a **hybrid auth model** that balances user anonymity with platform accountability:

### Social layer (what users see)
- Fully anonymous — no usernames, profile photos, or identity information is shown to other users
- Posts display without author attribution
- Abstract non-human avatars (energy forms) with no identifying traits
- Empathy-only reactions prevent social ranking

### Behind the scenes (what admins can access)
- Supabase Auth (email/password) provides accountable identities
- JWT-based `requireAuth` middleware gates all write operations
- Every post stores an `author_id` (Supabase Auth UUID) for admin investigation
- Reports use HMAC-SHA256 hashing of IP + post ID for deduplication without storing raw IPs

### Guest mode
- Unauthenticated users can browse all content in read-only mode
- Attempting to post, react, or reply surfaces an auth prompt modal
- Guest sessions use a temporary `sessionStorage` UUID for presence only

### Session persistence
- Authenticated users' phase, avatar, and check-in state persist in `localStorage` (namespaced by UUID)
- State restores automatically on page reload
- Sign-out clears all persisted data and resets to defaults

---

## Moderation architecture

Three layers, evaluated in order. Crisis detection runs **first and locally**,
so it still works if the Perspective API is unreachable.

| Layer | Scope | Verdict |
|---|---|---|
| 1. Crisis keywords | English, Tagalog, Bicolano | `403` + crisis referral modal (draft preserved) |
| 2. Vernacular toxicity | Tagalog, Bicolano (unsupported by Perspective) | `406` blocked |
| 3. Perspective API | English ML scoring across 6 attributes | `406` blocked |

Falls back to a local English list if the API fails, so moderation never fails
open. Administrators can extend all three lists at runtime via the admin console,
including an allow-list for false positives — which deliberately **cannot**
override crisis detection.

Requests use `doNotStore: true` and a 4-second timeout, so user text is never
retained by Google and a slow API cannot hang a submission.

---

## Deployment

The frontend is a static build; the backend is a long-running Node service.
They deploy separately.

### Backend — Render
- Root directory: `backend`
- Build: `npm install`
- Start: `npm start`
- Set every backend env var in the dashboard, plus `CORS_ORIGIN` pointing at
  your deployed frontend URL
- Deployment blueprint: `render.yaml`

### Frontend — Vercel
- Root directory: `frontend`
- Build: `npm run build`
- Output: `dist`
- Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_URL`
  (your deployed backend URL)

The Vite dev proxy only exists locally, so `VITE_API_URL` must be set in
production for API calls to resolve.

---

## Project structure

```
AnonEmote/
├── frontend/
│   └── src/
│       ├── screens/            Landing, Auth, Avatar, CheckIn, Space
│       ├── components/
│       │   ├── 3d/             Star system, planets, carousel, backdrop, avatars
│       │   │   ├── StarSystem.jsx
│       │   │   ├── CarouselPlanetScene.jsx
│       │   │   ├── CarouselCanvas.jsx
│       │   │   ├── EmotionPlanet.jsx
│       │   │   ├── CentralStar.jsx
│       │   │   ├── GalacticBackdrop.jsx
│       │   │   ├── PeerAvatars.jsx
│       │   │   └── UserAvatar.jsx
│       │   ├── checkin/        MoodSpace, NuanceConstellation, BreathingMoment
│       │   ├── modals/         Post, Crisis, Report, Terms, AuthPrompt, Evaluation
│       │   └── ui/             HUD, panels, reactions, avatar customizer
│       ├── admin/              Admin console (monitor, reports, lexicon, live logs)
│       ├── data/               Planets, emotions, avatar options, landing copy, terms
│       │   └── landingCopy.js
│       ├── hooks/              usePresence, useDraggable, useActivityTimer, useGraphicsConfig
│       ├── lib/                api.js, supabase.js, persistence.js, guestSession.js, device.js
│       └── store/              Zustand global store (useAppStore.js)
├── backend/
│   └── src/
│       ├── routes/             moderation, posts, reactions, reports, replies, evaluations, admin
│       ├── moderation/
│       │   ├── engine.js       Three-layer hybrid moderation logic
│       │   ├── perspective.js  Google Perspective API client
│       │   ├── matcher.js      Pattern matching with normalization
│       │   ├── normalize.js    Text normalization (leet speak, unicode)
│       │   ├── safeContext.js  False-positive allow-list logic
│       │   └── lexicons/       JSON keyword lists (EN/TL/BCL, crisis/toxic/safe)
│       ├── middleware/         requireAuth, verifyAuth, adminAuth
│       └── lib/                storage.js, reporterHash.js, eventBus.js, supabase.js
├── supabase/
│   ├── schema.sql              Base schema (posts, RLS, triggers)
│   ├── 002–007_*.sql           Incremental migrations
│   └── 008_evaluations.sql     ISO 25010 evaluation responses
├── docs/
│   ├── FULL_AUDIT.md           Complete system audit
│   └── MANUSCRIPT_CHANGES_V2.md
└── render.yaml                 Render deployment blueprint
```

---

## Evaluation

Assessed against **ISO/IEC 25010** for functional suitability, usability,
performance efficiency, and security. An in-app evaluation modal collects
5-point Likert-scale responses from users after an activity threshold is met,
measuring perceived anonymity safety, moderation effectiveness, emotional
expression ease, and overall satisfaction.

Theoretical framework: Self-Determination Theory, Online Disinhibition Effect,
SIDE Theory, and Affordance Theory.

---

## License

This project is part of an academic capstone and is not currently published under
an open-source license.
