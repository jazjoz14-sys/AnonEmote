# AnonEmote — Defense Preparation Guide

> **Purpose:** Everything you need to ace the capstone defense. Demo script, anticipated questions with answers, ISO/IEC 25010 mapping, and theoretical framework references.

---

## Table of Contents

1. [Before the Defense (Checklist)](#1-before-the-defense-checklist)
2. [Demo Script (Step by Step)](#2-demo-script-step-by-step)
3. [Common Panelist Questions & Answers](#3-common-panelist-questions--answers)
4. [ISO/IEC 25010 Mapping](#4-isoiec-25010-mapping)
5. [Theoretical Framework Quick Reference](#5-theoretical-framework-quick-reference)
6. [Potential Weaknesses (And How to Address Them)](#6-potential-weaknesses-and-how-to-address-them)
7. [Statistics & Numbers to Mention](#7-statistics--numbers-to-mention)
8. [Emergency Troubleshooting (If Things Go Wrong)](#8-emergency-troubleshooting-if-things-go-wrong)

---

## 1. Before the Defense (Checklist)

### 5 Minutes Before

- [ ] **Wake up Render backend** — Open https://anonemote.onrender.com/api/posts in a browser tab. Wait for a JSON response (takes 30-60 seconds on cold start). Do this BEFORE presenting.
- [ ] **Open the live site** — https://anonemoteproject.vercel.app in a fresh browser tab
- [ ] **Open admin console in another tab** — https://anonemoteproject.vercel.app/#admin
- [ ] **Prepare a fresh email** — For the live sign-up demo (use a throwaway like `demo-defense@gmail.com`)
- [ ] **Have the GitHub repo open** — https://github.com/jazjoz14-sys/AnonEmote for showing code
- [ ] **Disable browser extensions** — Ad blockers can interfere with WebGL
- [ ] **Close other GPU-heavy apps** — Games, video editors, other browser tabs with 3D

### Know These Numbers

| Metric | Value |
|--------|-------|
| Total tests | 500+ (260 backend, 251 frontend) |
| Backend routes | 6 (moderate, posts, reactions, reports, replies, admin) |
| Moderation layers | 3 (crisis → vernacular → Perspective API) |
| Supported languages | 3 (English, Tagalog, Bicolano) |
| Planets | 7 (Joy, Venting, Seek Advice, Grief, Anxiety, Reflections, Doodle) |
| Emotion nuances | 40+ sub-emotions across all categories |
| Avatar combinations | 10 shapes × 18 colors × 4 particles = 720 unique combos |
| Empathy reactions | 5 (🫂💙😢🌱✨) |
| Security headers | 11 (via Helmet) |
| Character limit | 280 per post |

---

## 2. Demo Script (Step by Step)

> **Total time:** Aim for 10-12 minutes. Practice this until it's smooth.

### Step 1: Landing Page (30 seconds)
- Show the horizontal planet carousel
- Mention: "Each planet represents an emotional category. The 3D interface creates psychological distance from traditional social media feeds."
- Point out: single Canvas architecture (no WebGL context explosion)

### Step 2: Sign Up (1 minute)
- Click "Get Started" or "Sign Up"
- Enter email and password
- Mention: "Anonymous in the social layer — email is only for account recovery and admin investigation. No names, no profiles, no photos."
- After sign-up, you're taken to the Avatar screen

### Step 3: Avatar Customization (1 minute)
- Show the 3D preview of the avatar shape
- Change shape (orb, prism, spirit, etc.)
- Change aura color
- Change particle effect
- Mention: "Abstract non-human shapes by design — based on SIDE Theory, removing human features prevents identity cues and social comparison."

### Step 4: Emotion Check-in (1.5 minutes)
- **MoodSpace** — Show the continuous 2D emotion field. Move cursor/finger around.
- Mention: "Instead of picking one emotion from a list, users explore a continuous space. This reflects how emotions aren't discrete categories."
- **NuanceConstellation** — Select a nuance sub-emotion
- Mention: "This two-phase check-in is based on emotional literacy research — naming specific feelings builds emotional vocabulary."
- The writing prompt appears, tailored to their selected feeling

### Step 5: 3D Star System (2 minutes)
- Show the full star system: central star, orbiting planets, orbit rings
- Drag to orbit the camera
- Zoom in/out
- Click on different planets — show the camera fly-in animation
- Point out: "Each planet orbits at a different speed and distance, creating a living, breathing universe."
- Show peer avatars (if other users are online)

### Step 6: Post Successfully (1.5 minutes)
- Select the Joy planet
- Type something safe: "Natapos ko na ang thesis chapter! Feeling accomplished."
- Click "Broadcast"
- Show the rocket launch animation
- Show the post appearing on the planet
- Mention: "This text passed all three moderation layers before being stored."

### Step 7: Crisis Detection (1.5 minutes)
- Select Venting planet
- Type a crisis keyword (in Filipino): "Gusto ko nang mawala sa mundo"
- Click "Broadcast"
- Show the Crisis Modal appearing with hotline numbers
- Mention: "The draft is PRESERVED — never deleted. The user can save it as a private note. We never decide what to do with their writing — they do."
- Show that the post was NOT stored in the database

### Step 8: Toxic Content Blocking (1 minute)
- Type a toxic Filipino word: "Ang bobo mo naman"
- Click "Broadcast"
- Show the 406 error message
- Mention: "Layer 2 caught this — Tagalog toxicity that Google Perspective API doesn't understand."

### Step 9: Reactions (30 seconds)
- Go to a planet with existing posts
- Click a reaction emoji (🫂 or 💙)
- Mention: "Empathy-only reactions. No likes, no downvotes, no ranking. This prevents social performance pressure."

### Step 10: Reporting (30 seconds)
- Click the report button on a post
- Show the reason options
- Mention: "Reports are deduplicated with HMAC-SHA256 — one user can only report a post once, even across sessions."

### Step 11: Admin Console (1.5 minutes)
- Switch to the admin tab
- Show **Monitor tab** — real-time activity feed
- Show **Reports tab** — flagged content queue
- Show **Lexicon Editor** — add/remove keywords
- Show the **dry-run tester** — type text and see which layer would flag it
- Mention: "Administrators can extend all moderation lists at runtime without redeploying code."

### Step 12: Evaluation Modal (30 seconds)
- Mention: "After sufficient activity, users see an ISO/IEC 25010 evaluation survey asking about usability, security perception, and emotional expression ease."
- Show the modal (if triggered) or explain the threshold system

### Closing Statement (30 seconds)
> "AnonEmote demonstrates that anonymous platforms can be safe when moderation is baked into the architecture. Every piece of content passes through three AI layers before reaching the database. Filipino language support fills a gap that commercial APIs don't address. The 3D interface reimagines emotional expression as spatial exploration rather than feed consumption."

---

## 3. Common Panelist Questions & Answers

### Architecture & Design

**Q: "Why anonymous? Isn't that dangerous?"**

> Anonymity is actually the point. Based on the Online Disinhibition Effect (Suler, 2004), removing identity cues reduces evaluation apprehension — people are more honest about their emotions when they can't be judged socially. Anonymous does NOT mean unmoderated. We have three layers of AI moderation, a report system, and admin review. The system is anonymous in the social layer but accountable behind the scenes — every post has an author_id for admin investigation.

**Q: "How do you prevent abuse without real identity?"**

> Five mechanisms work together:
> 1. Three-layer AI moderation before content reaches the database
> 2. Rate limiting (20 posts/minute) prevents spam
> 3. Reporting system with HMAC deduplication (one report per person per post)
> 4. Auto-quarantine after multiple independent reports
> 5. Admin console for human review
>
> The key insight: you don't need to know WHO someone is to prevent WHAT they say from being harmful.

**Q: "Why 3D instead of a simple feed?"**

> Three reasons based on Affordance Theory:
> 1. **Spatial separation** — Each emotion lives on its own planet. Users consciously "travel" to an emotional context instead of having mixed emotions in one feed.
> 2. **No infinite scroll** — Traditional feeds cause doom-scrolling. A 3D space requires intentional navigation, reducing compulsive consumption.
> 3. **Multimedia Technology demonstration** — Our specialization is multimedia. A 3D WebGL star system demonstrates advanced technical capability that a regular CRUD app wouldn't.

**Q: "What happens if the internet is slow or goes down?"**

> Graceful degradation at every layer:
> - Crisis detection works offline (local keywords, zero network calls)
> - Perspective API has a 4-second timeout with local fallback
> - Frontend has quality tiers (low/medium/high) adapting to device capability
> - Posts cached in Zustand persist in localStorage for authenticated users
> - Offline indicator shown when connectivity is lost

**Q: "How many concurrent users can this handle?"**

> - Supabase free tier: 50,000 monthly active users, 500MB database
> - Render free tier: 512MB RAM, sufficient for our Express API
> - For Partido State University (target deployment), we'd expect 50-200 concurrent users — well within limits
> - If scaling were needed: Supabase Pro ($25/month) supports millions of rows, Render paid tier handles higher concurrency

---

### Technical Implementation

**Q: "How does the moderation work exactly?"**

> Three layers evaluated in sequence:
> 1. **Crisis (local, instant)** — Aho-Corasick pattern matching against 100+ crisis keywords in English, Tagalog, and Bicolano. If detected: 403 status, crisis referral shown, user's draft preserved.
> 2. **Vernacular toxicity (local)** — Same Aho-Corasick engine but against Filipino/Bicolano profanity and slurs that Perspective API doesn't understand. Includes word-boundary validation (so "class" doesn't match "ass") and safe-context suppression (so "I feel like shit" isn't blocked because "I feel like" is an emotional phrase).
> 3. **Perspective API (remote, English ML)** — Scores text across 6 attributes (toxicity, severe toxicity, identity attack, insult, profanity, threat). If any score exceeds the threshold: blocked.
>
> If Perspective is unavailable (timeout/downtime), a local fallback scan runs instead. Moderation NEVER fails open.

**Q: "What is Aho-Corasick and why did you choose it?"**

> Aho-Corasick is a multi-pattern string matching algorithm. Instead of checking 500 keywords one by one (O(n×k)), it builds a state machine at startup and then scans any text in O(n) time — one pass, all patterns simultaneously.
>
> We chose it because our lexicon has 500+ terms across 3 languages. Checking each term individually for every post would be slow. Aho-Corasick is the same algorithm used by antivirus software and network intrusion detection systems.

**Q: "Explain your authentication flow"**

> 1. User registers with email/password → Supabase Auth creates account, issues JWT
> 2. Frontend stores JWT in Supabase's session management (httpOnly, auto-refresh)
> 3. Every API call attaches JWT in `Authorization: Bearer <token>` header (via apiFetch wrapper)
> 4. Backend middleware (verifyAuth) extracts token, verifies with Supabase, attaches `req.userId`
> 5. Write endpoints have additional `requireAuth` middleware that blocks guests
> 6. Posts are stored with `author_id = req.userId` (server-derived, cannot be faked)
>
> Social anonymity is maintained because `author_id` is a UUID — it doesn't reveal email or identity to other users.

**Q: "What is Row Level Security?"**

> PostgreSQL's built-in access control at the row level. We define policies like:
> - "Any user can SELECT posts WHERE is_hidden = FALSE" (can browse visible posts)
> - "INSERT on posts is blocked for the anon key" (only backend's service_role can insert)
>
> This means even if someone finds our Supabase anon key and queries the database directly, they can only see public data. They cannot insert, update, or delete anything. It's security at the database engine level, independent of our application code.

**Q: "How does real-time work?"**

> 1. Backend inserts a moderated post into Supabase
> 2. Supabase's Realtime engine detects the INSERT via PostgreSQL's Change Data Capture
> 3. All frontend clients subscribed to the `posts` channel receive the new row via WebSocket
> 4. Zustand store's `addPost()` adds it to state (with deduplication check)
> 5. React re-renders the planet's post list — new post appears for everyone within ~200ms

**Q: "Why do reads go directly to Supabase but writes go through your backend?"**

> Reads are safe — Row Level Security controls what's visible. No moderation needed for reading.
> Writes need moderation. If the frontend could write directly to Supabase, users could open browser DevTools, remove the moderation call, and post anything. Routing all writes through our backend guarantees 100% of content is moderated before storage.

**Q: "What's the safe-context system?"**

> A false-positive reduction mechanism. Some toxic keywords appear in legitimate emotional expressions:
> - "I feel like **shit**" — emotional expression (safe)
> - "You're a piece of **shit**" — directed insult (toxic)
>
> We maintain a list of safe-context phrases ("I feel like", "ang hirap", "ang sakit"). If a toxic word is found WITHIN the span of a safe-context phrase, it's suppressed. If 3+ distinct safe-context phrases are present, the post is held for human review instead of auto-blocked.
>
> Crisis detection CANNOT be overridden by safe-context — safety is absolute priority.

---

### Theoretical Framework

**Q: "How does your system relate to Self-Determination Theory?"**

> SDT identifies three psychological needs:
> - **Autonomy** — Users choose when, where, and how to express (which planet, text/drawing, with/without prompt)
> - **Competence** — The emotion check-in guides users in naming their feelings, building emotional literacy skills
> - **Relatedness** — Empathy reactions (🫂💙😢🌱✨) provide connection without social pressure or ranking

**Q: "What is the Online Disinhibition Effect?"**

> Suler (2004) identified that people behave differently online due to:
> - **Dissociative anonymity** — "They don't know who I am" (our full anonymity)
> - **Invisibility** — "They can't see me" (no webcam, no photos)
> - **Asynchronicity** — "I can take my time" (post whenever, no live chat pressure)
> - **Minimized authority** — "We're all equal" (no follower counts, no verification badges)
>
> This produces "benign disinhibition" — people share genuine emotions they'd suppress in face-to-face settings. AnonEmote is designed to maximize benign disinhibition while the moderation system prevents "toxic disinhibition" (abuse).

**Q: "How does SIDE Theory apply?"**

> SIDE (Social Identity model of Deindividuation Effects) theory states that when individual identity is removed, group identity is strengthened. In AnonEmote:
> - Individual cues removed: no names, no photos, no follower counts
> - Group identity strengthened: shared emotional spaces (planets), empathy-only reactions, collective experience
> - Users identify with the community of emotional support rather than competing for social status

**Q: "What is Affordance Theory and how does it apply?"**

> Affordance Theory (Gibson, 1979; Norman, 1988) says objects suggest their use through their design:
> - **Planets afford exploration** — 3D spatial interface invites navigation, not scrolling
> - **Emoji reactions afford empathy** — limited to supportive emoji, not arbitrary text
> - **Drawing canvas affords creative expression** — Doodle Drift lets users express non-verbally
> - **Abstract avatars afford anonymity** — non-human shapes prevent identity association
> - **Check-in affords emotional literacy** — guided naming of feelings builds vocabulary

---

### ISO/IEC 25010 & Evaluation

**Q: "How do you measure quality?"**

> We evaluate against ISO/IEC 25010 using a 5-point Likert-scale survey presented to users after they've used the platform for a meaningful period. The survey covers:
> - **Perceived anonymity safety** — "I felt safe expressing my true feelings"
> - **Moderation effectiveness** — "I felt protected from harmful content"
> - **Emotional expression ease** — "I found it easy to share my emotions"
> - **Overall satisfaction** — "I would recommend this platform to a friend"

**Q: "What ISO/IEC 25010 characteristics does your system address?"**

> See Section 4 below for the full mapping.

---

### Differentiation

**Q: "How is this different from Twitter/Reddit/anonymous apps?"**

| Feature | AnonEmote | Twitter/X | Reddit | Whisper/YikYak |
|---------|-----------|-----------|--------|----------------|
| Identity | Fully anonymous (UUID only) | Public profiles | Pseudonymous | Anonymous |
| Moderation | 3-layer AI (crisis + Filipino + ML) | Community + AI | Community + AI | Basic AI (English only) |
| Filipino support | Native (Tagalog + Bicolano) | None | None | None |
| Interface | 3D spatial (planets) | 2D feed | 2D feed + subreddits | 2D cards |
| Reactions | Empathy-only (5 emoji) | Like/repost/quote | Upvote/downvote | Like |
| Crisis support | Built-in detection + referral | Report-based | Report-based | None |
| Ranking | None (chronological only) | Algorithmic | Vote-based | Algorithmic |

**Q: "What's your contribution to knowledge?"**

> 1. A working three-layer hybrid AI moderation system with Filipino/Bicolano language support (not available in any commercial API)
> 2. A 3D spatial interface paradigm for emotional expression (novel interaction model)
> 3. Integration of crisis detection that preserves user agency (draft preservation, not deletion)
> 4. Empirical evaluation linking anonymous spatial design to reduced social performance pressure

---

## 4. ISO/IEC 25010 Mapping

### Functional Suitability

| Sub-characteristic | How AnonEmote addresses it |
|---|---|
| Functional completeness | All 7 emotion planets, text posts, doodle drawing, reactions, replies, reporting, admin console — all functional |
| Functional correctness | 500+ automated tests verify correct behavior of moderation, state management, persistence |
| Functional appropriateness | Features match user needs: anonymous expression, crisis support, peer empathy |

### Performance Efficiency

| Sub-characteristic | How AnonEmote addresses it |
|---|---|
| Time behavior | Aho-Corasick O(n) matching, 4s Perspective timeout, real-time updates in ~200ms |
| Resource utilization | Single Canvas architecture, quality tiers (low/medium/high GPU), lazy loading |
| Capacity | Supabase handles 50k MAU, rate limiting prevents overload |

### Usability

| Sub-characteristic | How AnonEmote addresses it |
|---|---|
| Appropriateness recognizability | Planet metaphor is intuitive — click a feeling to go there |
| Learnability | Two-phase check-in guides new users; onboarding overlay explains controls |
| Operability | Mobile responsive with bottom sheets, landscape mode, touch-optimized |
| User error protection | Dirty-close protection, character counter, confirmation dialogs |
| User interface aesthetics | Claymation art style, bloom effects, smooth animations, cosmic theme |
| Accessibility | Keyboard navigation, screen reader labels, high-contrast text on 3D overlays |

### Security

| Sub-characteristic | How AnonEmote addresses it |
|---|---|
| Confidentiality | RLS prevents unauthorized data access, no PII exposed in social layer |
| Integrity | JWT auth on all writes, server-derived author_id, DB constraints |
| Non-repudiation | Audit logging (verdict + timestamp, never content), author_id chain |
| Accountability | HMAC-SHA256 report deduplication, admin investigation via UUID |
| Authenticity | Supabase Auth JWT verification, timing-safe admin password comparison |

### Reliability

| Sub-characteristic | How AnonEmote addresses it |
|---|---|
| Maturity | 500+ automated tests, property-based testing for edge cases |
| Availability | Fallback moderation when Perspective API is down, offline detection |
| Fault tolerance | Crisis detection works without internet, graceful degradation |
| Recoverability | Session persistence in localStorage, state restoration on reload |

---

## 5. Theoretical Framework Quick Reference

Use these when explaining design decisions. Each theory justifies specific features.

### Self-Determination Theory (Deci & Ryan, 1985)

**Core idea:** Human motivation requires three psychological needs to be met.

| Need | How AnonEmote satisfies it |
|------|---------------------------|
| **Autonomy** | User chooses: which planet, when to post, text or drawing, whether to react |
| **Competence** | Emotion check-in teaches feeling vocabulary; guided prompts reduce blank-page anxiety |
| **Relatedness** | Empathy reactions create connection; shared planet spaces foster community |

**Citation:** Deci, E. L., & Ryan, R. M. (1985). *Intrinsic motivation and self-determination in human behavior.* Springer.

---

### Online Disinhibition Effect (Suler, 2004)

**Core idea:** People communicate differently online due to reduced social cues.

| Factor | AnonEmote implementation |
|--------|--------------------------|
| **Dissociative anonymity** | No accounts visible to peers, UUID-only identity |
| **Invisibility** | No photos, no webcams, abstract non-human avatars |
| **Asynchronicity** | Post anytime, no expectation of immediate response |
| **Minimized authority** | No follower counts, no verification, no ranking |
| **Solipsistic introjection** | Personal planet-space feels like private universe |
| **Dissociative imagination** | Star system metaphor separates from "real life" social media |

**Our design goal:** Maximize *benign disinhibition* (honest emotional sharing) while moderation prevents *toxic disinhibition* (abuse).

**Citation:** Suler, J. (2004). The online disinhibition effect. *CyberPsychology & Behavior, 7*(3), 321–326.

---

### SIDE Theory (Reicher, Spears & Postmes, 1995)

**Core idea:** When individual identity cues are removed, group identity becomes stronger.

| SIDE principle | AnonEmote implementation |
|---------------|--------------------------|
| Remove individual cues | No usernames, no photos, abstract avatars |
| Strengthen group identity | Shared emotional spaces (planets), collective reactions |
| Reduce social comparison | No follower counts, no like counts, no profiles |
| Enable genuine group belonging | Users are part of "people who feel anxious today" not "person with 500 followers" |

**Why this matters for us:** Users identify with others who share their emotions, not compete for social status.

**Citation:** Reicher, S. D., Spears, R., & Postmes, T. (1995). A social identity model of deindividuation phenomena. *European Review of Social Psychology, 6*(1), 161–198.

---

### Affordance Theory (Gibson, 1979; Norman, 1988)

**Core idea:** Objects communicate their use through their design properties.

| Affordance | Feature | What it communicates |
|-----------|---------|---------------------|
| Spatial navigation | 3D planet system | "Explore, don't scroll" |
| Emotional containers | Separate planets | "Each feeling has its own space" |
| Creative expression | Doodle canvas | "You can express without words" |
| Empathy signaling | Limited emoji set | "Support, don't judge" |
| Safety | Crisis referral modal | "Help is available" |
| Anonymity | Abstract shapes | "You are not your appearance" |
| Temporal detachment | Orbital motion | "Time flows differently here" |

**Citation:** Norman, D. A. (1988). *The design of everyday things.* Basic Books.

---

## 6. Potential Weaknesses (And How to Address Them)

> **Important:** Don't hide weaknesses — acknowledge them with context. Panelists respect honesty.

### "The backend sleeps after 15 minutes (Render free tier)"

**Acknowledge:** "Yes, the free tier has a cold-start limitation of ~30 seconds after inactivity."
**Counter:** "For a university deployment with regular usage during campus hours, the server stays warm. In production, the $7/month Render paid tier eliminates this entirely. For the capstone scope, the free tier demonstrates the full architecture."

### "Perspective API doesn't support Filipino"

**Acknowledge:** "That's exactly why we built Layer 2 — local keyword matching specifically for Tagalog and Bicolano."
**Counter:** "This is actually our contribution: a hybrid system that combines commercial ML (English) with custom local matching (Filipino). No existing platform does this for Filipino users."

### "Keyword matching can be bypassed with creative spelling"

**Acknowledge:** "Simple keyword matching is easily circumvented, which is why we have a 10-step normalization pipeline."
**Counter:** "Our normalizer handles leet speak (h3ll0 → hello), repeated characters (fuuuuck → fuck), diacritics, zero-width characters, and common evasion tactics. It's not just string matching — it's normalized pattern matching. And Layer 3 (Perspective ML) catches novel phrasing that keywords miss entirely."

### "No TypeScript — just JavaScript"

**Acknowledge:** "We used plain JavaScript with JSDoc documentation."
**Counter:** "TypeScript adds compilation complexity without changing runtime behavior. For a capstone project with a fixed team and deadline, JavaScript with JSDoc comments and 500+ tests provides sufficient correctness guarantees. The tests catch type-related bugs that TypeScript would normally prevent."

### "No native mobile app"

**Acknowledge:** "AnonEmote is a web application, not a native iOS/Android app."
**Counter:** "As a Progressive Web App with responsive design, it works on all devices through the browser. PWA technology lets users 'install' it on their home screen. For a university population that primarily uses smartphones, mobile web with PWA capabilities reaches 100% of devices without requiring App Store/Play Store distribution."

---

## 7. Statistics & Numbers to Mention

These make your defense sound confident and data-backed:

| Metric | Number | Context |
|--------|--------|---------|
| Automated tests | 500+ | 260 backend, 251 frontend |
| Test methodology | Property-based (fast-check) | Generates random inputs, tests invariants |
| Moderation layers | 3 | Crisis → Vernacular → ML |
| Supported languages | 3 | English, Tagalog, Bicolano |
| Crisis keywords | 100+ | Across all 3 languages |
| Toxicity keywords | 500+ | Filipino/Bicolano + English |
| Safe-context phrases | 50+ | False-positive reduction |
| Security headers | 11 | Via Helmet middleware |
| Emotion planets | 7 | Covering the emotional spectrum |
| Sub-emotions | 40+ | Fine-grained emotional literacy |
| Avatar combinations | 720 | 10 × 18 × 4 |
| Character limit | 280 | Concise expression |
| Rate limit | 20/min | Spam prevention |
| Perspective API timeout | 4 seconds | Then falls back to local |
| Real-time latency | ~200ms | Post appears for all users |
| Normalization steps | 10 | Evasion-resistant text cleaning |
| Database policies | 7+ RLS rules | Defense-in-depth security |
| ISO/IEC 25010 characteristics | 5 covered | Functionality, Usability, Performance, Security, Reliability |

---

## 8. Emergency Troubleshooting (If Things Go Wrong)

### Backend won't wake up
- Open https://anonemote.onrender.com directly — wait for "Cannot GET /" response
- If it says "Service unavailable", Render may be deploying. Wait 2 minutes.
- Fallback: "The backend is on a free tier that sleeps. In production, it runs on a paid tier without downtime. Let me show you the code instead."

### 3D scene won't load / black screen
- Check if browser extensions are blocking WebGL
- Try Chrome (most reliable for WebGL)
- If the device GPU is weak: "The system has quality tiers. Let me show the low-quality mode."
- Fallback: Show screenshots/video recording you prepared earlier

### "Cannot connect to Supabase"
- Check internet connection
- Supabase might be having an outage (rare)
- Fallback: "Our architecture has offline resilience for crisis detection. Let me show the backend moderation code directly."

### Post won't submit (401 error)
- User session may have expired. Sign out and sign in again.
- Check that the backend is awake (see above).

### Crisis/toxic word not being caught
- The test word might not be in the lexicon. Use known words:
  - Crisis (Filipino): "gusto ko nang mawala" or "papatayin ko sarili ko"
  - Toxic (Filipino): "bobo", "gago", "putangina"
  - Toxic (English): standard profanity

### Fallback: "Let me show you in the code"
If live demo fails, switch to showing code on GitHub. Key files to pull up:
1. `backend/src/moderation/engine.js` — the three layers
2. `frontend/src/store/useAppStore.js` — state management
3. `frontend/src/screens/SpaceScreen.jsx` — 3D scene
4. `supabase/schema.sql` — database design

> **Golden rule:** Never apologize excessively for technical issues. Say "Free tier cold start — takes 30 seconds" and move on confidently. The panel evaluates your knowledge, not your hosting budget.

---

## Role Distribution Suggestion

If the panel asks each member to explain their contribution:

### Kristel
- 3D environment design (planet aesthetics, animation, art direction)
- Landing page design and carousel
- Avatar customization system
- Emotion check-in flow design

### Jazpher
- Backend architecture (Express, middleware, routes)
- Moderation engine (three-layer pipeline, Aho-Corasick integration)
- Authentication system (JWT, requireAuth, session persistence)
- Testing infrastructure (Vitest + fast-check setup)
- Database schema and migrations
- Deployment configuration (Render, Vercel)

### Clifford
- Frontend React components and state management
- Admin console (monitor, reports, lexicon editor)
- Reporting system (HMAC deduplication)
- Real-time features (Supabase subscriptions, presence)
- Mobile responsiveness and PWA optimization

> **Note:** Adjust this based on actual contributions. All members should be able to explain the FULL system even if they didn't build every part.

---

*Good luck sa defense! Kaya niyo 'yan! The code is solid, the theory is grounded, and the system works. Go get that passing grade.*
