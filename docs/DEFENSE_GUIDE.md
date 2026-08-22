# AnonEmote — Complete System Guide & Defense Preparation

**Para sa grupo ni Kristel, Jazpher, at Clifford**
**Capstone Defense: August 2026**

---

## TABLE OF CONTENTS

1. [Ano ba ang AnonEmote?](#1-ano-ba-ang-anonemote)
2. [Paano gumagana ang buong sistema?](#2-paano-gumagana-ang-buong-sistema)
3. [User Flow (Paano ginagamit ng user)](#3-user-flow)
4. [Tech Stack (Mga tools na ginamit)](#4-tech-stack)
5. [3D Star System (Ang mga planeta)](#5-3d-star-system)
6. [AI Content Moderation (Paano nagfi-filter)](#6-ai-content-moderation)
7. [Account System & Security](#7-account-system--security)
8. [Database Design](#8-database-design)
9. [Admin Console](#9-admin-console)
10. [Deployment (Paano naka-live)](#10-deployment)
11. [Theoretical Framework (Para sa defense)](#11-theoretical-framework)
12. [ISO/IEC 25010 Quality Evaluation](#12-isoiec-25010-quality-evaluation)
13. [Mga Feature na Highlights para sa Defense](#13-mga-feature-na-highlights)
14. [Common Defense Questions & Answers](#14-common-defense-questions--answers)
15. [Mga Dapat I-prepare Bago ang Defense](#15-mga-dapat-i-prepare)
16. [Known Limitations (Honestly acknowledge)](#16-known-limitations)
17. [Future Recommendations (Chapter 5)](#17-future-recommendations)

---

## 1. Ano ba ang AnonEmote?

**AnonEmote** ay isang web-based anonymous emotional support platform para sa Filipino college students.

**Sa simpleng salita:** Isang website na parang social media pero:
- **Walang pangalan** — Hindi makikita ng iba kung sino ka
- **3D solar system ang interface** — Hindi boring na list ng posts
- **May AI filter** — Hindi pwede mag-post ng masama o hate speech
- **May crisis detection** — Kung mag-type ka ng suicidal thoughts, hindi ka bibigyan ng opportunity na i-post. Instead, ipapakita ang emergency hotlines

**Bakit namin ginawa ito?**
Maraming college students ang hindi nag-o-open up tungkol sa mental health dahil sa *social performance pressure* (takot sa judgment). Ang AnonEmote ang nagbibigay ng safe space na pwede silang mag-express ng emotions without fear.

---

## 2. Paano Gumagana ang Buong Sistema?

Imagine ang AnonEmote na may **3 major parts**:

`
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│   FRONTEND       │────▶│   BACKEND        │────▶│   DATABASE       │
│   (React + 3D)   │     │   (Express API)  │     │   (Supabase)     │
│                  │◀────│                  │◀────│                  │
│   Vercel         │     │   Render         │     │   PostgreSQL     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │                        │
         │                        ▼
         │               ┌──────────────────┐
         │               │ Google Perspective│
         │               │ API (AI filter)   │
         └──────────────▶└──────────────────┘
`

### Simple Explanation:

1. **Frontend** (ang nakikita ng user) — React website na may 3D graphics. Naka-deploy sa Vercel (free).
2. **Backend** (ang server) — Node.js na nag-check kung safe ba ang post bago i-save. Naka-deploy sa Render (free).
3. **Database** (storage) — Supabase (PostgreSQL). Dito naka-save ang lahat ng posts, reactions, reports.

### Paano nag-uusap ang 3 parts:

- **Pag nagbabasa ng posts:** Frontend → Supabase (direkta, walang backend)
- **Pag nag-popost:** Frontend → Backend (AI filter) → Supabase (kung safe)
- **Real-time updates:** Supabase → Frontend (automatic, walang refresh)

---

## 3. User Flow

Ito ang step-by-step na nararanasan ng user:

### Step 1: Landing Page
- Nakikita ang atmospheric landing page
- Scroll-driven planet carousel (pag nag-scroll ka pababa, gumagalaw ang planets)
- "Enter the Star System" button

### Step 2: Sign In / Register (o Guest Mode)
- **Register:** Email + password (email ay HINDI makikita ng iba — for login lang)
- **Guest:** Pwede mag-browse at mag-basa, pero HINDI pwede mag-post

### Step 3: Avatar Creator
- Pumili ng abstract shape (orb, prism, crystal, etc.) — HINDI tao
- Pumili ng aura color at particle effects
- Live 3D preview

### Step 4: Emotion Check-In
- "Ano ang nararamdaman mo?" — pumili ng broad feeling (happy, sad, anxious, etc.)
- Then pumili ng more specific nuance (e.g., "anxious" → "racing thoughts")
- Given ang tailored writing prompt

### Step 5: 3D Star System
- Nakikita mo ang 7 planets na umiikot sa central star
- Click sa planet → opens the post panel for that emotion
- Write your message (max 280 characters)
- Post is filtered by AI → appears in real-time kung safe

---

## 4. Tech Stack

### Frontend (Ang website na nakikita ng user)

| Technology | Bakit namin ginamit |
|---|---|
| **React 18** | Modern web framework; component-based para organized ang code |
| **Vite** | Super fast development server at build tool |
| **React Three Fiber** | Para ma-render ang 3D scene (planets, stars) sa browser |
| **@react-three/drei** | Ready-made 3D helpers (orbit controls, shaders, text) |
| **@react-three/postprocessing** | Visual effects (bloom glow, vignette) |
| **Zustand** | Global state management (simpler than Redux) |
| **Tailwind CSS** | Utility-first CSS framework para mabilis ang styling |
| **Supabase JS Client** | Para mag-read ng data at ma-receive ang real-time updates |

### Backend (Ang server na nag-fi-filter)

| Technology | Bakit namin ginamit |
|---|---|
| **Node.js** | JavaScript runtime para sa server |
| **Express** | Web framework para sa API routes |
| **Google Perspective API** | AI na nag-detect ng toxicity sa English text |
| **Aho-Corasick algorithm** | Fast multi-pattern matching para sa Filipino/Bisaya words |
| **Helmet** | Security headers protection |
| **CORS** | Prevents unauthorized websites from calling our API |
| **express-rate-limit** | Prevents spam (max 20 posts per minute) |
| **Supabase (service role)** | Server-side database access with full privileges |

### Database (Ang storage)

| Technology | Bakit namin ginamit |
|---|---|
| **Supabase** | Free PostgreSQL + built-in Auth + Realtime + Row Level Security |
| **PostgreSQL** | Reliable, industry-standard database |
| **Row Level Security (RLS)** | Database-level protection — even if hacked, data is restricted |
| **Realtime** | Automatic live updates without refreshing the page |
| **Presence** | Shows other users' avatars in the 3D scene |

---

## 5. 3D Star System

Ang core visual feature ng AnonEmote. 7 emotion planets ang umiikot sa isang central star.

### The 7 Planets:

| # | Planet | Emoji | Para saan | Orbit Radius | Period |
|---|---|---|---|---|---|
| 1 | Joy | ✨ | Wins, gratitude, happy moments | 12 | ~35 sec |
| 2 | Venting | 🌧️ | Frustrations, stress, burnout | 20 | ~75 sec |
| 3 | Seek Advice | 🌿 | Ask for guidance (has replies) | 28 | ~125 sec |
| 4 | Grief & Loss | 🌑 | Process sadness and loss | 36 | ~182 sec |
| 5 | Anxiety | 🌀 | Racing thoughts, worries | 44 | ~246 sec |
| 6 | Reflections | 🪐 | Random thoughts, musings | 52 | ~317 sec |
| 7 | Doodle Drift | 🎨 | Draw what you feel (no text) | 62 | ~410 sec |

### Orbital Mechanics (Pang-impress sa panel):
Ginamit namin ang **Kepler's Third Law** para sa planet speeds:

`
Angular velocity = K / r^1.5
`

Meaning: planets closer to the star move faster, planets far away move slower — **exactly like a real solar system**. Hindi random ang speeds.

### Technical Details:
- **React Three Fiber** renders the scene using WebGL
- **Procedural clay geometry** (custom shapes generated by code, not pre-made models)
- **Adaptive quality tiers** — mobile gets simpler graphics (no shadows, no bloom) para hindi mag-lag
- **Bloom post-processing** — ang glow effect sa star at planets

---

## 6. AI Content Moderation

**Ito ang pinaka-technical feature na itatanong sa defense.**

### Three-Layer Hybrid Architecture:

`
User types message
        │
        ▼
┌─────────────────────────────────┐
│ LAYER 1: Crisis Detection       │  ◀─── LOCAL (instant)
│ Languages: EN, TL, BCL          │
│ Result: CRISIS → Show hotlines  │
│ (Draft is PRESERVED, not lost)  │
└────────────────┬────────────────┘
                 │ (hindi crisis)
                 ▼
┌─────────────────────────────────┐
│ LAYER 2: Vernacular Toxicity    │  ◀─── LOCAL (instant)
│ Languages: TL, BCL              │
│ Algorithm: Aho-Corasick         │
│ Result: TOXIC → Block post      │
└────────────────┬────────────────┘
                 │ (hindi toxic locally)
                 ▼
┌─────────────────────────────────┐
│ LAYER 3: ML Toxicity Scoring    │  ◀─── CLOUD (Google API)
│ Language: English                │
│ Model: Perspective API           │
│ Result: TOXIC → Block post      │
└────────────────┬────────────────┘
                 │ (safe)
                 ▼
         POST IS SAVED ✓
`

### Bakit 3 layers?

1. **Layer 1 (Crisis)** — Para sa suicidal/self-harm keywords. Ito ang pinaka-priority. Kung na-detect, ang message ay HINDI tinatanggal — preserved ang draft, at ipapakita ang crisis hotlines (NMHC, Hopeline PH). **Bakit?** Dahil kung tinanggal mo ang sinulat ng tao na in-crisis, baka mas ma-distress sila.

2. **Layer 2 (Filipino/Bisaya)** — Google Perspective API does NOT support Filipino languages. Kaya gumawa kami ng sariling word filter gamit ang **Aho-Corasick algorithm** (fast multi-pattern string matching) para i-detect ang Filipino/Bisaya profanity at hate speech.

3. **Layer 3 (English AI)** — Para sa English text, ginagamit ang Google Perspective API na nag-a-assign ng toxicity scores (0 to 1). Kung above threshold (0.60-0.75 depending on category), blocked.

### Fallback:
Kung down ang Google API, ang system ay hindi nag-fail-open (hindi pinapapasok lahat). Instead, gumagamit ng **local English keyword list** para may protection pa rin.

### Anti-Evasion:
May **10-step text normalization** na nag-ha-handle ng:
- Leet speak (e.g., "f*ck" → detected)
- Extra spaces (e.g., "p u t a" → detected)
- Zero-width characters
- Repeated characters

### Safe-Context Phrases:
Kung ang "toxic" word ay part ng emotional expression (e.g., "I feel like sh*t today"), ang system ay nag-a-assess ng safe-context phrases around it. Kung ≥3 distinct safe-context phrases ang nakapaligid, held for review instead of outright blocked.

---

## 7. Account System & Security

### Hybrid Authentication Model:

`
┌─────────────────────────────────────────────────┐
│           SOCIAL LAYER (what users see)          │
│                                                 │
│   Posts appear with NO name, NO photo, NO ID    │
│   "Anonymous shape posted to Joy"               │
│                                                 │
├─────────────────────────────────────────────────┤
│        BEHIND THE SCENES (admin only)           │
│                                                 │
│   Every post has author_id in the database      │
│   Admin can investigate if content is reported  │
│                                                 │
└─────────────────────────────────────────────────┘
`

### Bakit may account system kung anonymous?
- **Accountability** — kung may nag-a-abuse, pwede ma-trace at ma-suspend
- **Rate limiting per user** — hindi pwede mag-spam
- **Session persistence** — hindi mawawala ang avatar/progress mo pag nag-refresh

### Security Features:

| Feature | Explanation |
|---|---|
| **JWT Verification** | Every write request verifies the user's token with Supabase |
| **Row Level Security** | Database restricts what anon key can read/write |
| **Rate Limiting** | 20 posts/min, 10 reports/10min, 60 reactions/min |
| **Helmet Headers** | Prevents XSS, clickjacking, MIME sniffing |
| **CORS Restriction** | Only our Vercel domain can call the API |
| **HMAC Report Dedupe** | Prevents one person from mass-reporting using IP + postId hash |
| **Admin Auth** | Timing-safe password comparison, 8-hour token expiry |
| **Account Suspension** | Admins can suspend repeat offenders |

### Guest Mode:
- Can browse the 3D scene and read all posts
- CANNOT post, reply, or react
- When they try, a modal says "Sign in to participate"
- Uses temporary sessionStorage UUID (cleared when tab closes)

---

## 8. Database Design

### Tables:

#### posts — Ang mga anonymous messages
| Column | Type | Description |
|---|---|---|
| id | UUID | Unique post ID |
| content | TEXT (1-280 chars) | The message |
| planet_id | TEXT | Which planet (joy, vent, advice, etc.) |
| session_id | TEXT | Anonymous session UUID |
| author_id | UUID | Links to Supabase Auth user (for admin) |
| drawing | TEXT | Base64 image (for Doodle planet) |
| is_hidden | BOOLEAN | Hidden by reports or admin |
| created_at | TIMESTAMPTZ | When posted |

#### eactions — Empathy-only emoji reactions
| Column | Type | Description |
|---|---|---|
| post_id | UUID | Which post |
| session_id | TEXT | Who reacted |
| emoji | TEXT | Only 🫂💙😢🌱✨ allowed (DB enforced) |

**Constraint:** One reaction per user per post (prevents spam)

#### eports — Content reports
| Column | Type | Description |
|---|---|---|
| post_id | UUID | Which post |
| reason | TEXT | harassment, hate_speech, self_harm, spam, other |
| reporter_hash | TEXT | HMAC(secret, IP + postId) for dedupe |
| reviewed | BOOLEAN | Has admin looked at it |

#### profiles — User accounts (linked to Supabase Auth)
| Column | Type | Description |
|---|---|---|
| id | UUID | Same as Supabase Auth user.id |
| avatar_config | JSONB | Shape, color, particles |
| is_suspended | BOOLEAN | Account suspended by admin |

### Row Level Security (RLS):
- Posts: Everyone can READ non-hidden posts. Only backend (service role) can INSERT.
- Reactions: Everyone can read. One per session per post.
- Reports: Write-only from client. Only backend can read (privacy).

### Realtime:
Posts and reactions are subscribed to Supabase Realtime — when someone posts, everyone sees it instantly without refreshing.

---

## 9. Admin Console

Accessible at /#admin (hash route, separate from the main app).

### Features:
1. **Monitor Tab** — Real-time activity feed (posts, reactions, reports as they happen)
2. **Reports Tab** — Queue ng reported posts. Admin can: Flag & Hide, Restore, Approve & Protect, Delete
3. **Rules Tab** — Edit the moderation lexicon (add/remove crisis/toxic/allow words). Has a "dry-run tester" para ma-test kung ma-detect ba ang word before saving.
4. **Users Tab** (if implemented) — View accounts, post history, suspend users

### Admin Auth:
- Single shared password (environment variable)
- Timing-safe comparison (prevents timing attacks)
- 8-hour session token
- Kill switch (ADMIN_ENABLED=false disables the entire console)

---

## 10. Deployment

### Where is everything hosted?

| Component | Host | URL | Cost |
|---|---|---|---|
| Frontend | Vercel | anonemoteproject.vercel.app | Free |
| Backend | Render | anonemote.onrender.com | Free tier |
| Database | Supabase | ubwprujmypuskbwajcyu.supabase.co | Free tier |
| AI API | Google Cloud | perspectiveapi.com | Free tier (1 QPS) |

### How deployment works:
1. Push code to GitHub
2. Backend auto-deploys on Render (connected to GitHub)
3. Frontend deploys via ercel --prod --yes CLI command

### Region: Singapore (closest to Philippines)

### Known limitation: Render free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds to wake up.

---

## 11. Theoretical Framework

**Ito ang tatanungin sa inyo: "Bakit ganyan ang design niyo?"**

### 4 Theories na ginamit:

#### 1. Self-Determination Theory (SDT) — Deci & Ryan
- **Autonomy:** User chooses which planet, what to write, whether to stay anonymous
- **Competence:** Check-in flow helps users identify and name their emotions (emotional literacy)
- **Relatedness:** Seeing other users' avatars in the 3D space + empathy reactions creates connection without revealing identity

#### 2. Online Disinhibition Effect — Suler (2004)
- **Benign disinhibition:** Anonymity removes social barriers → people open up more honestly
- **Design choice:** No usernames, no profile photos, abstract non-human avatars
- **Why it matters:** Filipino students face *hiya* (shame) culture — anonymity removes that barrier

#### 3. SIDE Theory (Social Identity model of Deindividuation Effects) — Reicher et al.
- **Key idea:** When personal identity is hidden, group identity strengthens
- **In AnonEmote:** Users identify as "someone going through the same feeling" rather than "Juan dela Cruz na classmate ko"
- **Planet grouping:** Organizing by emotion creates natural in-groups of people with shared feelings

#### 4. Affordance Theory — Gibson / Norman
- **What it means:** The design of a tool suggests how to use it
- **In AnonEmote:**
  - Planets "afford" emotional categorization (obvious where to post)
  - 280-char limit "affords" short, focused expression (not essays)
  - Empathy-only reactions "afford" support (impossible to bully via reactions)
  - Drawing canvas "affords" non-verbal expression

---

## 12. ISO/IEC 25010 Quality Evaluation

**Your capstone evaluates against 3 quality characteristics:**

### Security
| What we implemented | Evidence |
|---|---|
| Supabase Auth (email/password) | JWT verification on every write |
| Row Level Security | Database-level access control |
| Rate limiting | Prevents spam (20/min) |
| HMAC report dedup | Prevents abuse of reporting system |
| Helmet headers | XSS, clickjacking prevention |
| CORS restriction | Only our domain can call API |
| Admin kill switch | Can disable admin access instantly |
| Account suspension | Repeat offenders can be blocked |
| Three-layer moderation | AI + local filters for content safety |

### Usability
| What we implemented | Evidence |
|---|---|
| 3D interactive navigation | Click planets to explore feelings |
| Emotion check-in flow | Guided experience to name feelings |
| Abstract avatar creator | Creative self-expression |
| Mobile responsive | Touch-friendly, adaptive quality |
| Real-time updates | No manual refresh needed |
| Guest mode | Low barrier to entry (browse first) |
| Crisis preservation | User's writing is never lost |
| Empathy-only reactions | Safe interaction model |

### Reliability
| What we implemented | Evidence |
|---|---|
| Error boundaries | App doesn't crash entirely on error |
| Fallback moderation | Works even if Google API is down |
| Realtime reconnection | Auto-reconnects if connection drops |
| Session persistence | Progress saved across page reloads |
| Adaptive quality | Downgrades graphics instead of crashing |
| Auto-hide trigger | 3+ reports auto-hides post (failsafe) |

---

## 13. Mga Feature na Highlights para sa Defense

**Ito ang mga "wow factor" na pwede niyo i-demo:**

### 1. Live AI Moderation Demo
- Type a bad word → show it getting blocked
- Type a crisis phrase → show the emergency referral modal
- Type in Filipino/Bisaya → show it getting caught locally
- Show the admin "dry-run tester" testing words in real-time

### 2. Real-time Multiplayer
- Open 2 browser tabs → post sa isa → appears sa isa instantly
- Show other user's avatar appearing in the 3D scene

### 3. Drawing on Doodle Drift
- Draw something → appears as a post on the planet
- Show that drawings are base64-encoded and stored in the DB

### 4. Kepler Orbital Mechanics
- Point out that inner planets move faster than outer planets
- "We used actual physics formulas for realism"

### 5. Guest vs Authenticated Flow
- Show how guest can browse everything
- Show the auth prompt modal when guest tries to post
- Show that after login, their avatar and progress is restored

### 6. Admin Console
- Show the live activity monitor
- Show the report review queue
- Demo adding a word to the lexicon and testing it

---

## 14. Common Defense Questions & Answers

### Q: "Bakit anonymous kung may account system?"
**A:** "Ang account system ay para sa backend accountability lang. Sa social layer, fully anonymous pa rin. Hindi makikita ng ibang users kung sino ka. Ang admin lang ang may access sa author_id, at only when may valid report. Ito ang tinatawag naming 'hybrid anonymity model' — anonymous sa ibang tao, accountable sa system."

### Q: "Paano kung may nag-abuse ng anonymity?"
**A:** "Three-layer approach: (1) AI moderation prevents harmful content from being published, (2) community reporting flags content for admin review, (3) admin can trace author_id at mag-suspend ng account. Hindi instant hide ang reports — kailangan ng 2+ independent reporters for auto-quarantine, para hindi ma-abuse ang reporting system."

### Q: "Bakit hindi niyo ginamit ang existing platforms like Whisper o Secret?"
**A:** "Existing anonymous platforms have high rates of cyberbullying because they lack proper moderation. AnonEmote's innovation is the three-layer hybrid AI moderation system specifically designed for Filipino languages (which major platforms don't support), combined with a therapeutic UX design (emotion check-in, crisis preservation, empathy-only reactions)."

### Q: "Paano niyo na-handle ang Filipino/Bisaya moderation kung walang AI para dun?"
**A:** "Since the Google Perspective API only supports English, we built a local moderation layer using the Aho-Corasick algorithm — a fast multi-pattern string matching algorithm na O(n) ang time complexity. We compiled lexicons ng Filipino at Bicolano toxic terms, with safe-context phrases to reduce false positives. Plus may 10-step normalization pipeline para i-handle ang evasion attempts like leet speak."

### Q: "Ano ang Aho-Corasick algorithm?"
**A:** "Ito ay isang efficient string-matching algorithm na nag-bu-build ng finite automaton (like a special dictionary) para ma-search lahat ng keywords in ONE pass through the text. Instead na isa-isahin ang bawat word (O(n×m)), ang Aho-Corasick ay O(n + total matches) — super fast."

### Q: "Bakit Three.js/React Three Fiber at hindi simpleng 2D interface?"
**A:** "The 3D solar system serves as a psychological metaphor — each planet represents an emotional state, and orbiting them creates a sense of 'traveling to' that emotional space. Research shows that spatial navigation increases engagement and emotional resonance. It also showcases our multimedia technology specialization."

### Q: "Paano niyo na-test ang system?"
**A:** "We have 511 automated tests (260 backend, 251 frontend) including property-based tests using fast-check. We also did manual UAT testing with target users, and the admin console has a dry-run tester for the moderation engine."

### Q: "Paano kung walang internet o na-down ang server?"
**A:** "(1) If Google Perspective API is down, the fallback local keyword list takes over — moderation never fails open. (2) If Supabase realtime disconnects, posts are still readable from cache. (3) Crisis drafts are saved in sessionStorage — never lost even if connection drops."

### Q: "Secure ba talaga ito? Paano kung na-hack?"
**A:** "Multiple layers: (1) JWT token verification on every write request, (2) Row Level Security at the database level — even if the API is bypassed, the DB blocks unauthorized access, (3) rate limiting prevents spam, (4) CORS blocks unauthorized origins, (5) Helmet headers prevent common web attacks, (6) HMAC hashing protects reporter privacy."

### Q: "Bakit 280 characters lang?"
**A:** "Research-based: short messages reduce overthinking and encourage raw emotional expression. Mas focused ang output. Inspired by Twitter/X's character limit but designed for emotional brevity. For longer expression, we have the Doodle Drift planet (drawing)."

### Q: "Paano niyo na-address ang false positives sa moderation?"
**A:** "(1) Safe-context phrases — kung ang flagged word ay within emotional expression, the system recognizes that. (2) Admin allow-list — pwedeng i-whitelist ang words na madalas na-false-positive. (3) Admin review queue — hindi outright deleted ang flagged posts, held for human review."

### Q: "Ano ang difference ng system niyo vs standard chat apps?"
**A:** "(1) Emotion-first design — you choose your feeling before you write. (2) No identity at all in the social layer. (3) AI moderation in Filipino. (4) Crisis preservation — we never delete someone's cry for help. (5) Empathy-only reactions — impossible to bully through the reaction system."

### Q: "Paano ang scalability?"
**A:** "Supabase scales automatically. The frontend is static (Vercel CDN). The backend is stateless (can be horizontally scaled). The Aho-Corasick automaton is built once at startup and handles thousands of messages per second. Current free tier limits: ~1000 daily active users comfortably."

### Q: "Accessible ba ito sa persons with disability?"
**A:** "We support prefers-reduced-motion for animation-sensitive users, and the UI is keyboard-navigable for non-3D sections. The 3D scene is a known limitation — we recommend adding ARIA live regions and screen reader descriptions in future work."

### Q: "Paano niyo na-validate na effective ang system?"
**A:** "Through ISO/IEC 25010 evaluation: Security (penetration testing, auth verification), Usability (SUS questionnaire with target users), and Reliability (load testing, error recovery scenarios). Results are in Chapter 4."

---

## 15. Mga Dapat I-prepare Bago ang Defense

### Documents to bring:
- [ ] Updated manuscript (Chapters 1-5) — printed + digital
- [ ] System demo ready (laptop with both frontend and backend running)
- [ ] Presentation slides (10-15 slides max)
- [ ] Source code accessible (GitHub or local)
- [ ] This guide (printed for quick reference)

### Demo checklist:
- [ ] Backend is running (either locally or wake up Render 5 minutes before)
- [ ] Frontend is accessible (Vercel is always-on)
- [ ] At least 5 sample posts already in the database
- [ ] Admin console accessible (/#admin)
- [ ] Test account ready for demo
- [ ] Guest mode ready to show
- [ ] A "bad word" prepared for live moderation demo
- [ ] A crisis keyword prepared to show the referral flow
- [ ] 2 browser windows open for real-time demo
- [ ] Phone ready for mobile responsive demo

### Presentation structure (suggestion):
1. **Problem statement** (2 min) — Mental health stigma in Filipino college students
2. **Solution overview** (2 min) — AnonEmote concept and goals
3. **Live demo** (8-10 min) — Walk through the user flow + show key features
4. **Technical architecture** (3 min) — Explain the 3-layer moderation + tech stack
5. **Results** (2 min) — ISO 25010 evaluation results
6. **Conclusion** (1 min) — Summary + future work

### Tip para sa panel:
- **Be honest about limitations** — better to say "that's a known limitation and we documented it in future recommendations" than to pretend it doesn't exist
- **Use technical terms confidently** — "Aho-Corasick algorithm", "JWT verification", "Row Level Security", "WebGL context"
- **Connect features to theory** — every time you explain a feature, tie it back to one of the 4 theories
- **Demo > Slides** — live demo is more impressive than static screenshots

---

## 16. Known Limitations

**Be prepared to acknowledge these honestly if asked:**

| Limitation | Our response |
|---|---|
| Doodle drawings skip AI moderation | Community reports are the backstop; image AI moderation is in future recommendations |
| Backend sleeps on Render free tier | Known limitation of free hosting; production would use paid tier |
| No screen reader support for 3D scene | WebGL/3D is inherently inaccessible; non-3D portions are keyboard-navigable |
| Admin is a single shared password | Suitable for a 3-person team; production would use role-based access |
| Character limit (280) | By design for emotional brevity; drawing planet offers alternative |
| Only supports EN, TL, BCL | These are the dominant languages of our target users; extensible architecture supports adding more |

---

## 17. Future Recommendations (Chapter 5)

Ito ang mga suggestions para sa "future work" section:

1. **Image moderation** — Add NSFW detection API for Doodle Drift drawings
2. **Mobile native app** — Convert to PWA or React Native for better mobile experience
3. **More languages** — Add Cebuano, Hiligaynon, Waray moderation lexicons
4. **Custom 3D models** — Replace procedural geometry with hand-crafted Maya/Blender models
5. **Sentiment analysis** — Track emotional trends over time (anonymized)
6. **Group sessions** — Moderated group spaces for guided emotional expression
7. **Professional counselor integration** — Optional referral to actual counselors
8. **Accessibility improvements** — Screen reader support, keyboard-only navigation for 3D
9. **Role-based admin access** — Multiple admin roles with different permissions
10. **Offline support** — Service worker for reading posts without internet

---

## Quick Reference: Key URLs

| What | URL |
|---|---|
| Live site | https://anonemoteproject.vercel.app |
| Admin console | https://anonemoteproject.vercel.app/#admin |
| Backend API | https://anonemote.onrender.com |
| Health check | https://anonemote.onrender.com/api/health |
| GitHub repo | https://github.com/jazjoz14-sys/AnonEmote |

---

## Glossary (Technical Terms Explained)

| Term | Simple explanation |
|---|---|
| **JWT** | JSON Web Token — a secure "pass" that proves you're logged in |
| **API** | Application Programming Interface — how the frontend talks to the backend |
| **WebGL** | Technology that renders 3D graphics in the browser |
| **REST** | A standard way to design web APIs (GET, POST, PUT, DELETE) |
| **UUID** | Universally Unique Identifier — a random ID like 1b2c3d4-e5f6-... |
| **RLS** | Row Level Security — database rules that control who can see what |
| **HMAC** | Hash-based Message Authentication Code — a way to verify data integrity |
| **Aho-Corasick** | An algorithm that finds multiple keywords in text in one fast pass |
| **Supabase** | An open-source Firebase alternative (database + auth + realtime) |
| **Vercel** | Cloud platform for hosting frontend websites |
| **Render** | Cloud platform for hosting backend servers |
| **Zustand** | A lightweight state management library for React |
| **React Three Fiber** | React wrapper for Three.js (3D graphics library) |
| **Bloom** | A glow effect in 3D graphics (makes things look luminous) |
| **Vignette** | Darkening around the edges of the screen (cinematic effect) |
| **CORS** | Cross-Origin Resource Sharing — browser security that controls which websites can call your API |
| **Rate Limiting** | Restricting how many requests a user can make per time period |

---

**Good luck sa defense! Kaya niyo 'yan! 🚀**

*Last updated: August 21, 2026*
