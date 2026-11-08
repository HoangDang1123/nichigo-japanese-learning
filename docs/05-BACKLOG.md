# Implementation-ready Backlog — v1.2

**Priority:** P0 release gate; P1 after vertical slice. **Estimate:** indicative person-days, not calendar commitments. Owner approval needed for open product decisions. The ticket table preserves historical IDs, dependencies, and acceptance criteria; future delivery is organized by user-facing feature below.

| Ticket | P | Estimate | Depends on | Deliverable / acceptance |
|---|---|---:|---|---|
| JPN-001 | P0 | 1–2d | — | Monorepo, Next.js/Spring Boot scaffolds, formatting, README, env examples, CI checks |
| JPN-002 | P0 | 2–3d | 001 | Neon connection config, Flyway baseline, core schema, constraints; migration tests |
| JPN-003 | P0 | 2–3d | 001,UI-001,UI-002 | Shared UI shell, mobile nav, empty/loading/error states, basic a11y using approved design system |
| JPN-UI-001 | P0 | 2–3d | 001 | Central CSS semantic color tokens + Light/Dark/System theme provider/switcher, local persistence, OS sync, no theme flash, a11y |
| JPN-UI-002 | P0 | 2–3d | UI-001 | Modern Japanese Learning Studio design foundation: typography, spacing, fine borders, buttons/inputs/cards/dialog/tooltip/progress, visual review in both themes |
| JPN-UI-003 | P0 | Scope by loading boundary | JPN-003,UI-001,UI-002 | Reusable semantic skeleton primitives and responsive compositions for genuine initial data loading; preserve empty/error states, reduced motion and shared shell |
| JPN-010 | P0 | 3–5d | 002 | Email/password register/login/logout, secure session, negative auth tests |
| JPN-011 | P0 | 3–4d | 002 | Guest ID + daily unique-lesson quota, transactional concurrency tests; numeric limit config only pending approval |
| JPN-012 | P0* | 2–3d | 010,011 | Guest progress claim on signup, conflict-safe idempotent merge; *release gate pending owner decision* |
| JPN-020 | P0 | 2–3d | 002 | Learning path, lesson, canonical skill content schema; draft/published visibility |
| JPN-021 | P0 | 2–3d | 020 | CSV/JSON schemas, validator, dry-run, row errors and tests |
| JPN-ARCH-002 | P0 | Evidence-based | 020,021 | Preserve reviewed Rights evidence, optimize pinned Path eligibility, compare relational and JSONB drafts; retain production publishing for JPN-022 |
| JPN-022 | P0 | 2–4d | 021,ARCH-002 | Idempotent import batches, operator audit/provenance, publish command and tests |
| JPN-023 | P0 | 2–4d | 022 | Rights-reviewed introductory content seed and N5 tags, sample lesson rendered |
| JPN-030 | P0 | 3–4d | 003,020 | Ordered beginner path + free skill directory; both reachable from home |
| JPN-031 | P0 | 2–3d | 003,030 | Lesson reader for kana, vocab, grammar; pronunciation/writing assets only where available |
| JPN-032 | P0 | 4–5d | 020,031 | MCQ/fill-in server-graded quiz, explanations, validation, attempt tests |
| JPN-033 | P1 | 2–3d | 032,040 | Basic flashcard/review entry point; shared content references |
| JPN-034 | P0 | 2–4d | 003,030 | Element-level spotlight tour with arrow, Back/Next/Skip, progress, replay; mobile/a11y/missing-target tests |
| JPN-040 | P0 | 2–3d | 010,011,032 | Lesson progress, idempotent completion, quota integration, persistence tests |
| JPN-041 | P0 | 2–3d | 040 | Dashboard resume/progress, consistency across path and skills |
| JPN-050 | P0 | 2–3d | 001,002 | Vercel/Render/Neon deployment, secrets, Flyway, health checks, smoke test |
| JPN-051 | P0 | 2–4d | 050 | Security hardening, CORS/CSRF/session, logs, DB export/restore runbook |
| JPN-052 | P0 | 3–4d | all P0 | E2E vertical slice incl guest→account, quota, tour skip, mobile, cold-start handling |

## Feature roadmap (planning grouping)

Future branches must follow the [Git Branch Naming Convention in root AGENTS.md](../AGENTS.md#git-branch-naming-convention): `jpn-<ticket-id>/features/frontend-<feature-slug>` or `backend-<feature-slug>`, with `fullstack-<feature-slug>`, `chore/<task-slug>` and `docs/<task-slug>` where appropriate. Use an existing ticket ID and lowercase kebab-case slugs. Separate FE/BE branches still deliver one complete feature: record their integration plan, compatible API contracts and joint verification before feature acceptance. A finished frontend branch alone does not complete the feature. Historical branches retain their names; all branch operations require explicit owner authorization. If a task spans multiple features, stop and resolve its scope before implementation.

The Product Owner approved **feature-based, end-to-end delivery**. Each feature goes through requirements, impact analysis, a plan for the layers it needs, implementation, integration, tests, visual review when relevant, documentation, owner approval, and merge. A feature may span several legacy tickets; a ticket may support several features. The grouping, sequencing, and proposed acceptance summaries below are planning aids, **not new approval of release scope or unresolved product rules**. Keep the original ticket IDs and dependencies above as traceability.

| Feature group / related tickets | Objective | Layers needed | Dependencies | Acceptance focus | Verified status in source and Git (2026-11-07) | Remaining work |
| --- | --- | --- | --- | --- | --- | --- |
| **Foundation and AppShell** — JPN-001, JPN-002, JPN-003, JPN-UI-001, JPN-UI-002, JPN-UI-003 | Establish runtime, database baseline, semantic themes, shared navigation, UI states and loading infrastructure. | FE, BE bootstrap, DB migrations, CI, docs | JPN-001 → UI-001/002 and JPN-002 → JPN-003; UI-003 follows the shared shell. | Responsive, keyboard-accessible shell and theme states; genuine initial loading uses accessible, reduced-motion skeletons without hiding empty/error results. | Bootstrap, V1 baseline, theme tokens, UI primitives and refined shell are merged in `origin/main`; JPN-UI-003 skeleton source is merged in `origin/main` via PR #23; automated and visual checks are recorded in its implementation note. | Complete future loader transition checks when those integrations exist; no release is evidenced for UI-003. |
| **Authentication** — JPN-010 | Register, log in, restore session and log out across UI and API. | FE, BE, API, DB V2/V3, security tests, docs | JPN-002; shared shell for account controls | Secure session/CSRF, validation, negative cases and cross-origin behavior. | FE/BE source and auth migrations are merged in `origin/main`; automated results are recorded in JPN-010 notes. No release is evidenced. | Rate limiting, deployment cookie/CORS review, browser QA and release sign-off. |
| **Guest Experience** — JPN-011, JPN-012, JPN-034 | Let guests explore, learn within an approved quota, take or skip a spotlight tour, and optionally claim progress. | FE, BE, API, DB, integration tests | JPN-003, JPN-010, learning content/progress; JPN-012 still conditional | Transactional unique-lesson quota, accessible tour, approved claim/conflict behavior if included. | No guest identity, quota, tour or claim implementation in current source. | Approve quota count and claim policy; implement and verify the integrated flow. |
| **Learning Content** — JPN-020, JPN-021, JPN-ARCH-002, JPN-022, JPN-023 | Model, validate, import, review and publish reusable introductory/N5 content. | BE, DB, API/import tooling, FE rendering, content review | JPN-002; rights and language review | Drafts hidden, stable references, dry-run errors, idempotent import and rights-cleared sample. | JPN-020, JPN-021 and JPN-ARCH-002 are merged in `origin/main`; ADR-015 relational V7 is owner-approved. JPN-022 operator pipeline is implemented on a review branch with synthetic PostgreSQL verification; PR and owner review are pending. No reviewed production lesson data exists. | Complete JPN-022 review and CI, then JPN-023 reviewed content and frontend integration. The Learning Content feature is not complete. |
| **Learning Path and Courses** — JPN-030 with JPN-020/JPN-023 | Present an ordered beginner journey and course chapters using published content. | FE, BE, API, DB, docs | JPN-003 and content model/publication | Deterministic order, reachable path and released course content. | `/learn` has an owner-approved Railway UI preview with generic station variants and honest empty data panels; no published path or learner progress is connected. `/courses` remains an unavailable proposal. | Approve course scope and integrate published content and verified progress; do not treat the preview as a complete path. |
| **Lesson Experience** — JPN-031, JPN-032 | Read lessons and complete graded exercises, including focused writing when approved assets exist. | FE, BE, API, DB, test/content review | JPN-020, JPN-030, JPN-003 | Accurate content, accessible reader, server grading, feedback and available licensed media. | No lesson reader, focus lesson, quiz or grading endpoint in current source. | Implement a reviewed vertical slice and verify responsive/theme behavior. |
| **Learning Progress and Home Study Desk** — JPN-040, JPN-041 | Persist completion and show a useful next step on Home and progress. | FE, BE, API, DB, integration tests | JPN-010/011/032; JPN-012 if claim is approved | Idempotent completion, consistent resume/progress and truthful user-specific data. | `/` has a Study Desk presentation with auth-aware empty states and a typed interface for future verified progress; `/progress` is an empty state. No learning progress API/schema. JPN-041 is not complete. | Approve Study Desk data needs and implement persistence, resume and personalization. |
| **Skills and Practice** — JPN-030, JPN-033 with JPN-020/032 | Browse released skills freely and practice through shared content. | FE, BE, API, DB, content/tests | Content model, quiz/progress for review | Skills reachable without path gating; practice uses shared items and records real results. | `/skills` is an empty state; no flashcard or review flow. | Implement directory and supported practice; JPN-033 remains P1. |
| **Mini Games** — no dedicated legacy ticket; concept only | Explore game-specific learning formats. | FE, content, and BE/API/DB only if progress/scoring needs them | Reviewed content and core lesson slice | Scope and outcomes must be approved before acceptance criteria are fixed. | `/games` is an unavailable navigation proposal; no game screen exists. | Owner to approve release scope and feature ticket before implementation. |
| **Profile and Settings** — JPN-010 is an auth dependency, not a profile ticket | Show supported identity/activity and preferences/account controls. | FE; BE/API/DB only for persisted profile or account changes | Authentication, real progress data, existing theme system | Accurate identity/activity and working controls for supported settings. | Account menu and theme switcher exist; `/profile` and `/settings` are unavailable proposals. | Approve fields, password/account scope and persistence; implement dedicated screens only then. |
| **Deployment and Release** — JPN-050, JPN-051, JPN-052 | Ship and operate the complete vertical slice. | FE, BE, DB, infra, security, E2E, docs | All required P0 features; JPN-012 only if approved | End-to-end guest→lesson→quiz→account→resume, secure hosting, backup/restore and sign-off. | CI configuration exists; no deployment or release evidence in repository. | Decide release scope, verify hosting/security and complete the release checklist. |

**Primary legacy mapping:** JPN-001/002/003 and JPN-UI-001/002/003 → Foundation and AppShell; JPN-010 → Authentication; JPN-011/012/034 → Guest Experience; JPN-020/021/022/023 → Learning Content; JPN-030 → Learning Path and Courses; JPN-031/032 → Lesson Experience; JPN-033 → Skills and Practice; JPN-040/041 → Learning Progress and Home Study Desk; JPN-050/051/052 → Deployment and Release. Cross-feature uses are shown in the roadmap; Mini Games and Profile and Settings have no dedicated historical ticket. Do not assign them a new JPN ID without an approved scope.

Status terms are separate: **implemented** means source exists; **tested** names checks actually run; **reviewed** names the review scope; **merged** requires Git history on the target branch; **released** requires deployment and release checks. A visually approved sidebar does not by itself complete JPN-003.

## Historical ticket build sequence (retained for traceability)
M1: 001,UI-001,UI-002,002,003 → M2: 010,011,020 → M3: 021,022,023,030,034 → M4: 031,032,040,041 → M5: 050,051,052. JPN-012 timing depends on owner approval; if approved for first beta, add before JPN-052.

### JPN-UI-001 — Theme infrastructure
**Story:** as a learner, I can choose Light, Dark or System and get a consistent, readable interface. **AC:** central semantic CSS tokens (not scattered hardcoded colors); default System; explicit preference persisted; System reacts to OS changes; no initial wrong-theme flash or hydration warning; keyboard-accessible selector; examples document how to recolor; light/dark coverage for foundational components.

### JPN-UI-002 — Visual design foundation
**Story:** as a learner, I recognize Nichigo as a distinctive Japanese learning environment rather than a generic dashboard. **AC:** implement typography suitable for Vietnamese/Japanese; spacing/radius/borders and baseline input/button/dialog/tooltip/progress states; reviewed desktop/mobile in light and dark; editorial and subtle brush/stamp accents used sparingly; no repeated hero/gradient/glass-card layout pattern. Follow `docs/07-DESIGN-SYSTEM.md`. Do not build full product screens or invent logo assets.

## Ticket definition of ready
- One user story, scope and exclusions.
- API/data contract links and dependencies.
- Exact acceptance scenarios and negative cases.
- Test expectations and demo steps.
- Open decisions clearly marked; agent cannot resolve business policy by assumption.

## Definition of done
Reviewed diff; lint/build/tests green; no hard-coded secrets; migrations safe; empty/loading/error states; accessibility for touched UI; docs updated; acceptance scenarios manually checked; PM/owner approval to close ticket.

## First 3 tickets (expanded)
### JPN-001 — Repository bootstrap
**Story:** as developer, I can start frontend/backend locally using documented commands. **AC:** both compile; CI runs FE lint/typecheck and BE tests; `.env.example` contains names but no credentials; README covers prerequisites and startup; no unrelated product logic.

### JPN-002 — Database baseline
**Story:** as backend developer, I can migrate a fresh Neon-compatible PostgreSQL database. **AC:** Flyway applies from zero; second run is no-op; unique constraints documented; secrets via env; testcontainers/local DB test where feasible; rollback plan noted.

### JPN-034 — Spotlight onboarding
**Story:** as a first-time visitor, I can discover primary controls without reading a manual. **AC:** dark overlay and isolated target; anchored arrow accurately points to control; progress/step; Back/Next/Skip/Finish; keyboard navigation and focus; no repeated auto-launch after skipped/completed; replay; gracefully handles absent element and viewport resize.
