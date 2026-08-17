# AnonEmote — All Changes Explained

This document explains every technical change made during the audit fix session so you (Jazpher, Kristel, Clifford) can understand what was done and why.

---

## 1. Database Schema Fix (`supabase/007_schema_fixes.sql`)

**Problem:** The posts table only accepted 6 planet IDs — `doodle` was missing. Also several columns referenced by the code didn't exist in the database.

**What changed:**
- Added `'doodle'` to the `planet_id` CHECK constraint
- Added `drawing` column (stores base64 PNG for Doodle Drift)
- Added `author_id` column (links posts to authenticated users for admin accountability)
- Added `review_status`, `report_score`, `flagged_at`, `is_hidden` columns
- Added `reporter_hash`, `weight` columns to the reports table
- Created the `replies` table with proper RLS policies
- Made `content` nullable (drawing-only posts don't need text)

**Why:** Without this, Doodle Drift posts would crash with a database error, and the new account system couldn't link posts to users.

---

## 2. Vector3 Memory Leak Fix (`frontend/src/components/3d/EmotionPlanet.jsx`)

**Problem:** Inside the animation loop (runs 60 times per second), `new THREE.Vector3()` was creating a fresh object every single frame for every planet. That's 420 objects/second being created and immediately thrown away — forcing the browser's garbage collector to work overtime and causing frame stutters.

**What changed:**
```js
// BEFORE (bad — allocates every frame):
meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08)

// AFTER (good — reuses one pre-made object):
const _scaleTarget = useRef(new THREE.Vector3(1, 1, 1))  // created ONCE
// ...inside the loop:
_scaleTarget.current.set(targetScale, targetScale, targetScale)
meshRef.current.scale.lerp(_scaleTarget.current, 0.08)
```

**Why:** Performance. Pre-allocating objects is a standard practice in game/3D development. The old code would cause visible lag on mobile devices.

---

## 3. Auth Token Verification (`backend/src/middleware/verifyAuth.js`)

**Problem:** The backend had no way to know if a request came from an authenticated user or a random person using curl/Postman. Anyone could fake a `session_id`.

**What changed:** Created middleware that:
1. Reads the `Authorization: Bearer <token>` header from every request
2. Calls Supabase `auth.getUser(token)` to verify the token is real and not expired
3. Sets `req.userId` (the user's UUID) and `req.isAuthenticated` (true/false) on the request
4. Applied globally with `app.use(verifyAuth)` — runs before every route

**Why:** This is the bridge between "user clicked a button on the website" and "server knows who they are." Without it, the account system is cosmetic — the server can't tell authenticated users from guests.

---

## 4. Auth User ID → Post Author (`backend/src/routes/moderation.js`)

**Problem:** Posts were saved with whatever random UUID the client sent as `session_id`. Admins couldn't trace who posted what.

**What changed:**
```js
const insertPayload = {
  content: text.trim(),
  planet_id: pid,
  session_id: req.userId || sid,  // Use real auth ID when logged in
}
if (req.userId) {
  insertPayload.author_id = req.userId  // Accountability link for admins
}
```

**Why:** When a logged-in user posts, their Supabase Auth user ID is stored as `author_id`. This lets admins see "this account has been reported 5 times" — the core reason we added accounts.

---

## 5. Frontend Sends Auth Token (`frontend/src/lib/api.js`)

**Problem:** The `apiFetch()` function never sent any authentication headers. The backend couldn't know who was making requests.

**What changed:** `apiFetch()` now:
1. Gets the current Supabase session token via `supabase.auth.getSession()`
2. Attaches it as `Authorization: Bearer <token>` on every API call
3. Guest users (no session) send no token — backend treats them as unauthenticated

**Why:** This is the other half of fix #3. The frontend sends the token, the backend verifies it. Together they form the authentication chain.

---

## 6. WebGL Context Fix (`frontend/src/screens/LandingScreen.jsx`)

**Problem:** The landing page planet carousel created 7 separate `<Canvas>` elements (one per planet) plus 1 for the floating background. Browsers limit WebGL contexts to 8-16. Using all of them on the landing page meant navigating to the actual star system would trigger "WebGL context lost."

**What changed:** Replaced the per-slide 3D Canvas with large static planet icon images (`<img src="/icons/joy.png">`). The background planets still use 1 shared Canvas.

**Why:** Went from 8 WebGL contexts to 1. The star system page needs its own context — we can't waste them on the landing page.

---

## 7. Centralized Auth State (`frontend/src/store/useAppStore.js`)

**Problem:** The `useAuth()` hook was called independently in 4+ components (App, PlanetInfoPanel, ReactionBar, ReplyThread). Each created its own Supabase session listener — that's 4 WebSocket connections doing the same thing.

**What changed:**
- Moved `authUser`, `isAuthenticated`, `authLoading` into the Zustand store
- Added `initAuth()` that creates ONE session listener at app startup
- All components now read `isAuthenticated` from the store (one source of truth)
- Removed `useAuth` import from all consuming components

**Why:** Fewer network connections, no timing bugs between components disagreeing about auth state, simpler code.

---

## 8. CORS Restriction (`backend/src/index.js`)

**Problem:** The CORS regex `/^https:\/\/[a-z0-9-]+\.vercel\.app$/i` allowed ANY Vercel app to access the backend. An attacker could deploy their own site on Vercel and make API requests.

**What changed:**
```js
// BEFORE (allows any vercel.app):
/^https:\/\/[a-z0-9-]+\.vercel\.app$/i

// AFTER (only our project):
/^https:\/\/(anon-emote-frontend[a-z0-9-]*|anonemoteproject)\.vercel\.app$/i
```

**Why:** Security. Only your specific Vercel project can now call the backend. Preview deployments still work because they follow the `anon-emote-frontend-*` pattern.

---

## 9. DB Unavailable Retry (`backend/src/lib/storage.js`)

**Problem:** If the database had even one momentary blip (network hiccup, cold start), the `dbUnavailable` flag was permanently set to `true`. The server would never try the database again until manually restarted — falling back to file storage forever.

**What changed:**
- Replaced `dbUnavailable = true` with `markDbUnavailable()` which records the timestamp
- Added `shouldRetryDb()` which allows a retry attempt every 5 minutes
- After 5 minutes, the flag resets and the next request tries the database again

**Why:** Render's free tier cold-starts in 30-60 seconds. A momentary DB connection failure during startup shouldn't permanently break database logging.

---

## 10. Password Reset Flow (`frontend/src/screens/AuthScreen.jsx`)

**Problem:** If a user forgot their password, there was no way to recover their account.

**What changed:**
- Added a third mode: `'reset'` (alongside `'login'` and `'register'`)
- "Forgot password?" link appears on the login screen
- In reset mode: only shows email field, calls `supabase.auth.resetPasswordForEmail(email)`
- Shows success message directing user to check their email

**Why:** Basic account management. Without this, a forgotten password = permanently locked out.

---

## 11. Reaction Race Condition Fix (`backend/src/routes/reactions.js`)

**Problem:** If two clicks happened simultaneously (e.g., user double-tapped), both requests would find `existing = null`, both would try to INSERT, and one would fail with a unique constraint violation (error code 23505).

**What changed:**
```js
// If INSERT fails with unique_violation (23505), treat as a switch operation
if (error.code === '23505') {
  await supabase.from('reactions').update({ emoji }).eq('post_id', post_id).eq('session_id', session_id)
  return res.json({ action: 'switched', emoji })
}
```

**Why:** Instead of returning a 500 error to the user on double-tap, the system gracefully handles the race by converting the failed INSERT into an UPDATE.

---

## 12. Reduced Motion Support (`frontend/src/index.css`)

**Problem:** Users who have "Reduce motion" enabled in their OS accessibility settings still saw all animations (floating planets, pulsing glows, rocket animations). This can cause discomfort or nausea for motion-sensitive users.

**What changed:** Added a CSS media query:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Why:** Accessibility (WCAG 2.3.3). Shows panelists you've considered users with vestibular disorders. Also relevant for the ISO 25010 Usability evaluation.

---

## 13. Planet ID Validation (`backend/src/routes/moderation.js`)

**Problem:** The backend accepted any string as `planet_id`. Typos or malicious values would pass validation and only fail at the database level with a confusing 500 error.

**What changed:**
```js
const VALID_PLANETS = ['joy', 'vent', 'advice', 'grief', 'anxiety', 'neutral', 'doodle']
if (!VALID_PLANETS.includes(pid)) {
  return res.status(400).json({ error: `Invalid planet_id. Must be one of: ${VALID_PLANETS.join(', ')}` })
}
```

**Why:** Fail fast with a clear error message instead of crashing at the database layer. Also prevents potential injection via the planet_id field.

---

## Summary

| # | Category | File(s) Changed |
|---|---|---|
| 1 | Database | `supabase/007_schema_fixes.sql` |
| 2 | Performance | `frontend/src/components/3d/EmotionPlanet.jsx` |
| 3 | Security | `backend/src/middleware/verifyAuth.js`, `backend/src/index.js` |
| 4 | Security | `backend/src/routes/moderation.js` |
| 5 | Security | `frontend/src/lib/api.js` |
| 6 | Performance | `frontend/src/screens/LandingScreen.jsx` |
| 7 | Architecture | `frontend/src/store/useAppStore.js`, `App.jsx`, 3 UI components |
| 8 | Security | `backend/src/index.js` |
| 9 | Reliability | `backend/src/lib/storage.js` |
| 10 | UX | `frontend/src/screens/AuthScreen.jsx` |
| 11 | Reliability | `backend/src/routes/reactions.js` |
| 12 | Accessibility | `frontend/src/index.css` |
| 13 | Validation | `backend/src/routes/moderation.js` |
