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
| ADR-009 | APPROVED | Centralized CSS semantic theme tokens + Light/Dark/System | Default System, persist selection, avoid theme flash |
| ADR-010 | APPROVED | Modern Japanese Learning Studio art direction | Japanese editorial + restrained calligraphy + education-first, avoid generic AI dashboards |
| ADR-011 | APPROVED | Product name Nichigo | Final logo asset/domain remain separately reviewable |
| ADR-012 | APPROVED | Deliver future work by end-to-end user-facing feature | Plan and verify only the FE, BE, API, DB, tests and docs a feature needs. Preserve legacy JPN ticket IDs/dependencies as traceability; follow the workflow in root `AGENTS.md`. |
| ADR-013 | APPROVED CONCEPT | Screen composition direction in `docs/07-DESIGN-SYSTEM.md` | Shared shell, Study Desk, Railway Journey, Chapter Canvas, Notebook/Focus Lesson, Skills, game layouts, Profile and Settings are concepts. This does not approve every screen for MVP or mark it implemented. |
| ADR-014 | APPROVED | Nichigo Hybrid learning direction | Balance practical communication inspired by Irodori with systematic Japanese knowledge/JLPT preparation informed by Minna no Nihongo. Both are reference frameworks, not content to copy. The hierarchy, syllabus and Railway station granularity in `docs/04-CONTENT-AND-LEARNING.md` remain proposals or open decisions. |
| ADR-015 | PROPOSED — OWNER REVIEW | JPN-020 immutable relational content revisions | Source merged in `origin/main` implements stable editorial identities, sealed Path/Lesson/Item/Media revisions, version-pinned relational references and published-only reads. The merge does not approve this ADR, a syllabus, Course entity, Railway station size, unlock rule or production publishing workflow. Review the implementation note and constraints before accepting this technical ADR. |

### ADR-015 technical rationale (proposed)

Two approaches were evaluated: (A) immutable relational revisions with version-pinned joins; (B) mutable relational editorial data plus frozen JSON publication snapshots and a dependency index. Both can isolate drafts and reconstruct published content. **A is selected for this implementation** because PostgreSQL can enforce the pinned parent/child identity, ordering and reference existence with ordinary foreign keys and unique constraints. Its revision rows and join rows are sealed against mutation by database triggers. B would require the snapshot document and dependency index to remain exactly synchronized, with additional trigger/validator logic and larger duplicated payloads. A uses more small tables and several joins; neither approach has a measured latency advantage at this stage.

The public pointer changes only to a sealed revision of the same stable identity. Public reads use pinned revisions and live rights status, never working drafts. Rights revocation hides affected current and historical revisions from public reads without erasing permitted audit identities. Concurrent production publishing, import idempotency, reviewed payload validation and operator authorization remain JPN-021/JPN-022 responsibilities; JPN-020 supplies the database constraints and transaction boundaries they require. Future JPN-032 attempts should record exact Lesson/Item revision keys; JPN-040 progress remains separate from content revisions. External media bytes require immutable private object keys and access checks before delivery. ADR-015 is **not approved** merely because its source exists.

## PM proposals, not yet owner decisions
- Guest quota default **2 unique lessons per day**, reset at 00:00 Asia/Ho_Chi_Minh.
- Guest identity using server-issued opaque ID and secure cookie; account progress claim on signup.
- Historical proposal: Spring Boot 3.x / Java LTS, modular monolith, Flyway, OpenAPI. Current backend source uses Spring Boot 4.1.0 and Java target 21; OpenAPI is not present in current source.
- Import available via secured CLI/internal endpoint rather than public admin UI.
- MVP first content release limited to reviewed Hiragana and a small set of introductory lessons; scope must be explicitly approved before public launch.

## Open questions (do not silently decide)
1. Exact guest daily quota count; whether guest progress is durable or best-effort and retention period.
2. Whether guest→account merge is mandatory for first public MVP and conflict policy.
3. Email verification/password reset at first beta versus later; associated email provider and cost.
4. First release minimum content quantity and rights-cleared audio/stroke assets.
5. Public beta date, target audience, performance budget, backup retention/RPO/RTO.
6. Final public domain, final logo asset and any legal/trademark checks; **product name Nichigo is approved**.

## Change control
Product Owner approves product decisions, feature acceptance, release scope and spend. PM maintains PRD and backlog. Engineering may propose technical defaults but must flag material product/security/cost tradeoffs before implementation. Apply the feature workflow in ADR-012 without silently resolving the open questions above.
