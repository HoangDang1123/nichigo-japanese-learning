# Decision Log — v1.2

| ID | Status | Decision | Notes |
|---|---|---|---|
| ADR-001 | APPROVED | Email/password authentication | No social login MVP; secure server sessions recommended |
| ADR-002 | APPROVED | Guest quota by day and number of unique completed lessons | Exact count **OPEN**; prior PM proposal 2/day is NOT approved |
| ADR-003 | APPROVED | Release only N5-related content first | May ship partial N5 curriculum; beginner intro precedes it |
| ADR-004 | APPROVED | CSV/JSON content import pipeline; no CMS | Validation, dry-run, provenance, publish |
| ADR-005 | APPROVED | Vercel Free (Next.js) + Render Free (Spring Boot) + Neon Free (PostgreSQL) | No Render Free PostgreSQL for durable data |
| ADR-006 | APPROVED | Default guided learning path + free skill browsing | Shared content/progress model |
| ADR-007 | APPROVED | Onboarding as spotlight element tour | Dim overlay, anchored arrow, Back/Next/Skip, progress, replay |
| ADR-008 | APPROVED | Learn-by-building product approach | Personal journey is hypothesis source, not expert-certified pedagogy |

## PM proposals, not yet owner decisions
- Guest quota default **2 unique lessons per day**, reset at 00:00 Asia/Ho_Chi_Minh.
- Guest identity using server-issued opaque ID and secure cookie; account progress claim on signup.
- Spring Boot 3.x / Java LTS, modular monolith, Flyway, OpenAPI.
- Import available via secured CLI/internal endpoint rather than public admin UI.
- MVP first content release limited to reviewed Hiragana and a small set of introductory lessons; scope must be explicitly approved before public launch.

## Open questions (do not silently decide)
1. Exact guest daily quota count; whether guest progress is durable or best-effort and retention period.
2. Whether guest→account merge is mandatory for first public MVP and conflict policy.
3. Email verification/password reset at first beta versus later; associated email provider and cost.
4. First release minimum content quantity and rights-cleared audio/stroke assets.
5. Public beta date, target audience, performance budget, backup retention/RPO/RTO.
6. Product brand/domain name (working name only until approved).

## Change control
Product Owner approves product decisions and spend. PM maintains PRD and backlog. Engineering may propose technical defaults but must flag material product/security/cost tradeoffs before implementation.
