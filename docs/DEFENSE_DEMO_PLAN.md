# AnonEmote — Defense Demo Plan

A step-by-step guide for preparing, testing, and showcasing AnonEmote during the capstone defense presentation.

---

## Pre-Demo Preparation (Day Before)

### Wake Up the Backend
Render's free tier sleeps after 15 minutes. The backend takes 30-50 seconds to cold start.

- [ ] Visit https://anonemote.onrender.com/api/posts at least **10 minutes before** the demo
- [ ] Keep a browser tab open hitting the backend every 5 minutes (or use a free cron pinger like UptimeRobot temporarily)
- [ ] Verify the response returns JSON, not a timeout error

### Verify Live Deployment
- [ ] Open https://anonemoteproject.vercel.app — confirm landing page loads with 3D planets
- [ ] Register a fresh test account (use a throwaway email)
- [ ] Go through the full flow: avatar → check-in → space → post
- [ ] Confirm the post appears in realtime

### Seed Demo Content
You want the star system to look alive during the demo, not empty.

- [ ] Create 2-3 posts on each planet using different accounts/sessions
- [ ] Add some reactions (empathy emoji) to existing posts
- [ ] Post one reply on the Seek Advice planet
- [ ] Create one doodle on Doodle Drift

### Prepare Browser Tabs (Have These Ready)
1. **Main demo** — https://anonemoteproject.vercel.app (logged out, fresh start)
2. **Second user** — same URL in Incognito/different browser (to show realtime)
3. **Admin console** — https://anonemoteproject.vercel.app/#admin
4. **Backend health** — https://anonemote.onrender.com/api/posts (proof it's running)

### Hardware & Network
- [ ] Bring a backup laptop in case of GPU/WebGL issues
- [ ] Test on the venue's Wi-Fi beforehand if possible (some school networks block WebSocket connections)
- [ ] Have mobile hotspot ready as fallback
- [ ] If projecting, test the 3D rendering on the projector resolution — some projectors run at low res which affects the canvas

---

## Demo Script (What to Show, In Order)

### 1. Landing Page (1-2 min)
**What to show:** The 3D planet carousel, scroll interactions, responsive design.

- Scroll through the landing page slowly
- Point out the animated planets, the feature sections
- Mention: "This runs on Vercel's CDN — globally distributed, instant load"

### 2. Account Creation (1 min)
**What to show:** The auth system exists but preserves anonymity.

- Click "Get Started" → show the sign-up form
- Explain: "Accounts exist for accountability, but no identity is ever shown to other users"
- Register with a fresh email OR log in with a pre-made account

### 3. Avatar Creator (1-2 min)
**What to show:** Non-human abstract avatars reinforce anonymity.

- Pick a shape, change the color, add a particle effect
- Explain: "Deliberately non-human — no selfies, no profile pics, nothing identifiable"

### 4. Emotion Check-In (1 min)
**What to show:** The guided emotional flow.

- Select a broad emotion → select a nuance
- Explain: "This primes the user emotionally before they enter the space — based on Self-Determination Theory's need for emotional awareness"

### 5. 3D Star System (2-3 min)
**What to show:** The core experience — orbiting planets, camera controls, multiplayer presence.

- Let the planets orbit for a moment
- Rotate the camera (drag/scroll) to show it's a real 3D environment
- Point out planet names: Joy, Venting, Seek Advice, Grief & Loss, Anxiety, Reflections, Doodle Drift
- If second user is connected, show their avatar appearing in realtime

### 6. Posting (2-3 min)
**What to show:** The write flow + moderation.

- Click a planet (e.g., Venting) → open the composer
- Write a safe post: "Ang hirap ng finals week talaga" → submit
- Show the rocket launch animation
- Show the post appearing in the planet's feed

### 7. Content Moderation — The Money Shot (3-4 min)
**This is your system's key differentiator. Spend time here.**

#### 7a. Toxic content (Filipino vernacular)
- Try posting: "bobo mo naman" or "gago ka"
- Show the rejection message — content blocked before it reaches the database
- Explain: "Three-layer moderation: local Filipino/Bicolano lexicon first, then Google Perspective API"

#### 7b. Crisis detection
- Try posting: "gusto ko na sumuko sa lahat" or a known crisis keyword
- Show that the draft is PRESERVED (not deleted) and the crisis referral modal appears
- Explain: "We never discard a user's words — the draft is saved. We show emergency hotlines instead."
- Show the crisis modal with NMHC hotline numbers

#### 7c. English moderation via Perspective API
- Try: "I want to hurt someone" or "you're all worthless"
- Show it gets caught by the Perspective API layer

#### 7d. Safe context (false positive prevention)
- Try: "I'm studying about suicide prevention for my thesis"
- Show that safe context keywords prevent false positives
- Explain: "Academic and help-seeking language is whitelisted to avoid over-blocking"

### 8. Reactions (30 sec)
**What to show:** Empathy-only interaction model.

- React to a post with one of the emoji (🫂💙😢🌱✨)
- Explain: "No likes, no downvotes, no ranking. Only empathic responses. This prevents social comparison."

### 9. Replies on Seek Advice (1 min)
- Navigate to Seek Advice planet
- Reply to an existing post
- Explain: "Only this planet supports replies — other planets are for expression, not discussion"

### 10. Doodle Drift (1 min)
- Navigate to Doodle Drift
- Draw something on the canvas
- Submit the doodle
- Explain: "Alternative expression for users who can't put feelings into words"

### 11. Realtime / Multiplayer (1-2 min)
**What to show:** Live updates between users.

- Have your teammate post from the second browser/incognito
- Show the post appearing instantly on your screen without refresh
- Show their avatar appearing in the 3D scene (PeerAvatars)
- Explain: "Supabase Realtime channels — posts and presence update live via WebSocket"

### 12. Admin Console (2-3 min)
- Navigate to /#admin, log in
- **Monitor tab:** Show the realtime event stream (posts being created, moderation events)
- **Reports tab:** Show reported posts queue, investigation view with author_id
- **Rules tab:** Show the lexicon editor — add a new banned word, run the dry-run tester
- Explain: "Admin can update moderation rules without redeploying. Changes take effect immediately."

### 13. Mobile Responsiveness (1 min)
- Open the site on a phone (or use browser DevTools responsive mode)
- Show the bottom sheet modals, touch-friendly targets, landscape mode
- Explain: "PWA-optimized with quality tiers — automatically reduces 3D complexity on low-end devices"

---

## Common Panel Questions & How to Answer

| Likely Question | Key Points |
|---|---|
| "How do you ensure anonymity?" | No PII stored. Session UUID only. author_id is internal — never exposed to other users. No IP logging. |
| "What if someone posts something dangerous?" | Three-layer moderation catches it before DB. Crisis posts preserve the draft + show emergency contacts. Admin can review flagged content. |
| "How does it handle Filipino/Bicolano?" | Local lexicons with Aho-Corasick pattern matching. Handles text normalization (leet speak, repeated chars). Perspective API as fallback for English. |
| "Why not just use a database filter?" | Moderation must happen BEFORE storage. We never want harmful content to exist in the DB even momentarily. The backend is the gatekeeper. |
| "What about scalability?" | Frontend is already on CDN (scales infinitely). Backend can upgrade Render tier or move to Railway/Fly with zero code changes. Supabase handles DB scaling. |
| "What's the theoretical framework?" | SDT (autonomy, competence, relatedness in anonymous expression), Online Disinhibition Effect (benign disinhibition via anonymity), SIDE Theory (group identity without personal identity), Affordance Theory (system design shapes behavior). |
| "How did you evaluate it?" | ISO/IEC 25010 criteria — Security (moderation, auth, RLS), Usability (SUS questionnaire), Reliability (error handling, offline fallback). |

---

## Failure Recovery (If Things Go Wrong)

| Problem | Fix |
|---|---|
| Backend is asleep / returns 503 | Wait 30-50 sec. Hit the /api/posts endpoint to wake it. Have a "let me show you the architecture while that loads" transition. |
| WebGL context lost (black screen) | Refresh the page. If persistent, reduce quality tier in settings or switch to a different laptop. |
| Wi-Fi drops during demo | Switch to mobile hotspot. The PWA service worker will serve cached UI — only API calls will fail. |
| Post doesn't appear in realtime | Check browser console for WebSocket errors. Refresh the other tab. Worst case: show the post by refreshing the feed manually. |
| Admin login fails | Password is in backend .env (`ADMIN_PASSWORD`). Use the local one you know. |
| Moderation doesn't catch a word | Explain that the lexicon is editable — show admin adding the word in real-time via the Rules tab. |

---

## Checklist Summary

### 1 Day Before
- [ ] Wake backend, verify it responds
- [ ] Seed 10-15 demo posts across planets
- [ ] Test full flow end-to-end on deployment
- [ ] Charge all devices, prepare hotspot

### 30 Minutes Before
- [ ] Hit backend again to keep it awake
- [ ] Open all 4 browser tabs
- [ ] Log into admin console
- [ ] Have teammate ready on second device for realtime demo
- [ ] Test projector/display output

### During Demo
- [ ] Follow the script above (adjust time based on panel cues)
- [ ] Lead with the 3D visuals (impressive first impression)
- [ ] Spend the most time on moderation (your differentiator)
- [ ] Keep admin console as the "behind the scenes" reveal at the end

---

## Key Metrics to Mention

- 511 automated tests passing (260 backend, 251 frontend)
- Three-layer moderation: crisis keywords (EN/TL/BCL) → vernacular toxicity → Perspective API
- Sub-100ms moderation latency on local lexicon hits
- 7 emotion planets with unique interaction models
- Realtime multiplayer via WebSocket (presence + post updates)
- Zero PII stored — full HMAC-based reporting deduplication
- PWA offline support with service worker caching
