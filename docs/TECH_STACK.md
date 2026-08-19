# AnonEmote — Technology Stack

## Overview

AnonEmote is built as a monorepo with two packages (frontend and backend) using npm workspaces. The system combines a 3D interactive web experience with real-time data synchronization and AI-powered content moderation.

---

## Frontend

| Category | Technology | Version |
|----------|-----------|---------|
| UI Framework | React | 18.3.1 |
| Build Tool | Vite | 5.3.4 |
| 3D Engine | Three.js | 0.166.1 |
| 3D React Bindings | @react-three/fiber | 8.16.8 |
| 3D Helpers | @react-three/drei | 9.109.2 |
| Post-Processing | @react-three/postprocessing | 2.16.3 |
| Post-Processing (core) | postprocessing | 6.36.4 |
| State Management | Zustand | 4.5.4 |
| CSS Framework | Tailwind CSS | 3.4.6 |
| CSS Processing | PostCSS | 8.4.39 |
| CSS Vendor Prefixes | Autoprefixer | 10.4.19 |
| Database Client | @supabase/supabase-js | 2.43.4 |
| UUID Generation | uuid | 10.0.0 |
| Testing | Vitest | 4.1.10 |
| Testing (DOM) | @testing-library/react | 16.3.2 |
| Testing (assertions) | @testing-library/jest-dom | 7.0.1 |
| Property-Based Testing | fast-check | 4.9.0 |
| DOM Simulation | jsdom | 30.0.1 |

### Frontend Architecture

- **Language:** JavaScript (ES Modules, JSX)
- **Component Pattern:** Functional components with hooks
- **Routing:** Phase-based navigation driven by Zustand store state (no router library)
- **Rendering:** Client-side SPA with 3D WebGL scene (React Three Fiber)
- **Styling:** Utility-first CSS (Tailwind) with custom glassmorphism classes
- **Real-time:** Supabase Realtime subscriptions (posts) + Presence (multiplayer avatars)

---

## Backend

| Category | Technology | Version |
|----------|-----------|---------|
| Runtime | Node.js | ≥18.0.0 |
| Web Framework | Express | 4.19.2 |
| Database Client | @supabase/supabase-js | 2.43.4 |
| Direct Database Access | pg (node-postgres) | 8.13.1 |
| Security Headers | Helmet | 7.1.0 |
| CORS | cors | 2.8.5 |
| Rate Limiting | express-rate-limit | 7.3.1 |
| Environment Variables | dotenv | 16.4.5 |
| UUID Generation | uuid | 10.0.0 |
| Testing | Vitest | 4.1.10 |
| Property-Based Testing | fast-check | 4.9.0 |

### Backend Architecture

- **Language:** JavaScript (ES Modules)
- **Pattern:** RESTful API with Express routers
- **Authentication:** Supabase Auth JWT verification + custom admin session tokens
- **Moderation:** Three-layer hybrid AI pipeline (crisis keywords → vernacular toxicity → Google Perspective API)
- **Admin:** Single-password gate with timing-safe comparison and in-memory session tokens (8-hour TTL)

---

## Database & Infrastructure

| Category | Technology | Details |
|----------|-----------|---------|
| Database | PostgreSQL | Via Supabase (managed) |
| BaaS Platform | Supabase | Auth, Realtime, Presence, Row Level Security |
| AI Moderation | Google Perspective API | Toxicity scoring for English text |
| Local Moderation | Custom keyword lexicon | Filipino/Bicol vernacular + crisis terms |

### Database Tables

- `posts` — user-submitted content (text + optional drawings)
- `reactions` — empathy-only emoji reactions (🫂💙😢🌱✨)
- `reports` — community content reports with HMAC-SHA256 network deduplication
- `profiles` — user profiles linked to Supabase Auth (suspension state)

---

## Deployment

| Component | Platform | Tier | Region |
|-----------|----------|------|--------|
| Frontend | Vercel | Free (Static) | Auto (Edge) |
| Backend | Render | Free (Web Service) | Singapore |
| Database | Supabase | Free | — |

### Deployment Method

- **Frontend:** Vercel CLI (`vercel --prod --yes`) — manual deploy due to git email mismatch
- **Backend:** Auto-deploy from GitHub push to Render
- **Database:** Supabase dashboard + migration scripts (`backend/scripts/migrate.js`)

---

## Development Tools

| Tool | Purpose |
|------|---------|
| npm workspaces | Monorepo package management |
| Vite Dev Server | Frontend HMR + API proxy to backend |
| Node --watch | Backend auto-restart on file changes |
| Vitest | Unit and property-based testing |
| Git + GitHub | Version control and collaboration |

---

## Security Measures

| Measure | Implementation |
|---------|---------------|
| Content Security | Helmet (security headers) |
| Rate Limiting | express-rate-limit (per-endpoint) |
| CORS | Restricted origin allowlist |
| Admin Auth | Timing-safe password comparison (crypto.timingSafeEqual) |
| Report Deduplication | HMAC-SHA256 hash of IP + post ID |
| Row Level Security | Supabase RLS policies on all tables |
| Anonymous Identity | Random UUID per session (sessionStorage), no PII stored |
| Crisis Detection | Three-layer keyword scanning preserves user drafts |

---

## Key Technical Decisions

1. **No TypeScript** — Plain JavaScript with JSDoc comments for documentation
2. **No router library** — Phase-based navigation via Zustand store state
3. **Frontend reads, backend writes** — Frontend reads directly from Supabase (anon key, RLS-protected); all writes go through the backend Express API for moderation
4. **Empathy-only reactions** — No likes, downvotes, or ranking to avoid social performance pressure
5. **Anonymous sessions** — UUID in sessionStorage expires on tab close; hybrid auth adds optional accounts for posting privileges
6. **WebGL optimization** — Quality tiers based on device capability; shadow maps disabled on AMD ANGLE to prevent context loss
