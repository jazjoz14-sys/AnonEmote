# AnonEmote — Manuscript Changes Required (Version 2)

This document lists all discrepancies between the capstone manuscript (Chapters 1–3) and the **current** implemented system as of August 2026. Update the manuscript to reflect what was actually built.

---

## 1. Account System — Major Change from Manuscript

### What the manuscript says:
- <cite index="1-104">The system gives the user a free, pseudonymous identity instantly rather than creating a permanent profile over which Personally Identifiable Information (PII) is held.</cite>
- <cite index="1-161">It means the basic security functionality of AnonEmote in which the users are provided with pseudonymous, temporary IDs rather than permanencies, which are created in such a way that no real names are attached to posts made on the Emotion planets.</cite>
- The Class Diagram (Figure 10) shows an `Account` class with `Username`, `Email`, `Password`, `accountStatus`, `register()`, `login()` methods.

### What the system actually does now:
- **Hybrid model**: Users can register with **email + password** (via Supabase Auth) for full access (posting, replying, reacting), OR browse as a **guest** (view-only mode)
- Email is **hidden from other users and admins** — only used for login/password reset
- Posts remain anonymous in the social layer — other users never see who wrote what
- Only admins can link a post to an account when investigating a report (via `author_id` column)
- Guest users can still navigate the 3D star system and read all posts, but cannot post, reply, or react
- When a guest clicks "Broadcast", a modal prompts them to sign in — no redirect, no page change

### What to update in the manuscript:
- **Table 3.7** (Anonymous Session Table): Add the `profiles` table with `id`, `avatar_config`, `is_suspended`, `suspended_at`, `suspension_reason`
- **Class Diagram (Figure 10)**: The Account class should reflect email-only auth (no Username, no visible profile). Add `is_suspended` field. Remove `generateSessionID()` — replaced by Supabase Auth
- **Table 3.21** (Functional Requirements): Update "User registration information (optional email)" row — email is now **required** for posting access, optional only for guest browsing
- **Description of Proposed System** (pages 11-12): Rewrite to reflect the hybrid guest/authenticated model
- **Scope and Delimitation**: Remove "the system does not store any personal information" — it now stores email (encrypted by Supabase Auth) for accountability

---

## 2. Tech Stack Updates (Table 3.16)

### What the manuscript says:
- <cite index="1-678">Table 3.16 explored the software requirements, including JavaScript, HTML5, and CSS3 to implement the core logic and structural base; Three.js and Tailwind CSS to build the 3D interactive user interface; and Supabase (PostgreSQL with Realtime and Row Level Security) to store the application data safe, including user avatars and anonymous posts.</cite>

### What has changed:
| Manuscript | Actual Implementation |
|---|---|
| Three.js (raw) | **React Three Fiber + @react-three/drei** (React wrapper over Three.js) |
| No framework mentioned | **React 18 (Vite)** as the frontend framework |
| No state management | **Zustand** for global state |
| No post-processing | **@react-three/postprocessing** (Bloom, Vignette) |
| Visual Studio Code only | **Kiro IDE** (VS Code fork) + Git + GitHub |
| No authentication | **Supabase Auth** (email/password) |
| Development Tools: Visual Studio Code | Add: Kiro IDE, Vercel CLI, Render |

### What to update:
- Rewrite Table 3.16 completely
- Update Conceptual Framework (Figure 3) Process column — add "Supabase Auth", "React Three Fiber", "Zustand"

---

## 3. Database Design Changes (Tables 3.7–3.13)

### New tables not in the manuscript:
| Table | Purpose |
|---|---|
| `public.profiles` | Linked to Supabase Auth users; stores avatar_config, suspension status |
| `public.reactions` | Empathy-only emoji reactions (🫂💙😢🌱✨) |
| `public.reports` | Anonymous reporting with `reporter_hash` for network dedupe |

### Modified tables:
| Manuscript Table | Changes |
|---|---|
| Post Collection (Table 3.10) | Added: `author_id` (links to profiles), `drawing` (base64 PNG for Doodle planet) |
| Replies Collection (Table 3.11) | Added: `author_id` (links to profiles) |

### What to update:
- Add `profiles` table definition
- Add `reactions` and `reports` table definitions
- Update Post and Replies tables with `author_id` column
- Remove "Session database with encrypted temporary IDs" from Table 3.21 — sessions are now managed by Supabase Auth

---

## 4. Number of Emotion Planets

### What the manuscript says:
- <cite index="1-549">Planet Joy / Happiness, Planet Anxiety / Stress, Planet Vent / Anger, Planet Grief / Sadness, Planet Motivation / Quotes, Planet Respect</cite> (6 planets from survey)

### What the system has:
1. ✨ Joy
2. 🌧️ Venting
3. 🌿 Seek Advice (with replies feature)
4. 🌑 Grief & Loss
5. 🌀 Anxiety
6. 🪐 Reflections
7. 🎨 **Doodle Drift** (drawing canvas)

"Planet Motivation/Quotes" and "Planet Respect" were not implemented. "Seek Advice," "Reflections," and "Doodle Drift" were added instead.

### What to update:
- Update Table 3.6 discussion
- Update Use Case diagram (Figure 6) to reflect 7 planets
- Mention Doodle Drift as a multimedia expression feature (drawing canvas)

---

## 5. Moderation Architecture

### What the manuscript says:
- <cite index="1-617">a dual-layer protocol: a local lexicon that allows the instant identification of slang and a Google API that allows more extensive natural-language processing.</cite>

### What the system actually has (three layers):
| Layer | Scope | Languages | What Happens |
|---|---|---|---|
| 1. Crisis detection | Local keywords | EN, TL, BCL | 403 + Emergency Referral UI (preserves draft) |
| 2. Vernacular toxicity | Local keywords | TL, BCL | 406 blocked |
| 3. ML scoring | Google Perspective API | EN | 406 blocked |
| Fallback | Local English list | EN | Used when Perspective is unreachable |

### Additional moderation features not in manuscript:
- **Admin-editable lexicon** (crisis, toxic, allow-list) applied at runtime
- **Allow-list** that overrides toxic but cannot override crisis
- **Evasion normalization** (leet-speak, spacing tricks, zero-width chars)
- Crisis flow **preserves the user's draft** rather than discarding it
- **Three-layer priority ordering** — crisis always runs first, locally

### What to update:
- Figure 8 (Content Posting and Filtering sequence diagram): Show three layers, not two
- Add the crisis-preservation flow
- Update the toxicity threshold mention ("0.70") — actual thresholds vary by attribute (0.6–0.75)

---

## 6. Reporting System

### What the manuscript says:
- Figure 9 shows: flag → hide post immediately

### What the system actually does:
- Reports flag for **human review**, not immediate hiding
- Auto-quarantine only on **2+ independent networks** for severe categories, or **4+ networks** broadly
- Dedupe by **privacy-preserving IP hash** (`HMAC(secret, ip + postId)`), not session ID alone
- Admin has four actions: Flag & hide, Restore, **Approve & protect** (immune to re-flagging), Delete

### What to update:
- Redraw the reporting portion of Figure 9
- Add admin review workflow to Figure 7

---

## 7. Features Added Beyond Manuscript Scope

| Feature | Description | Multimedia Showcase |
|---|---|---|
| Emotion check-in flow | Two-step triage (broad feeling → nuance) before entering the star system | Interactive UI design |
| Abstract avatar creator | 10 shapes, 18 colours, 4 particle effects — deliberately non-human | 3D procedural geometry |
| Doodle Drift planet | Drawing canvas; drawings displayed as texture on planet surface | Digital art / canvas API |
| Real-time multiplayer presence | Supabase Presence shows other users' avatars in the 3D scene | Real-time networking |
| Private notes | Crisis-preserved drafts saved locally in sessionStorage | UX compassion design |
| Replies on Seek Advice | One-level-deep moderated replies | Community interaction |
| Kepler orbital mechanics | Planet speeds derived from ω = K/r^1.5 | Physics simulation |
| Adaptive quality tiers | Mobile auto-downgrades (no shadows, no bloom, no decor) | Performance optimization |
| Admin console | Activity monitoring, content review queue, editable lexicon, dry-run tester | System administration |
| Account-based system | Email auth for posting; guest mode for browsing | Authentication architecture |
| Rocket launch animation | Post submission shows rocket animation during AI scanning | Motion graphics / CSS art |
| Scroll-driven planet carousel | Vertical scroll moves planets horizontally (Yzavoku-style) | Scroll-jacking interaction |
| Custom planet icon assets | Hand-designed planet icons for each emotion category | Graphic design |

### What to update:
- At minimum, document: check-in flow, avatar creator, presence system, Doodle Drift, account system
- These directly address research objectives (emotional literacy, psychological buffer, community, accountability)
- The multimedia features (3D, canvas drawing, real-time, procedural animation) showcase the specialization

---

## 8. System Architecture (Figure 5)

### What the manuscript shows:
- Frontend → Internet → Application Server → Backend (with AI Moderation API as a separate box)

### Actual architecture:
- **Frontend:** React + Vite, deployed on **Vercel** (static)
- **Backend:** Node.js + Express, deployed on **Render**
- **Database:** Supabase (PostgreSQL + Realtime + Presence + **Auth**)
- **External API:** Google Perspective API
- **No "Application Server" as a separate entity** — the backend IS the application server

The frontend connects to:
1. Backend via REST API (`/api/moderate`, `/api/reactions`, `/api/reports`, `/api/replies`, `/api/admin`)
2. Supabase directly for reads (posts, realtime subscriptions, presence) and **authentication**

### What to update:
- Redraw Figure 5 to show: Vercel ↔ Render ↔ Supabase ↔ Perspective API
- Add Supabase Auth as a component in the architecture

---

## 9. Security & Privacy Updates

### What the manuscript says:
- <cite index="1-384">Furthermore, the system does not store any personal information, as it only utilizes the temporary session-based data that is necessary for the system functionality.</cite>
- Table 3.21 mentions "Session database with encrypted temporary IDs"

### What the system actually does:
- **Stores email** (encrypted by Supabase Auth) for registered users
- Email is used ONLY for login — never displayed to other users or admins
- Posts are linked to `author_id` internally but displayed anonymously
- Guest mode still uses ephemeral session UUIDs (no PII)
- **Rate limiting**: 20 moderation/min, 10 reports/10min, 60 reactions/min
- **Admin auth**: timing-safe password comparison, 8h token expiry, kill switch
- **Report dedupe**: HMAC-SHA256 per-post network hash
- **Row Level Security** on Supabase tables
- **Helmet HTTP headers**, **CORS allowlist**
- **Account suspension** capability for repeat offenders

### What to update:
- Replace "the system does not store any personal information" with explanation of the hybrid model
- Add that email is stored securely by Supabase Auth but never exposed in the social layer
- Update security claims to reflect actual controls
- Add account suspension as an admin capability

---

## 10. UI/UX Design Changes

### What the manuscript implies:
- <cite index="1-162">Avatar Customization - It is the multimedia arts component of the system that enables the user to creatively construct his or her shape-shifting 3D character and the beauty of the planets to which he or she communicates with.</cite>

### What actually exists:
- **Landing page**: OkayDev-inspired atmospheric design with massive typography, scroll-jacking planet carousel, 3D background planets, custom icon assets
- **Avatar screen**: Collapsible sections panel with live 3D preview, 10 shapes, 18 aura colors, 4 particle effects, size slider
- **Star system HUD**: Minimal chrome, uppercase micro-labels, outline-only buttons
- **Post modal**: Rocket ship animation during AI moderation scanning, pop-in animation
- **Guest mode UI**: Auth prompt modal when attempting restricted actions
- **No gradients, no emoji badges, no glass-morphism** — replaced with monochrome + single accent design system

### What to update:
- Screenshots/mockups in Chapter 3 need to be replaced with current UI
- Mention the anti-AI-slop design approach as a deliberate UX decision
- Document the responsive/mobile optimization (quality tiers, touch targets, safe-area insets)

---

## 11. Scope and Delimitation Updates

### Current text says:
- <cite index="1-383">the development is strictly limited to a web-based implementation, excluding mobile application development, even cross-platform deployment, and large-scale release.</cite>

### What to add/change:
- The system IS optimized for mobile web (responsive, touch-friendly, quality tiers) — this doesn't contradict "excluding mobile application development" (it's still web-based, not a native app)
- Add: "The system now includes an optional account system for posting accountability, while maintaining anonymity in the social layer"
- Add: "Guest users can browse without registration; accounts are required only for content creation"

---

## 12. ISO/IEC 25010 Alignment Updates

### For the defense, be prepared to address:

| Quality Characteristic | Strength | Known Limitation |
|---|---|---|
| **Security** | Supabase Auth, RLS, rate limiting, HMAC dedupe, account suspension | `/api/moderate` is unauthenticated (rate-limited only); admin is single shared password |
| **Usability** | 3D navigation, touch support, mobile optimization, adaptive quality | No keyboard-only path to the 3D scene; no screen reader support |
| **Reliability** | Error boundary, graceful fallbacks, realtime sync, context-loss recovery | Backend on free-tier Render (sleeps after 15min); no automated tests |
| **Functional Suitability** | All core features working, guest/auth dual mode, AI moderation | Drawing moderation relies on community reports (AI can't scan images) |

---

## Summary Priority

1. **Critical (will be asked about):** Account system addition, session→auth change, three-layer moderation, reporting redesign, 7 planets
2. **Important (strengthens defense):** Actual tech stack, new features (especially multimedia showcase ones), security controls, UI redesign rationale
3. **Nice to have:** Updated diagrams, minor terminology fixes, deployment architecture

**Update Chapters 1, 3, and 4.** Chapter 2 (Methodology) is mostly fine since the Iterative Development Model accurately describes how the system was built — the account system addition is an example of the iterative refinement process.
