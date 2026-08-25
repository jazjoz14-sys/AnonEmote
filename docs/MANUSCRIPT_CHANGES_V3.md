# AnonEmote — Manuscript Discrepancies & Revised Chapter 4 Recommendations (V3)

**Date:** August 25, 2026  
**Purpose:** Identifies remaining discrepancies between the capstone manuscript (Chapters 1–4 PDF) and the actual deployed system, then provides a revised Chapter 4 Recommendations section that explicitly ties back to the Statement of the Problem (SOP).

---

## PART A: DISCREPANCIES (Updates Beyond V2)

The previous `MANUSCRIPT_CHANGES_V2.md` already covers the major discrepancies (auth model, tech stack, database, planets, moderation, reporting, etc.). Below are **additional or corrected** discrepancies found after deeper cross-referencing with the actual codebase.

---

### 1. Internal Inconsistency Within the Manuscript Itself

The manuscript's **Description of the Proposed System** (pages 19–20) has been partially updated to describe the hybrid auth model:

> "The system uses a hybrid authentication model where users may register using an email and password through a Supabase Authentication or can browse the platform as a guest."

**However**, earlier sections (pages 17, 19, 24–25) still reference:
- "Pseudonymous, temporary IDs rather than permanencies" (Technical Terms, page 19)
- "A temporary cryptographically random ephemeral session UUID's" (Purpose and Description, page 17)

**Fix:** Harmonize all references. The Technical Terms definition of "Anonymity" should state that users authenticate with email (stored securely, never publicly displayed) while maintaining social-layer anonymity through abstract avatars and no visible usernames.

---

### 2. Typo: "Hybris AI" → "Hybrid AI"

Page 21 (Description of Proposed System): *"Each message submitted to the system is processed by the **Hybris** AI Content Moderation Engine."*

**Fix:** Change to "Hybrid AI Content Moderation Engine."

---

### 3. Auto-Hide Threshold Discrepancy

The manuscript (Figure 7, Admin Sequence Diagram) implies reports immediately trigger admin action. V2 stated "auto-quarantine on 2+ independent networks for severe categories or 4+ networks broadly."

**Actual implementation (schema.sql, lines 92–107):** A PostgreSQL trigger fires `auto_hide_reported_post()` after **any 3 distinct session reports** — regardless of severity, weight, or network independence. The `reporter_hash` and `weight` columns exist but the trigger doesn't use them — it simply counts rows.

**Fix:** The manuscript should state: "Posts are automatically quarantined (hidden from public view) when three or more independent reports are received. The administrator can then review, restore, permanently hide, or delete the post."

---

### 4. Perspective API Thresholds — Manuscript Says "0.70"

The manuscript mentions a single toxicity threshold of 0.70. The actual system uses **six attributes with varying thresholds**:

| Attribute | Actual Threshold |
|---|---|
| SEVERE_TOXICITY | 0.60 |
| TOXICITY | 0.75 |
| IDENTITY_ATTACK | 0.65 |
| INSULT | 0.70 |
| PROFANITY | 0.75 |
| THREAT | 0.60 |

**Fix:** Replace the single "0.70" reference with: "The system evaluates six toxicity attributes, each with calibrated thresholds ranging from 0.60 to 0.75 depending on severity."

---

### 5. Avatar Options Count

The manuscript (page 13, Description of Proposed System) correctly states: *"ten avatar shapes, eighteen color options, four particle effects and adjustable size settings."*

**Verified against code:** 10 shapes, 18 aura colors, 4 particle effects, scale slider (0.5–2.0). **This is correct and consistent.** No change needed.

---

### 6. Post Character Limit

The manuscript does not explicitly mention a character limit. The User Sequence Diagram (Figure 8) shows "Submit emotion post (Max 280 chars)."

**Actual system:** 280-character limit enforced at both the moderation engine (server-side validation) and the database (`CHECK (char_length(content) BETWEEN 1 AND 280)`).

**Status:** Already correct in the diagram. Could be mentioned explicitly in the Description of the Proposed System.

---

### 7. Reactions Emoji Set

The manuscript's **Class Diagram** (Figure 9) shows a generic `Reaction` class with `reactionType (string)`. The **Database Design section** (Table 3.12) shows `reactionType (string)` but doesn't enumerate the allowed values.

**Actual system:** Exactly 5 empathy-only emoji enforced at the DB level: 🫂 💙 😢 🌱 ✨

**Fix:** Table 3.12 should list the specific emoji and note that these are empathy-oriented reactions (Hug, Support, Empathy, Growth, Encouragement) rather than conventional popularity metrics like "likes" or "upvotes."

---

### 8. Chapter 4 Recommendations — Lack of SOP Alignment

The current Chapter 4 Recommendations (pages 87–89) provide three generic recommendations:
1. "Continue improving the 3D Star System"
2. "Continue enhancing the system's main features"
3. "Continue using ISO/IEC 25010 for future evaluations"

**Problem:** These recommendations do not tie back to the three sub-problems in the Statement of the Problem:
- a. Social Performance Pressure
- b. Identity Exposure (Lack of Anonymity)
- c. Exposure to Cyber Aggression (Toxicity and Bullying)

**Fix:** See Part B below for revised recommendations that explicitly map to each SOP sub-problem.

---

### 9. Scope and Delimitation — Missing Disclaimer About the Account System

The Scope and Delimitation section (pages 32–33) has been partially updated to mention Supabase Auth. However, it still says:

> "the system does not cover any psychological assessment, clinical analysis, or even a diagnosis for mental health conditions"

This is fine and should stay. But the section should also clarify:
- The system stores **only email** for authentication — no name, photo, school ID, or other PII
- Email is managed by Supabase Auth's encrypted storage and is never displayed to any user or administrator
- The platform complies with the Data Privacy Act of 2012 (RA 10173) by collecting only the minimum data necessary for account accountability

---

### 10. Missing Feature: Onboarding & Terms of Service

The manuscript does not mention the **Terms of Service modal** or **onboarding flow** that exists in the deployed system.

**Actual system:** First-time users see a Terms of Service consent modal before accessing the platform. An onboarding overlay guides users through the 3D interface on first visit.

**Fix:** Mention in the system features section: "The system includes a Terms of Service acceptance step and an interactive onboarding guide to orient new users within the 3D environment."

---

## PART B: REVISED CHAPTER 4 RECOMMENDATIONS

Below is a rewritten Recommendations section that structurally ties each recommendation to one of the three SOP sub-problems. This follows the capstone manuscript format (numbered, with sub-problem labels).

---

### RECOMMENDATIONS

Based on the conclusions, the following recommendations are formulated and organized according to the three core sub-problems identified in the Statement of the Problem:

---

#### Recommendation 1: Addressing Social Performance Pressure (SOP 1a)

The researchers recommend that the developers continue refining the 3D Star System and Emotion Planet environment to provide users with a more engaging and immersive alternative to conventional 2D social media feeds. Specifically:

- **Improve 3D navigation and loading performance.** The current WebGL environment requires significant client-side resources. Future iterations should optimize asset loading, implement progressive rendering, and consider lower-fidelity fallback modes for low-end devices to ensure broader accessibility.

- **Integrate custom 3D planet models.** The current procedural geometry for Emotion Planets should be replaced with artist-created 3D models (GLB format) to enhance visual distinction between emotional categories and create a stronger spatial metaphor that further separates the platform from traditional scroll-based feeds.

- **Expand the Emotion Check-In process.** The two-step emotion triage (broad feeling → nuance) effectively promotes emotional literacy by encouraging users to identify and label their current emotional state before interacting. Future development could incorporate longitudinal emotion tracking (in aggregate and anonymized form) to provide institutional insights into common student stressors — as recommended by the expert psychologist consultation — while maintaining individual anonymity.

- **Evaluate effectiveness through controlled user studies.** Future research should employ pre- and post-test survey designs to measure whether the 3D spatial environment significantly reduces self-reported social performance pressure compared to conventional 2D feeds, using validated instruments such as the Social Media Fatigue Scale or the Fear of Negative Evaluation Scale.

---

#### Recommendation 2: Addressing Identity Exposure (SOP 1b)

The researchers recommend that the developers continue strengthening the platform's privacy-preserving architecture to maintain the balance between social-layer anonymity and behind-the-scenes accountability. Specifically:

- **Maintain and document the hybrid authentication model.** The current architecture — where users authenticate with email for posting access while remaining fully anonymous in the social layer — should be clearly documented in all user-facing materials. Users should understand that their email is never displayed to other users or standard administrators, and that their identity is protected by Supabase Auth's encrypted credential storage.

- **Enhance the abstract avatar system.** The non-human avatar design (10 shapes, 18 colors, 4 particle effects) successfully prevents identity-based recognition. Future iterations should consider integrating custom Maya-created GLB models to provide richer visual diversity while maintaining the deliberately abstract, non-human appearance that prevents physical identity markers.

- **Implement account suspension transparency.** When administrators suspend an account for repeated violations, the system should communicate the suspension reason clearly to the affected user without revealing which specific posts triggered the action — maintaining the privacy of reporters while ensuring due process.

- **Conduct longitudinal privacy perception studies.** Future research should measure how the hybrid anonymity model (socially anonymous, accountable behind the scenes) affects users' willingness to disclose vulnerable emotions compared to fully anonymous systems (such as traditional Freedom Walls) and fully identity-based systems (such as Facebook), using the Self-Disclosure Scale or similar validated instruments.

---

#### Recommendation 3: Addressing Exposure to Cyber Aggression (SOP 1c)

The researchers recommend that the developers continue enhancing the Hybrid AI Content Moderation engine to proactively protect users from toxicity, cyberbullying, and hate speech. Specifically:

- **Regularly update the local moderation lexicon.** The three-layer moderation system's effectiveness depends on comprehensive and current keyword coverage for Bicolano, Tagalog, and English. The researchers recommend establishing a regular review cycle (at minimum, once per academic semester) where the local lexicon is updated with emerging slang, coded language, and new cyberbullying patterns identified through the admin report queue and the dry-run testing tool.

- **Expand the safe-context system.** The current safe-context suppression mechanism reduces false positives by recognizing that certain toxic-seeming words appear in harmless phrases (e.g., "therapy" containing a substring flagged in crisis detection). Future iterations should crowdsource safe-context phrases from moderation logs where posts were manually restored by administrators after being incorrectly flagged.

- **Improve multilingual coverage for Layer 3.** The Google Perspective API currently provides ML-based scoring for English only. Future development should explore integrating Filipino-language ML models (such as those developed by Naga and Lavilles, 2024; Sarno and Cruz, 2024) to extend machine-learning-based toxicity detection beyond English to Tagalog and Bicolano, reducing reliance on keyword-only detection for local languages.

- **Evaluate moderation effectiveness through precision/recall metrics.** Future research should measure the system's moderation accuracy by calculating precision (percentage of blocked posts that were genuinely harmful), recall (percentage of harmful posts that were successfully blocked), and the false positive rate (legitimate emotional expression incorrectly blocked). This should be conducted across all three supported languages and reported separately for each moderation layer.

- **Strengthen the community reporting mechanism.** The current HMAC-based network deduplication prevents report abuse, and the reason-weighting system prioritizes severe categories. Future iterations should implement a "reporter reliability score" that gives greater weight to reports from users whose previous reports were confirmed by administrators, further reducing the time-to-action for genuine safety concerns.

---

#### Recommendation 4: System Quality and Maintenance (SOP 3 — ISO/IEC 25010)

The researchers recommend that the developers maintain and continue evaluating the system against selected ISO/IEC 25010 software quality characteristics. Specifically:

- **Functional Suitability:** Conduct periodic feature audits to ensure all implemented functions remain aligned with the platform's stated objectives. New features should be evaluated against the three SOP sub-problems before implementation.

- **Reliability:** Address the current deployment limitation (Render free-tier backend sleeps after 15 minutes of inactivity) by implementing health-check ping mechanisms or migrating to a paid hosting tier for production deployment. Implement automated testing (unit and integration tests) to catch regressions before deployment.

- **Security:** Restrict the CORS configuration to specific authorized domains only (currently allows any *.vercel.app subdomain). Implement an admin user management panel to enable account-level interventions (suspension, investigation) for repeat offenders. Consider migrating from single-password admin authentication to role-based access control.

- **Usability:** Conduct accessibility testing to ensure the platform can be navigated by users with disabilities. While full 3D navigation may not be achievable via keyboard-only interaction, provide alternative text-based views for screen reader users. Conduct usability testing with a larger sample size to strengthen the statistical reliability of evaluation results.

- **Maintainability:** Continue using the modular architecture (React components, Express route separation, Zustand store slices) that received positive evaluation from IT professionals. Document all system configuration, deployment procedures, and moderation rules to support future developers who may continue the project.

---

#### Recommendation 5: Future Research Directions

The researchers recommend the following directions for future studies building on this work:

- **Multi-institutional deployment.** Test the system across multiple Philippine universities to validate whether the observed benefits (reduced performance pressure, increased emotional expression willingness) generalize beyond the pilot population at Partido State University.

- **Longitudinal emotional literacy measurement.** Track whether regular platform usage correlates with improved emotional vocabulary and self-regulation skills over an academic semester, using the Emotional Profile Index or similar standardized measures as suggested by the expert psychologist.

- **Comparative study with traditional Freedom Walls.** Conduct a controlled comparison between AnonEmote and unmoderated Facebook-based Freedom Walls, measuring differences in toxic content prevalence, user-reported safety perception, and emotional disclosure depth.

- **Mobile application development.** While the current web-based implementation is responsive and optimized for mobile browsers, a native mobile application could provide push notifications for received empathy reactions, offline access to personal drafts, and improved WebGL performance through native GPU access.

---

## PART C: SUMMARY OF ALL DISCREPANCIES (QUICK REFERENCE)

| # | Area | Manuscript Says | System Actually Does | Severity |
|---|---|---|---|---|
| 1 | Auth model (internal conflict) | Mix of "ephemeral sessions" and "hybrid auth" | Hybrid: email auth for writing, guest for browsing | HIGH — harmonize |
| 2 | Typo | "Hybris AI" | "Hybrid AI" | LOW — fix |
| 3 | Auto-hide threshold | Unclear / implied immediate | 3 reports trigger auto-hide | MEDIUM |
| 4 | Perspective thresholds | Single "0.70" | 6 attributes, 0.60–0.75 | MEDIUM |
| 5 | Avatar options | "10 shapes, 18 colors, 4 effects" | Matches exactly | ✅ Correct |
| 6 | Character limit | 280 (in diagram) | 280 (enforced) | ✅ Correct |
| 7 | Reaction types | Generic "reactionType" | 5 specific empathy emoji | MEDIUM |
| 8 | Ch4 Recommendations | Generic, not SOP-aligned | Should map to 3 sub-problems | HIGH |
| 9 | Scope - account privacy | Partially updated | Add email-only, RA 10173 compliance | MEDIUM |
| 10 | Onboarding/ToS | Not mentioned | Exists in deployed system | LOW |
| 11 | Planet count | 7 in system | Manuscript lists 7 (correct after update) | ✅ Correct |
| 12 | Tech stack | Partially updated | Needs React Three Fiber, Zustand, Kiro IDE | HIGH |
| 13 | Three-layer moderation | Manuscript shows 3 layers | Matches (after earlier update) | ✅ Correct |
| 14 | Database tables | Profiles table updated | Needs reactions/reports detail | MEDIUM |
| 15 | System architecture | Basic frontend→backend→DB | Needs Vercel/Render/Supabase topology | MEDIUM |

---

## PART D: ACTION ITEMS FOR DEFENSE PREPARATION

1. **Print and bring** this document and V2 to the defense — panelists will ask about account system and moderation
2. **Be prepared to explain** why the system evolved from ephemeral-only to hybrid auth (accountability for repeat offenders while preserving social anonymity)
3. **Know the actual thresholds** — panelists may test with Filipino profanity and ask why certain words pass or fail
4. **Know the limitation** that Perspective API only scores English — Filipino toxicity relies on keyword-only detection
5. **Know the auto-hide math** — 3 reports from different sessions, regardless of severity
6. **Know that the pilot test had N=3 IT professionals** — be ready to acknowledge this is a small sample and suggest larger evaluation for future work
