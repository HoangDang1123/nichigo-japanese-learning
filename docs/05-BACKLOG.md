# Implementation-ready Backlog — v1.2

**Priority:** P0 release gate; P1 after vertical slice. **Estimate:** indicative person-days, not calendar commitments. Owner approval needed for open product decisions. Ticket can be assigned to Antigravity only with bounded scope and tests.

| Ticket | P | Estimate | Depends on | Deliverable / acceptance |
|---|---|---:|---|---|
| JPN-001 | P0 | 1–2d | — | Monorepo, Next.js/Spring Boot scaffolds, formatting, README, env examples, CI checks |
| JPN-002 | P0 | 2–3d | 001 | Neon connection config, Flyway baseline, core schema, constraints; migration tests |
| JPN-003 | P0 | 2–3d | 001 | Shared UI shell, mobile nav, empty/loading/error states, basic a11y |
| JPN-010 | P0 | 3–5d | 002 | Email/password register/login/logout, secure session, negative auth tests |
| JPN-011 | P0 | 3–4d | 002 | Guest ID + daily unique-lesson quota, transactional concurrency tests; numeric limit config only pending approval |
| JPN-012 | P0* | 2–3d | 010,011 | Guest progress claim on signup, conflict-safe idempotent merge; *release gate pending owner decision* |
| JPN-020 | P0 | 2–3d | 002 | Learning path, lesson, canonical skill content schema; draft/published visibility |
| JPN-021 | P0 | 2–3d | 020 | CSV/JSON schemas, validator, dry-run, row errors and tests |
| JPN-022 | P0 | 2–4d | 021 | Idempotent import batches, audit/provenance, publish command and tests |
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

## Recommended build sequence
M1: 001,002,003 → M2: 010,011,020 → M3: 021,022,023,030,034 → M4: 031,032,040,041 → M5: 050,051,052. JPN-012 timing depends on owner approval; if approved for first beta, add before JPN-052.

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
