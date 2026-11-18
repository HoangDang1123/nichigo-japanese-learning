# JPN-011 — Guest Foundation Backend Implementation

**Status:** Backend implemented, tested on its branch, and **merged via PR #35** (`e0c04b9` on `main`). Not deployed or released. This note records backend scope only: Guest identity/session, the daily Lesson unlock quota and the Skills bookmark quota exist in the backend. Frontend Guest integration is not done, production cookie/deployment topology is not verified, and JPN-012 Guest-to-Account claim remains undecided. JPN-011 is not an end-to-end complete feature. The Verification section below is historical branch-era evidence, not rerun for this documentation update.

## Implemented scope

- `POST/GET /api/v1/guest/session`, `POST /api/v1/guest/activity`, and `GET /api/v1/guest/quota` follow the [approved technical contract](JPN-011-guest-foundation-contract.md). A 256-bit random bearer credential is sent only in the HttpOnly `NICHIGO_GUEST` cookie; PostgreSQL stores its SHA-256 verifier. The cookie is scoped to `/api/v1`, with environment-configurable `Secure`, `SameSite`, and optional domain. It is independent of the 30-minute Auth/CSRF `SESSION`.
- Validated, active-use signals use server time. The first signal persists immediately, subsequent writes are throttled for five minutes, and the conservative cutoff is 90 days plus the five-minute precision margin from the last persisted activity. An expired credential cannot revive the Guest. A scheduled cleanup removes expired Guest rows and cascades their JPN-011 unlock/bookmark rows; its initial delay and interval default to one hour and can be configured with `nichigo.guest.cleanup.initial-delay-ms` and `nichigo.guest.cleanup.interval-ms`. Background requests, CSRF bootstrap, and idle tabs do not update activity automatically.
- `GET /api/v1/lessons/{slug}/access` and its Path-placement variant return actor-specific access without full Lesson content. Their `POST .../unlock` variants atomically persist one unlock per Guest and stable Lesson identity, with two new Lessons per `Asia/Ho_Chi_Minh` day. Repeated unlocks are idempotent. Both existing full Lesson GET routes now require that unlock for a Guest. Authenticated Users read eligible Lessons without a Guest quota. Public Path metadata and eligible Skills lists stay public.
- Skills bookmark PUT/DELETE/GET, list, and summary use canonical Item IDs. Guest capacity is 20 saved Items across all Skills; Users have no product cap. Guest/User row locks serialize quota mutations. Unavailable saved Items still count and appear with only `itemId`, `saved`, and `availability`, allowing Unsave without exposing their content or private Rights data.
- Full Lesson, Path, Skills, and bookmark read responses use `Cache-Control: no-store`. New content-bearing requests recheck live publication and Rights eligibility; previously downloaded bytes cannot be recalled.

## Persistence and security

Flyway [V9](../../nichigo_backend/src/main/resources/db/migration/V9__guest_foundation.sql) adds `guest_identities`, `guest_lesson_unlocks`, and `skill_bookmarks`. Unique keys protect stable Lesson unlocks and actor-specific bookmarks. Guest row locks serialize unlock and bookmark capacity; User row locks serialize User bookmark mutations. CSRF remains required for every state-changing route, including Guest initialization, activity, unlock, save, and Unsave. Authenticated User identity takes precedence over a stale Guest cookie. Error responses retain the flat `{code,message}` shape. No Guest ID, bearer credential, Rights evidence, or private storage key is returned in JSON.

## Verification

- `mvnw.cmd -q -DskipTests compile` — passed with Java 25.0.4.1.
- `mvnw.cmd -q -DskipTests test-compile` — passed.
- `mvnw.cmd -q test` — passed on an isolated PostgreSQL 17 UTF-8 schema after Flyway applied V1–V9. The complete backend suite covers existing Auth, public content, Rights, import, and JPN-011 integration cases. JPN-011 tests use a controlled clock for retention and Vietnam-day boundaries and concurrent requests for both quotas.

The test database was local and disposable. Production deployment, frontend activity signaling, browser cookie behavior across deployed origins, and media delivery are not verified. Guest-to-Account claim/merge remains **PENDING OWNER DECISION**. JPN-012, JPN-032 Assessment, JPN-040 completion/mastery, and JPN-051 rate limiting are outside this implementation.
