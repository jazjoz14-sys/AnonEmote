# ✦ AnonEmote

A web-based 3D anonymous emotional expression platform with a hybrid AI content
moderation engine, built to give university students a psychologically safe
space to express difficult feelings without fear of judgement.

Capstone project — BS Information Technology.

---

## Overview

AnonEmote replaces the identity-driven 2D feed with a navigable WebGL star
system. Six **Emotion Planets** each hold posts for one emotional state, and
every submission passes through a three-layer moderation engine before it can
be stored.

| Capability | Implementation |
|---|---|
| Zero-knowledge identity | Ephemeral `sessionStorage` UUID; no accounts, no PII |
| 3D environment | Three.js / React Three Fiber, claymation art direction |
| Emotion check-in | Two-step triage routes users to the right planet |
| Hybrid AI moderation | Local keyword layers + Google Perspective API |
| Crisis intervention | Referral modal with PH hotlines, overrides block flow |
| Reactions | Empathy-only emoji, no likes or follower counts |
| Reporting | Anonymous, auto-hides a post after 3 distinct reports |
| Admin console | Activity monitoring, content review, editable lexicon |

---

## Tech stack

**Frontend** — React 18, Vite, Tailwind CSS, Three.js, React Three Fiber, Drei,
`@react-three/postprocessing`, Zustand
**Backend** — Node.js, Express, Helmet, `express-rate-limit`
**Database** — Supabase (PostgreSQL, Realtime, Row Level Security)
**Moderation** — Google Perspective API + local multilingual lexicons

---

## Local setup

### Prerequisites
- Node.js 18+
- A Supabase project
- A Google Perspective API key (optional — falls back to local lists)

### 1. Install dependencies
```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Create the database
In the Supabase dashboard open **SQL Editor → New query**, paste the contents of
`supabase/schema.sql`, and run it.

> The SQL Editor executes **only highlighted text** when a selection exists.
> Click once to place the cursor without selecting anything, or you will get
> "Success" while nothing is actually created.

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
| `PERSPECTIVE_API_KEY` | backend | Optional |
| `ADMIN_PASSWORD` | backend | Admin console password |
| `VITE_SUPABASE_URL` | frontend | Project URL |
| `VITE_SUPABASE_ANON_KEY` | frontend | **anon public** key only |

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

---

## Moderation architecture

Three layers, evaluated in order. Crisis detection runs **first and locally**,
so it still works if the Perspective API is unreachable.

| Layer | Scope | Verdict |
|---|---|---|
| 1. Crisis keywords | English, Tagalog, Bicolano | `403` + referral modal |
| 2. Vernacular toxicity | Tagalog, Bicolano (unsupported by Perspective) | `406` blocked |
| 3. Perspective API | English ML scoring across 6 attributes | `406` blocked |

Falls back to a local English list if the API fails, so moderation never fails
open. Administrators can extend all three lists at runtime, including an
allow-list for false positives — which deliberately **cannot** override crisis
detection.

Requests use `doNotStore: true` and a 4-second timeout, so user text is never
retained by Google and a slow API cannot hang a submission.

---

## Deployment

The frontend is a static build; the backend is a long-running Node service.
They deploy separately.

### Backend — Render / Railway / Fly.io
- Root directory: `backend`
- Build: `npm install`
- Start: `npm start`
- Set every backend env var in the dashboard, plus `CORS_ORIGIN` pointing at
  your deployed frontend URL

### Frontend — Vercel / Netlify / Cloudflare Pages
- Root directory: `frontend`
- Build: `npm run build`
- Output: `dist`
- Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_URL`
  (your deployed backend URL)

The Vite dev proxy only exists locally, so `VITE_API_URL` must be set in
production for API calls to resolve.

### Before going public

The current build is scoped for a supervised capstone demo. Address these first:

- `POST /api/moderate` is **unauthenticated** and writes to the database.
  Rate limiting (20/min per IP) is the only barrier.
- Admin auth is a **single shared password** with an in-memory token. No
  accounts, so actions are not attributable to a person.
- `backend/data/` (lexicon, audit log) is **local disk**. It will not survive a
  redeploy on an ephemeral filesystem, nor sync across multiple instances.

---

## Privacy model

No accounts exist. A random v4 UUID is generated per browser session and stored
in `sessionStorage`, so it is destroyed when the tab closes — a returning user
is unlinkable to their previous session.

The UUID exists only to enforce one reaction and one report per post. It is not
derived from any device or network attribute, so it cannot be reversed to a
person. Audit logs record verdicts, layers, text length and planet ids — never
post content. Avatars are abstract energy forms with no human traits.

**Known limits, stated honestly:** users cannot delete their own posts, because
proving ownership would require a persistent identity. Closing the tab yields a
fresh UUID, so reaction and report limits are weak against a determined user —
IP rate limiting is the only additional barrier. Supabase and the host still see
IP addresses at the network layer; the application never stores them.

---

## Project structure

```
AnonEmote/
├── frontend/
│   └── src/
│       ├── screens/        Landing, Avatar, CheckIn, Space
│       ├── components/
│       │   ├── 3d/         Planets, clay system, backdrop, avatar
│       │   ├── modals/     Post, Crisis, Report
│       │   └── ui/         HUD, panels, reactions
│       ├── admin/          Admin console
│       ├── data/           Planets, emotions, avatar options
│       └── store/          Zustand state
├── backend/
│   └── src/
│       ├── moderation/     engine.js, perspective.js
│       ├── routes/         moderate, posts, reactions, reports, admin
│       ├── middleware/     adminAuth.js
│       └── lib/            storage.js
└── supabase/
    └── schema.sql
```

---

## Evaluation

Assessed against **ISO/IEC 25010** for functional suitability, usability,
performance efficiency and security, with psychological efficacy measured via a
5-point Likert instrument administered before and after use.
