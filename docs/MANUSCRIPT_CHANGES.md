# AnonEmote — Manuscript Changes Required

This document lists discrepancies between the capstone manuscript (Chapters 1–3) and the actual implemented system. Update the manuscript to reflect what was built.

---

## 1. Tech Stack (Table 3.16 — Software Requirements)

The manuscript lists:

| Manuscript | Actual Implementation |
|---|---|
| Firebase (NoSQL) | **Supabase (PostgreSQL)** with Row Level Security and Realtime |
| Three.js (raw) | **React Three Fiber + @react-three/drei** (React wrapper over Three.js) |
| No framework mentioned | **React 18 (Vite)** as the frontend framework |
| No state management | **Zustand** for global state |
| No CSS framework | **Tailwind CSS** for styling |
| No backend framework | **Node.js + Express** for API routing |
| Google Perspective API only | **Hybrid: Local keyword lexicons (crisis + Filipino vernacular) + Google Perspective API** |
| No post-processing | **@react-three/postprocessing** (Bloom, Vignette) |
| Visual Studio Code only | **Kiro IDE** (VS Code fork) + Git + GitHub |

**Action:** Rewrite Table 3.16 to match the actual stack. Also update the Conceptual Framework (Figure 3) which references "Firebase" in the Process column.

---

## 2. Database Design (Tables 3.7–3.13)

The manuscript describes Firebase collections. The actual system uses **Supabase PostgreSQL** with these tables:

| Manuscript Collection | Actual Table | Key Differences |
|---|---|---|
| User Collection (Table 3.7) | No persistent user table | Session UUIDs in `sessionStorage` only — no server-side user record |
| Avatar Collection (Table 3.8) | No avatar table | Avatar config is client-side state only, broadcast via Supabase Presence |
| Emotion Planet Collection (Table 3.9) | No planet table | Planets are defined in frontend code (`data/planets.js`), not DB |
| Post Collection (Table 3.10) | `public.posts` | Matches, but adds: `drawing`, `is_hidden`, `review_status`, `report_score`, `flagged_at` |
| Comments Collection (Table 3.11) | `public.replies` | Only on the Seek Advice planet; moderated like posts |
| Moderation Log Collection (Table 3.12) | File-based audit log (`backend/data/`) | Not in Postgres; stored as JSONL on disk |
| System Feedback Collection (Table 3.13) | Not implemented | Likert evaluation happens outside the app (Google Forms) |

**Additional tables not in the manuscript:**
- `public.reactions` — empathy-only emoji reactions (🫂💙😢🌱✨)
- `public.reports` — anonymous reporting with `reporter_hash` for network dedupe

**Action:** Rewrite Tables 3.7–3.13 to reflect the actual schema. Remove Firebase references. Add reactions and reports tables.

---

## 3. Number of Emotion Planets

The manuscript discusses **6 planets** (Joy, Anxiety/Stress, Vent/Anger, Grief/Sadness, Motivation/Quotes, Respect).

The actual system has **7 planets**:
1. ✨ Joy
2. 🌧️ Venting
3. 🌿 Seek Advice (with replies feature)
4. 🌑 Grief & Loss
5. 🌀 Anxiety
6. 🪐 Reflections
7. 🎨 **Doodle Drift** (drawing canvas — not in manuscript)

"Planet Motivation/Quotes" and "Planet Respect" from the survey were not implemented. "Seek Advice," "Reflections," and "Doodle Drift" were added instead.

**Action:** Update any planet listings, Table 3.6 discussion, and the use case diagram to reflect the actual seven.

---

## 4. Account System vs. Session System

The manuscript's Class Diagram (Figure 10) shows an `Account` class with:
- `Username`, `Email`, `Password`, `accountStatus`
- `register()`, `login()` methods

**The actual system has NO accounts.** There is no registration, no login, no email, no password. Identity is a random UUID stored in `sessionStorage` that expires when the tab closes.

**Action:** Remove the Account class from the class diagram. Replace with a `Session` entity that has only `sessionId (UUID)` and `createdAt`. Update the sequence diagrams that show "login" or "register" steps.

---

## 5. Moderation Architecture

The manuscript describes a **two-layer** system:
- Layer 1: Local Lexicon
- Layer 2: Google Perspective API

The actual system is **three layers** with priority ordering:

| Layer | Scope | Languages | What Happens |
|---|---|---|---|
| 1. Crisis detection | Local keywords | EN, TL, BCL | 403 + Emergency Referral UI (preserves draft) |
| 2. Vernacular toxicity | Local keywords | TL, BCL | 406 blocked |
| 3. ML scoring | Google Perspective API | EN | 406 blocked |
| Fallback | Local English list | EN | Used when Perspective is unreachable |

Additional moderation features not in manuscript:
- **Admin-editable lexicon** (crisis, toxic, allow-list) applied at runtime
- **Allow-list** that overrides toxic but cannot override crisis
- **Evasion normalization** (leet-speak, spacing tricks, zero-width chars)
- Crisis flow **preserves the user's draft** rather than discarding it

**Action:** Update Figure 8 (Content Posting and Filtering sequence diagram) to show the three-layer architecture. Add the crisis-preservation flow.

---

## 6. Reporting System

The manuscript's sequence diagram (Figure 9) shows reporting as: flag → hide post immediately.

The actual system:
- Reports flag for **human review**, not immediate hiding
- Auto-quarantine only on **2+ independent networks** for severe categories, or **4+ networks** broadly
- Dedupe by **privacy-preserving IP hash** (`HMAC(secret, ip + postId)`), not session ID alone
- Admin has four actions: Flag & hide, Restore, **Approve & protect** (immune to re-flagging), Delete

**Action:** Redraw the reporting portion of Figure 9. Add the admin review workflow to Figure 7.

---

## 7. Features Added Beyond Manuscript Scope

These exist in the deployed system but are not mentioned in the manuscript:

| Feature | Description |
|---|---|
| Emotion check-in flow | Two-step triage (broad feeling → nuance) before entering the star system |
| Abstract avatar creator | 10 shapes, 18 colours, 4 particle effects — deliberately non-human |
| Doodle Drift planet | Drawing canvas; drawings displayed as texture on planet surface |
| Real-time multiplayer presence | Supabase Presence shows other users' avatars in the 3D scene |
| Private notes | Crisis-preserved drafts saved locally in sessionStorage |
| Replies on Seek Advice | One-level-deep moderated replies |
| Kepler orbital mechanics | Planet speeds derived from ω = K/r^1.5 |
| Adaptive quality tiers | Mobile auto-downgrades (no shadows, no bloom, no decor) |
| Admin console | Activity monitoring, content review queue, editable lexicon, dry-run tester |

**Action:** Decide which to include in the manuscript. At minimum, the check-in flow, avatar creator, and presence system should be documented since they directly address the research objectives (emotional literacy, psychological buffer, community).

---

## 8. System Architecture (Figure 5)

The manuscript shows: Frontend → Internet → Application Server → Backend (with AI Moderation API as a separate box).

Actual architecture:
- **Frontend:** React + Vite, deployed on **Vercel** (static)
- **Backend:** Node.js + Express, deployed on **Render**
- **Database:** Supabase (PostgreSQL + Realtime + Presence)
- **External API:** Google Perspective API
- **No "Application Server" as a separate entity** — the backend IS the application server

The frontend connects to:
1. Backend via REST API (`/api/moderate`, `/api/reactions`, `/api/reports`, `/api/replies`, `/api/admin`)
2. Supabase directly for reads (posts, realtime subscriptions, presence)

**Action:** Redraw Figure 5 to show the actual deployment topology (Vercel ↔ Render ↔ Supabase ↔ Perspective API).

---

## 9. Security Claims

The manuscript mentions "encrypted temporary IDs" (Table 3.21). The actual system does NOT encrypt the session UUID — it's a plain v4 UUID in `sessionStorage`. There is nothing to encrypt because the UUID itself is random and meaningless.

What the system actually does for security:
- Helmet HTTP headers
- CORS allowlist
- Rate limiting (20 moderation/min, 10 reports/10min, 60 reactions/min)
- Admin auth: timing-safe password comparison, 8h token expiry, kill switch
- Report dedupe: HMAC-SHA256 per-post network hash
- Row Level Security on Supabase tables
- No PII stored anywhere

**Action:** Replace "encrypted temporary IDs" with "cryptographically random ephemeral UUIDs" and list the actual security controls.

---

## 10. ISO/IEC 25010 Alignment

The manuscript references Security, Usability, and Reliability (Statement of the Problem, Q3).

For the defense, be prepared to address these honestly:

| Quality Characteristic | Strength | Known Limitation |
|---|---|---|
| **Security** | No PII, RLS, rate limiting, HMAC dedupe | `/api/moderate` is unauthenticated; admin is single shared password |
| **Usability** | 3D navigation, touch support, mobile optimization | No keyboard-only path to the 3D scene; no screen reader support |
| **Reliability** | Error boundary, graceful fallbacks, realtime sync | Backend on free-tier Render (sleeps after 15min); no automated tests |

**Action:** In Chapter 4 (if writing evaluation results), state these limitations explicitly rather than leaving them to be discovered by panelists.

---

## 11. Minor Corrections

- The manuscript says "Firebase" 7+ times → replace all with "Supabase (PostgreSQL)"
- Class diagram shows `Email`, `Password` fields → remove entirely
- Table 3.16 says "Development Tools: Visual Studio Code" → add "Kiro IDE, Git, GitHub"
- The toxicity threshold in Figure 8 is stated as "0.70" → actual thresholds vary by attribute (0.6–0.75, see `perspective.js`)
- Manuscript mentions "shape-shifting IDs" → actual term is "ephemeral session UUIDs"
- System Architecture shows "File Storage" for assets → actual 3D assets are procedural code, not stored files

---

## Summary Priority

1. **Critical (will be asked about):** Account system removal, Firebase→Supabase, moderation layers, reporting redesign
2. **Important (strengthens defense):** Actual tech stack, new features documentation, security controls
3. **Nice to have:** Updated diagrams, minor terminology fixes

Update Chapters 1 and 3 first. Chapter 2 (Methodology) is mostly fine since the Iterative Development Model accurately describes how the system was built.
