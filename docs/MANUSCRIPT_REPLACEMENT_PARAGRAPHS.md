# AnonEmote — Replacement Paragraphs for Manuscript

**Instructions:** Copy each section below directly into the corresponding location in the manuscript. Formatting follows the existing paper style (justified, double-spaced, APA 7th in-text citations preserved).

---

## 1. TECHNICAL TERMS — "Anonymity" (Replace page 19 definition)

**Anonymity** — It is the condition when the identity of an individual is not known, cannot be tracked, or is not visible in online communications (Wright, 2024). In the context of AnonEmote, this refers to the platform's social-layer anonymity model in which users remain unidentifiable to other users throughout all interactions. Although users authenticate using an email address managed securely by Supabase Auth, this credential is never displayed publicly. Posts, replies, and reactions appear without any visible author attribution, avatar name, or account identifier. The system maintains a strict separation between the authentication layer (used solely for login, account accountability, and administrative investigation) and the social layer (where all interactions are presented anonymously through abstract, non-human avatars).

---

## 2. TECHNICAL TERMS — "Pseudonymous Architecture" (Replace page 20 definition)

**Pseudonymous Architecture** — A design pattern in which users can interact with each other without exposing personal data in the social layer. AnonEmote implements a hybrid accountability model: users register with an email address and password for posting access, but this information is stored in encrypted form by Supabase Auth and is never associated with any publicly visible post, session, or profile. Behind the scenes, each post is linked to an internal author identifier (UUID) that administrators can reference when investigating reports of policy violations. This architecture guarantees that the social experience remains fully anonymous while providing the system with accountability mechanisms to address repeat offenders — balancing the psychological benefits of anonymity with the practical necessity of moderation.

---

## 3. DESCRIPTION OF THE PROPOSED SYSTEM — Authentication (Replace pages 19-20, starting from "The proposed computerized system has a data flow...")

The proposed computerized system has a data flow that starts when a user accesses the web application. The system uses a hybrid authentication model where users may register using an email and password through Supabase Authentication or can browse the platform as a guest. Registered users are required to authenticate before posting, replying, or reacting, while guest users may explore the 3D star system and view public posts without providing any personal information.

Although an email address is stored for authentication and account management, it is not publicly displayed anywhere within the platform. Users remain fully anonymous within the social layer through their abstract avatars and anonymous content attribution. No usernames, display names, profile pictures, or follower counts exist in the system. The only visible identity a user has is their customized non-human avatar shape, color, and particle effect — which carries no personally identifiable information.

This hybrid model resolves the fundamental tension between user safety and user freedom: the authentication layer provides administrators with the ability to investigate reports and suspend accounts of repeat offenders, while the social layer ensures that users experience zero identity-related performance pressure when expressing emotions. Guest users who have not registered can still experience the full 3D environment, read all public posts, and observe the community — but cannot contribute content. When a guest attempts to post, reply, or react, the system presents an authentication prompt modal that invites registration without interrupting the browsing experience.

---

## 4. DESCRIPTION OF THE PROPOSED SYSTEM — Moderation Engine (Replace page 21, starting from "Each message submitted...")

Each message submitted to the system is processed by the Hybrid AI Content Moderation Engine. The implemented moderation process follows three layers evaluated in strict priority order. The first layer performs crisis detection by scanning the text against local keyword lexicons covering English, Tagalog, and Bicolano crisis indicators such as suicidal ideation and self-harm expressions. When crisis content is detected, the system preserves the user's draft (rather than discarding it), blocks the submission, and displays an emergency referral interface with Philippine crisis hotline numbers.

The second layer performs vernacular toxicity detection using local keyword lexicons for Tagalog and Bicolano terms. Because the Google Perspective API does not support Filipino languages, this layer operates independently using an Aho-Corasick multi-pattern matching algorithm with word-boundary validation and a safe-context suppression mechanism that prevents false positives when toxic-seeming substrings appear within harmless phrases.

The third layer applies machine learning-based content analysis through the Google Perspective API for English-language text. The system evaluates six toxicity attributes — Severe Toxicity, Toxicity, Identity Attack, Insult, Profanity, and Threat — each with calibrated thresholds ranging from 0.60 to 0.75 depending on the severity of the attribute. If any attribute score exceeds its threshold, the content is blocked.

If the Perspective API is unavailable due to network issues or service disruption, the system activates a local fallback that applies the English toxic keyword lexicon using the same Aho-Corasick matching process, ensuring that content moderation never silently fails open. All moderation decisions, including the matched terms, the responsible layer, and the resulting action, are logged for administrative review.

---

## 5. DESCRIPTION OF THE PROPOSED SYSTEM — Avatar Creator (Replace/insert after avatar section on page 13)

In order to offer a safe social environment without revealing real-life identity to the world, the user is asked to personalize a 3D avatar. The implemented avatar creator provides ten avatar shapes organized into three thematic categories: Nature Forms (Clover, Droplet, Spirit), Celestial Forms (Moon, Spark, Crystal), and Symbolic Forms (Heart, Ribbon, Ring, Shard). Users select from eighteen aura color options spanning cool tones, warm tones, and deep emissive tones, as well as four particle effects (Stardust, Pulsing Rings, Fireflies, and None) and an adjustable size slider ranging from 0.5 to 2.0.

The avatar design is intentionally abstract and non-human. No skin tones, facial features, body types, or gendered forms exist in the system. This is not merely an aesthetic choice but a deliberate implementation of the psychological buffer described by Kim and Park (2024), ensuring that nothing about a user's avatar can leak or imply their real-world identity. The 3D avatars are rendered in real-time using WebGL through the React Three Fiber framework, with programmatic rotation animation, gentle bobbing motion, and emissive color rendering that makes each form glow distinctly against the dark space environment.

---

## 6. DESCRIPTION OF THE PROPOSED SYSTEM — Reporting (Replace relevant section or insert new paragraph)

The implemented reporting system allows registered users to flag potentially harmful posts for administrative review. Users select from five predefined report categories: harassment, hate speech, self-harm concern, spam, and other. An optional note field (maximum 300 characters) allows reporters to provide additional context. The system employs privacy-preserving network deduplication through HMAC-SHA256 hashing, which prevents session-churn abuse (where a single user creates multiple sessions to inflate report counts) without storing or being able to recover any user's network information.

Reports do not immediately hide content from public view. Instead, they enter a review queue where administrators can Flag and Hide, Restore, Approve and Protect (making a post immune to further auto-hiding), or permanently Delete the reported post. Automatic quarantine occurs only when three or more independent reports accumulate against a single post, at which point the database trigger sets the post's visibility to hidden pending administrative review. The system always returns a success response to the reporter regardless of whether the report is a duplicate, ensuring that no information about other reporters' activity is ever leaked.

When a user reports content under the "self-harm" category, the system surfaces Philippine crisis hotline information (NCMH Crisis Hotline 1553, HOPELINE Philippines 8804-4673) to the reporter as well, acknowledging that reading distressing content may itself cause emotional distress.

---

## 7. DESCRIPTION OF THE PROPOSED SYSTEM — Reactions (Insert after interaction description)

The implemented reaction system allows registered users to respond to posts using a curated set of five empathy-oriented emoji: 🫂 (Hug), 💙 (Support), 😢 (Empathy), 🌱 (Growth), and ✨ (Encouragement). This set was deliberately designed to exclude conventional popularity-based metrics such as likes, upvotes, or follower counts — features which the research literature identifies as drivers of social performance pressure (Smith and Anderson, 2025). Users may leave one reaction per post, which can be toggled off or switched to a different emoji at any time. Reaction counts are visible on posts, but no attribution connects a reaction to any specific user, maintaining the anonymity principle throughout all interaction types.

---

## 8. SCOPE AND DELIMITATION — Privacy Clarification (Add to existing section, page 33)

Furthermore, the system stores users' email addresses through Supabase Auth for authentication and account accountability. Authentication information is managed securely by Supabase Auth's encrypted credential storage and is not publicly displayed to other users or standard administrators. The system maintains public anonymity by preventing users' email addresses and account identities from being displayed alongside their posts, replies, or reactions. This approach aligns with the Data Privacy Act of 2012 (Republic Act 10173) by collecting only the minimum personal data necessary for account security and moderation accountability, while ensuring that all social interactions remain identity-free. Guest users who choose not to register can browse the platform without providing any personal information whatsoever.

---

## 9. DATABASE DESIGN — Reactions Table (Add as new Table 3.12)

**Table 3.12**

*Reactions Table*

| Field | Type | Description |
|---|---|---|
| reactionID | UUID | Unique identifier for the reaction |
| postID | UUID | References the associated post |
| authorID | UUID | References the authenticated user (internal only) |
| emoji | string | One of five allowed empathy emoji (🫂💙😢🌱✨) |
| createdAt | datetime | Timestamp of reaction creation |

**Constraint:** One reaction per user per post. AnonEmote uses empathy-oriented reactions (Hug, Support, Empathy, Growth, Encouragement) rather than conventional popularity-based reactions. This design ensures that user interactions remain supportive in nature and do not introduce the competitive social metrics that contribute to performance pressure on traditional platforms.

---

## 10. DATABASE DESIGN — Reports Table (Add as new Table 3.13)

**Table 3.13**

*Reports Table*

| Field | Type | Description |
|---|---|---|
| reportID | UUID | Unique identifier for the report |
| postID | UUID | References the reported post |
| reporter_hash | string | HMAC-SHA256 privacy-preserving network fingerprint |
| reason | string | Category: harassment, hate_speech, self_harm, spam, other |
| weight | integer | Severity weight (1–3) for review queue prioritization |
| note | string | Optional context from the reporter (max 300 characters) |
| reviewed | boolean | Whether an administrator has reviewed this report |
| createdAt | datetime | Timestamp of report submission |

**Constraint:** One report per session per post, deduplicated additionally by network hash. The reporter hash is computed using HMAC-SHA256 of the reporter's network address combined with the post identifier, enabling duplicate detection across session changes without storing or being able to recover any user's network information. Reports with higher severity weight (hate speech and self-harm: weight 3) are prioritized in the administrator's review queue.

---

## 11. CHAPTER 4 — RECOMMENDATIONS (Full replacement for pages 87-89)

### RECOMMENDATIONS

Based on the conclusions, the following recommendations were formulated.

The researchers recommend that future developers continue addressing the problems encountered by users in expressing their feelings online. To further reduce social performance pressure, the 3D environment should be optimized for more devices and enriched with custom 3D planet models to strengthen the spatial experience that separates the platform from traditional 2D feeds. To further address identity exposure, the hybrid anonymity model should be clearly communicated to users and the abstract avatar system expanded to ensure that no aspect of a user's real identity can be inferred. To further protect users from cyber aggression, the local moderation lexicons should be updated regularly with emerging Filipino slang and cyberbullying patterns, and future development should explore integrating Filipino-language machine learning models. The researchers also suggest regularly collecting user feedback and conducting future studies to measure the platform's effectiveness in promoting emotional literacy and reducing the barriers that prevent authentic emotional expression.

---

## 12. TECHNICAL TERMS — "Content Moderation with Artificial Intelligence (AI)" (Replace page 19 definition)

**Content Moderation with Artificial Intelligence (AI)** — The application of machine learning algorithms and natural language processing to detect, assess, and filter user-generated content in real time (Feerst, 2022). In AnonEmote, this refers to the three-layer Hybrid AI Content Moderation Engine that scans user messages before publication. The first layer detects crisis indicators (suicidal ideation, self-harm) using local keyword matching across English, Tagalog, and Bicolano. The second layer detects vernacular toxicity using local keyword lexicons for Tagalog and Bicolano with word-boundary validation and safe-context suppression to reduce false positives. The third layer applies the Google Perspective API's machine learning models to score English text across six toxicity attributes. When any layer identifies harmful content, the submission is blocked before reaching the database. When crisis content is detected, the system preserves the user's draft and displays emergency mental health referral resources.

---

## 13. TECHNICAL TERMS — "Filtering System" (Replace page 19-20 definition)

**Filtering System** — A content moderation system employed to control online text generated by users. In AnonEmote, the filtering system operates as a three-layer automated pipeline that evaluates every submission before it can appear publicly. Unlike conventional platforms where content is published first and reported later, AnonEmote's filtering system operates pre-publication — no content reaches the database or becomes visible to other users until it passes all moderation layers. The system uses a combination of local Aho-Corasick multi-pattern matching (for Filipino-language detection) and external machine learning scoring via the Google Perspective API (for English-language detection). When the external API is unavailable, a local English keyword fallback ensures that moderation never silently fails open.

---

## 14. SOFTWARE REQUIREMENTS TABLE (Table 3.18 — Full replacement)

**Table 3.18**

*Recommended Software Requirements*

| Particulars | Specifications |
|---|---|
| Language | JavaScript (ES Modules), HTML5, CSS3 |
| Frontend Framework | React 18, Vite 5 |
| 3D Framework | React Three Fiber, @react-three/drei, @react-three/postprocessing |
| State Management | Zustand |
| Styling | Tailwind CSS 3, PostCSS, Autoprefixer |
| Backend | Node.js (≥18), Express 4 |
| Database | Supabase (PostgreSQL with Row Level Security, Realtime, Presence) |
| Authentication | Supabase Auth (email/password) |
| AI Content Moderation | Google Perspective API (English), Local Aho-Corasick lexicons (Tagalog, Bicolano, English) |
| Security | Helmet, CORS, express-rate-limit, HMAC-SHA256 report deduplication |
| Real-Time Services | Supabase Realtime (post streaming), Supabase Presence (multiplayer avatars) |
| Development Tools | Kiro IDE, Git, GitHub |
| Deployment | Vercel (frontend static hosting), Render (backend Node.js service) |
| Utilities | uuid (v4 session identifiers), dotenv (environment configuration) |

---

## 15. SYSTEM ARCHITECTURE — Description (Replace page 53 description paragraph)

Figure 5 shows the System Architecture of AnonEmote, which illustrates the overall structure of the system, its major components, and the communication between these components. AnonEmote is a web-based system designed to allow users to express their emotions anonymously in a 3D environment. The system follows a modern three-tier web architecture deployed across cloud platforms optimized for the Philippine region.

The **Frontend** is a React 18 single-page application bundled with Vite and deployed as a static build on Vercel. It renders the 3D Star System using React Three Fiber (a React wrapper over Three.js/WebGL) and communicates with both the Backend API and Supabase directly. For read operations (fetching posts, real-time subscriptions, presence data, and authentication), the Frontend connects directly to Supabase using an anonymous key protected by Row Level Security policies. For write operations (posting, reacting, replying, reporting), the Frontend sends requests to the Backend API with an attached JWT authentication token.

The **Backend API Server** is a Node.js application using the Express framework, deployed on Render. It serves as the moderation gateway — all user-generated content passes through the Hybrid AI Content Moderation Engine before reaching the database. The Backend communicates with Supabase using a service-role key (which bypasses Row Level Security) to insert approved content, and with the Google Perspective API to obtain machine learning toxicity scores for English text.

The **Supabase Database** provides PostgreSQL storage with Row Level Security, real-time change streaming (for instant post updates across all connected clients), Presence channels (for multiplayer avatar visibility), and Authentication services (for email/password registration and JWT token management).

The **Google Perspective API** is an external service that analyzes English-language text and returns probability scores across six toxicity attributes. It is called by the Backend during the moderation process and has a 4-second timeout to prevent blocking user submissions in case of service unavailability.

---

## 16. "Hybris" TYPO FIX (Page 21)

**Find:** "Hybris AI Content Moderation Engine"  
**Replace with:** "Hybrid AI Content Moderation Engine"

