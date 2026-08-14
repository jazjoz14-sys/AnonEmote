# AnonEmote — Complete Project Audit

**Date:** August 14, 2026  
**Purpose:** Identify ALL flaws before proceeding to finishing touches.

---

## 🔴 CRITICAL (Must fix before defense)

### 1. Backend doesn't validate Supabase Auth tokens
- All routes (`/api/moderate`, `/api/reactions`, `/api/replies`, `/api/reports`) accept a client-supplied `session_id` with zero server-side verification
- Anyone can POST directly to the backend API bypassing the frontend auth gate
- **Fix:** Add middleware that extracts + verifies the Supabase JWT from the `Authorization` header. Use `session_id = user.id` from the verified token for authenticated users.

### 2. Database schema missing `doodle` planet
- `schema.sql` has `CHECK (planet_id IN ('joy','vent','advice','grief','anxiety','neutral'))` — **missing 'doodle'**
- Submitting a drawing will fail with a DB constraint error
- **Fix:** Add `'doodle'` to the CHECK constraint. Run `ALTER TABLE posts DROP CONSTRAINT ...; ALTER TABLE posts ADD CONSTRAINT ... CHECK (planet_id IN ('joy','vent','advice','grief','anxiety','neutral','doodle'));`

### 3. No bridge between auth user ID and session_id
- Logged-in users' posts are attributed to a random `sessionId` (UUID) instead of their `user.id`
- The account system has no effect on post ownership — admins can't trace posts to accounts
- **Fix:** When authenticated, pass `user.id` as the `session_id` to the backend. Update the moderation route to accept and store `author_id` when a valid auth token is present.

### 4. Landing page creates 8+ WebGL contexts
- `BackgroundPlanets` = 1 Canvas, `PlanetCarousel` = 7 Canvases (one per planet card)
- Browsers cap at 8-16 contexts total. Navigating to SpaceScreen will trigger context loss
- **Fix:** Replace individual Canvases with static images/CSS, OR render all carousel planets in a single shared Canvas, OR lazy-mount only the visible slide's Canvas.

### 5. Missing database tables/columns
- `replies` table: never created in schema.sql (must exist from manual creation)
- `drawing` column on posts: not in schema.sql
- `review_status`, `report_score`, `flagged_at` columns on posts: not in schema.sql
- `reporter_hash`, `weight` columns on reports: not in schema.sql
- **Fix:** Create a comprehensive migration SQL that adds all missing columns and tables. Consolidate everything into one master `schema_v2.sql`.

---

## 🟠 HIGH (Should fix — panelists may notice or demo will break)

### 6. Memory leak in EmotionPlanet.jsx
- `new THREE.Vector3(targetScale, ...)` is called **every frame** (60fps × 7 planets = 420 allocations/second)
- Causes GC pressure and frame drops over time
- **Fix:** Pre-allocate a single `_targetScale` Vector3 outside useFrame and reuse it.

### 7. Quality tier hardcoded to 'medium'
- `device.js` line 47: Both branches of the ternary return `'medium'`. The 'high' tier (with shadows) is unreachable code.
- **Fix:** Properly detect desktop GPUs that can handle shadows (check for non-ANGLE renderer).

### 8. `useAuth` called independently in 4+ components
- App.jsx, PlanetInfoPanel, ReactionBar, ReplyThread each create their own Supabase session listener
- Causes redundant network calls and potential timing inconsistencies
- **Fix:** Create an AuthContext provider at the app root, or integrate auth state into the Zustand store.

### 9. Supabase service key exposed in .env (committed context)
- The backend `.env` file content has been shared in chat messages. While `.env` is gitignored, the key value is now in conversation history.
- **Fix:** Rotate the Supabase service role key in the Supabase dashboard (Project Settings → API → Regenerate).

### 10. CORS allows ANY *.vercel.app domain
- `/^https:\/\/[a-z0-9-]+\.vercel\.app$/i` matches any Vercel deployment by any user
- An attacker could deploy their own frontend on vercel.app and make authenticated API requests
- **Fix:** Restrict to your specific project slug: `/^https:\/\/anon-emote-frontend[a-z0-9-]*\.vercel\.app$/i`

### 11. Drawings skip moderation entirely
- DoodleModal sends `text: '[drawing]'` which always passes the AI filter
- No image scanning — inappropriate drawings go live immediately
- **Fix:** Document this as a known limitation (community reports are the backstop). Alternatively, add NSFW image detection via an external API.

### 12. No email verification enforcement
- Supabase requires email confirmation by default, but AuthScreen doesn't handle the "email not confirmed" error state
- Users might sign up, not confirm email, try to login, and get a confusing error
- **Fix:** Handle the specific error message from Supabase and show "Please check your email to confirm your account."

---

## 🟡 MEDIUM (Strengthens quality — fix if time permits)

### 13. Race condition in reactions
- Two concurrent reaction requests for the same session+post could both INSERT (no upsert/atomic toggle)
- **Fix:** Use Supabase's `ON CONFLICT` clause or a database function for atomic toggle.

### 14. No password reset flow
- AuthScreen has no "Forgot password?" option
- **Fix:** Add `supabase.auth.resetPasswordForEmail(email)` flow with a simple UI.

### 15. Admin console has no user management
- With the account system added, admins need to: list users, view their post history, suspend accounts
- **Fix:** Add a 4th tab "Users" that queries the `profiles` table and shows suspension controls.

### 16. Audit log lost on redeploy
- `backend/data/` is ephemeral on Render's free tier
- **Fix:** Move audit logging to the Supabase `audit_log` table (the code already tries this, but falls back to file permanently after first failure).

### 17. `dbUnavailable` flag is permanent
- In `storage.js`, once set to `true` it never resets. A momentary DB blip permanently disables DB audit logging.
- **Fix:** Add a retry mechanism (e.g., retry every 5 minutes) or reset the flag on successful write.

### 18. Scroll-jacking carousel = 700vh
- Users must scroll through 700vh of content to see all 7 planets
- This is confusing UX — users may think the page is broken or too long
- **Fix:** Reduce to 400-500vh total, or add navigation arrows/dots that jump between planets.

### 19. No loading state during post fetch
- SpaceScreen shows "No posts yet" while fetching, which is misleading
- **Fix:** Add a loading state before the fetch completes.

### 20. PlanetInfoPanel auth prompt navigates away
- Clicking "Sign In / Register" from the modal does `setPhase('auth')` which exits the entire 3D scene
- **Fix:** Already partially fixed with the inline modal — ensure the `setPhase('auth')` path preserves the selected planet so users return to the right place after login.

---

## 🟢 LOW (Nice to have — mention in "Future Work")

### 21. No `prefers-reduced-motion` support
- Orbit animations, particles, floating background planets ignore motion preferences
- **Fix:** Check `window.matchMedia('(prefers-reduced-motion: reduce)')` and disable animations.

### 22. No focus trapping in modals
- Screen reader users can tab behind open modals into the 3D scene
- **Fix:** Add focus trap (inert attribute on background, or a focus-trap library).

### 23. Color contrast issues
- `text-slate-600` on dark backgrounds may fail WCAG AA (4.5:1 ratio)
- **Fix:** Use `text-slate-400` minimum for body text on dark backgrounds.

### 24. No offline/connection indicator
- If Supabase realtime drops, users see no warning
- **Fix:** Add a "Connection lost" banner when the channel disconnects.

### 25. Duplicated Supabase client creation in backend
- Every route file has its own `getSupabase()` with identical logic
- **Fix:** Extract to a shared `lib/supabase.js` module.

### 26. No input validation on planet_id
- Backend accepts any string for `planet_id` — typos cause 500 errors instead of 400
- **Fix:** Validate against an allowed list before attempting DB insert.

### 27. `window.innerWidth` computed at module level
- `PlanetInfoPanel` calculates panel width once at import. Resize/rotation makes it stale.
- **Fix:** Use a hook like `useWindowSize` or compute inside the component.

### 28. No account deletion flow
- Users can't delete their account or request data removal
- **Fix:** Add a "Delete my account" button in a settings panel that calls `supabase.auth.admin.deleteUser()`.

### 29. Private notes button hidden when empty
- Users with zero notes never discover the feature exists
- **Fix:** Always show the button (with a "0" badge or tooltip explaining the feature).

### 30. Replies count unknown before expansion
- The "Offer advice" button doesn't show existing reply count until expanded
- **Fix:** Fetch reply counts alongside reactions in the PlanetInfoPanel batch request.

### 31. No test infrastructure
- Zero automated tests. No test framework configured.
- **Fix:** Add Vitest for frontend unit tests, and a basic test suite for the moderation engine.

### 32. render.yaml missing ADMIN_ENABLED
- Admin console unreachable in production unless manually set in Render dashboard
- **Fix:** Add `ADMIN_ENABLED: sync: false` to render.yaml envVars.

---

## Summary Checklist

| Priority | Count | Action |
|---|---|---|
| 🔴 Critical | 5 | Must fix before defense demo |
| 🟠 High | 7 | Should fix — visible to panelists |
| 🟡 Medium | 8 | Strengthens ISO 25010 scores |
| 🟢 Low | 12 | Mention in Chapter 4 recommendations |
| **Total** | **32** | |

---

## Recommended Fix Order

1. Fix schema (add `doodle` to CHECK, add missing columns) — 10 minutes
2. Fix Vector3 memory leak — 2 minutes  
3. Centralize useAuth into context provider — 30 minutes
4. Bridge auth user.id → session_id in posts — 1 hour
5. Add auth token verification middleware to backend — 1 hour
6. Fix landing page WebGL context explosion — 1-2 hours
7. Add user management to admin — 2-3 hours
8. Reset `dbUnavailable` flag + move audit to Supabase — 30 minutes
9. Add email verification error handling — 15 minutes
10. Restrict CORS to your specific Vercel project — 5 minutes

**Estimated total: ~8-10 hours of focused work to clear all Critical + High issues.**
