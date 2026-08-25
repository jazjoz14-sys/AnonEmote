# AnonEmote QA Test Report

**Generated:** 2026-08-25T07:30:27.744Z
**Environment:** Windows_NT 10.0.26200 (x64)
**Node.js:** v24.16.0
**Platform:** win32

## Test Summary

| Metric | Value |
|--------|-------|
| Total Tests | 478 |
| Passed | 478 |
| Failed | 0 |
| Pass Rate | 100.0% |

## Results by Component

| Component | Passed | Failed | Total |
|-----------|--------|--------|-------|
| Moderation Engine | 238 | 0 | 238 |
| API Endpoints | 177 | 0 | 177 |
| Authentication | 7 | 0 | 7 |
| Rate Limiting | 15 | 0 | 15 |
| Graceful Degradation | 41 | 0 | 41 |

## Known Limitations

### Moderation Engine (Layer 3)

**Issue:** Google Perspective API daily quota limit

**User Impact:** When quota is exhausted, English toxicity detection falls back to local keyword list with lower accuracy

**Mitigation:** Local English profanity fallback list activates automatically; no user-facing error

### Backend Hosting

**Issue:** Render free tier cold start (~30-50s after 15min inactivity)

**User Impact:** First request after idle period experiences significant latency; users may perceive the app as broken

**Mitigation:** Frontend displays loading indicator; backend responds once warm; subsequent requests are fast

### Real-time Features

**Issue:** Supabase Realtime WebSocket reconnection after disconnect

**User Impact:** Users may miss new posts/reactions during brief disconnection windows (typically <5s)

**Mitigation:** Supabase client auto-reconnects with exponential backoff; manual refresh available

### Moderation Engine (Layer 2)

**Issue:** Filipino vernacular lexicon coverage is not exhaustive

**User Impact:** Novel slang or regional dialects beyond Tagalog/Bicolano may bypass vernacular detection

**Mitigation:** Admin lexicon editor allows dynamic addition of new terms; Perspective API provides secondary coverage for English

### Drawing Feature (Doodle Planet)

**Issue:** No AI-based image content moderation

**User Impact:** Inappropriate drawings cannot be automatically detected; relies on community reporting

**Mitigation:** Report system with manual review queue; admin can remove flagged content

## Graceful Degradation Scenarios

| Scenario | Expected Behavior | Actual Behavior |
|----------|-------------------|-----------------|
| Perspective API Unavailability | System falls back to local English profanity list; moderation continues without error to user | Fallback activates within <100ms; verdict returned with layer "english-fallback"; no 5xx error exposed |
| Render Backend Cold Start (~30-50s) | Frontend shows loading state; backend eventually responds normally once process spins up | Express server initializes on first request; subsequent requests respond in <200ms; no data loss |
| Supabase Realtime Disconnection | Client auto-reconnects with exponential backoff; missed messages retrieved on reconnect | Supabase JS client handles reconnection automatically; presence channel rejoins; posts sync on reconnect |
| Database Unreachable (Lexicon Read) | Serve lexicon from in-memory cache or local file fallback; moderation continues | Cached lexicon served immediately; DB retry scheduled after 5min; no user-visible degradation |
| Database Unreachable (Audit Write) | Audit entries written to local JSONL file asynchronously; no blocking of user request | Async write to data/audit-log.jsonl; response latency unaffected; entries synced when DB recovers |

---

*Report generated automatically by QAReporter on 2026-08-25T07:30:27.744Z*
