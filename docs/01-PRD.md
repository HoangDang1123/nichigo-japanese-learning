# Product Requirements Document — v1.2

## 1. Product overview
A Vietnamese-first Japanese learning website for absolute beginners, with a gradual path toward JLPT N5. Built iteratively by a founder learning Japanese from zero: personal learning experience generates UX hypotheses, while language facts must be checked against credible sources. Do not claim expert-certified curriculum or guaranteed JLPT results.

**Goals:** clear next step for a new learner; freely browse skills; practice with feedback; save learning progress; ship a real, maintainable MVP.

**Personas:** (1) new Vietnamese learner with no kana knowledge; (2) returning beginner reviewing specific skills; (3) guest exploring before registering.

## 2. Approved experience
- **Default path:** Learn from zero → introductory pronunciation/kana → basic sentences → foundational N5 knowledge → N5 review. Order is provisional, iteratively refined.
- **Free exploration:** Vocabulary, Grammar, Hiragana/Katakana, Kanji, Writing, Listening, Flashcards as available; not gated behind path completion.
- **Single source of truth:** lesson and free-practice views reference shared content items; learning attempts/progress are linked to user or guest identity.
- **Onboarding:** guided *element-level spotlight tour*, not a welcome questionnaire. Dim page; highlight the exact target control/input; anchored popover with arrow; Back/Next/Skip/Finish; step number and progress; responsive placement, keyboard support, skip at any time; reopen from Help. Avoid blocking app when target missing or route changes.
- **Beginner-first content:** first usable vertical slice focuses on Hiragana recognition, sound, stroke guidance (where licensed/verified assets exist), quiz, and persisted progress.

## 2A. Approved visual identity and theme requirements
- **Product name:** Nichigo. Do not use “Japanese Learning Web” as the outward-facing brand label; logo/domain final assets remain separately reviewable.
- **Visual direction:** “Modern Japanese Learning Studio”: modern education + Japanese editorial/bookish typography + restrained shodō/calligraphy accents. Content-first screens rather than generic AI/SaaS dashboards.
- **Initial palette:** sage green / warm cream / dark ink / small amber accents; color palette must remain easy to change.
- **Theme system:** centralized semantic CSS color tokens; Light, Dark and System modes, default System; save preference locally; follow OS changes for System; avoid wrong-theme flash/hydration mismatch.
- **All UI states:** navigation, lessons, quiz, inputs, modal, spotlight tour and feedback states must work in both effective light/dark themes, responsive and accessible.
- **Design quality:** avoid excessive gradients, glass effects, large repeated rounded cards, shadows and decorative icons. Use Japanese-inspired editorial detail sparingly, never at the expense of legible kana/kanji glyphs.
- **Reference:** `docs/07-DESIGN-SYSTEM.md` defines tokens, style principles and UI acceptance checks.

## 3. User journeys
**Guest:** land on home → spotlight tour (or skip) → see default beginner path → open a published lesson → practice → see feedback and daily lesson allowance → sign up to retain progress.

**Registered learner:** register/login with email and password → choose path or free practice → learn and quiz → see dashboard and continue where left off.

**Returning learner:** login → resume lesson or select a skill → review previously learned items → progress remains consistent across views.

**Content operator:** prepare validated CSV/JSON → preview dry-run errors → import idempotently → review provenance → publish selected N5 items; no CMS UI required.

## 4. MVP scope (P0)
- Responsive Vietnamese UI; navigation, error/loading/empty states.
- Email/password register/login/logout, password hashing and server authorization.
- Guest identity and backend-enforced daily completed-lesson quota (exact count pending owner approval).
- Guided spotlight tour and ability to replay; guest persistence best effort, account persistence durable.
- Learning path and ordered lessons; free skill browsing of released content.
- Hiragana/kana foundational learning with character recognition, pronunciation/audio where sourced, writing/stroke guide where available.
- Vocabulary/grammar lesson content and basic quiz (multiple choice and fill-in); clear correction/explanations.
- Persist attempts, lesson progress, completion and basic dashboard.
- CSV/JSON content import with validation, dry run, idempotency, draft/publish and provenance.
- N5 content only in released MVP; published content may be a subset of N5, not a full N5 syllabus.
- Deployment Vercel Free + Render Free + Neon Free, monitoring basics and backup/export runbook.

## 5. Conditional / post-MVP
- Extensive handwriting recognition, AI pronunciation scoring, full JLPT mock exam, advanced SRS algorithm, gamification, leaderboard, payments, social login, full CMS, N4–N1 published content.
- Games and rich writing exercises can be added after the first learning vertical slice; do not promise them in the first release without a new scope decision.

## 6. Core functional requirements & acceptance
**FR-01 Discovery:** first-time users see a clear primary CTA for beginner path and access to skills. Acceptance: path and skills both reachable in <=2 interactions from home.

**FR-02 Spotlight tour:** overlay dims surroundings, target remains visible, arrow points to real DOM element; Back/Next/Skip/Finish; step count/progress; first step has Back disabled/hidden; last step shows Finish; target not found → skip step or gracefully close with no trap; replay available. Acceptance: desktop/mobile + keyboard + reduced motion verified; skipped/completed tour not auto-shown on every return.

**FR-03 Auth:** email/password registration, login, logout, protected progress. Acceptance: duplicate email, wrong password, session expiry and logout handled; no password plaintext stored.

**FR-04 Guest quota:** quota by local calendar day (Asia/Ho_Chi_Minh) and unique lesson completions, enforced on backend transactionally. Acceptance: re-opening/completing same lesson on same day does not double count; parallel completions cannot exceed quota; over-quota returns typed error; user sees remaining allowance. Exact numeric default is **not approved**.

**FR-05 Content:** published path/lesson and skill catalogs; draft content invisible to public. Acceptance: path order deterministic; content reused without duplicate canonical records.

**FR-06 Learning:** lessons show suitable segments (not all skills mandatory), exercises graded server-side, feedback shown. Acceptance: submitted answers have stable question IDs, no client-authoritative scoring.

**FR-07 Progress:** completed lesson and quiz attempt persisted; resume and dashboard. Acceptance: progress survives refresh/login and is consistent between path and skills.

**FR-08 Import:** schema validation, dry-run report, import batch, idempotent upsert by stable key, provenance and publish gate. Acceptance: malformed row doesn't silently publish; rerun same batch doesn't duplicate.

**FR-09 Operational:** HTTPS API, migrations, env secrets, error logging, documented export/restore. Acceptance: cold-start loading state; no secrets in client bundle.

## 7. Nonfunctional requirements
- Mobile-first, accessible controls, keyboard-navigable tour, focus management.
- Theme switching: light/dark/system, persisted preference, reduced motion and sufficient color contrast; no UI theme flash.
- Security: input validation, password hash (Argon2id/bcrypt), secure sessions, rate limiting, CSRF/cookie/CORS strategy.
- Privacy: collect minimal data, no sensitive telemetry by default.
- Reliability: idempotent mutations, graceful backend/database cold starts; do not promise an SLA on free plans.
- Maintainability: modular monolith, typed API contracts, Flyway migrations, tests in CI.

## 8. Success indicators (initial instrumentation, no invented targets)
First lesson started/completed, tour completed/skipped, guest→signup conversion, lesson return rate, quiz completion, error rate and API cold-start experience. Baselines and numerical targets are **TBD after real use**.

## 9. Release definition
Release a complete vertical slice: new visitor → spotlight or skip → first Hiragana lesson → quiz → guest quota enforcement → account signup → saved progress → return and resume. Content must be reviewed for correctness and rights.

## 10. Out-of-scope / constraints
No expert-certification claim. No unrestricted scraping/copying of textbook content. No real user data on ephemeral databases without export/restore plan. Owner approves any paid plan or significant scope change.
