# Decision Log — v1.2

| ID | Status | Decision | Notes |
|---|---|---|---|
| ADR-001 | APPROVED | Email/password authentication | No social login MVP; secure server sessions recommended |
| ADR-002 | APPROVED | Guest quota of at most 2 unique new lesson completions per Asia/Ho_Chi_Minh calendar day | Reopening or recompleting the same lesson that day does not consume another allowance; guest retention and account claim policy remain open. Not implemented. |
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
| ADR-015 | APPROVED — JPN-022 OWNER DIRECTION | Immutable relational publications and relational working drafts | The owner selected the V7 relational model on main and rejected the Hybrid JSONB Published Model in PR #26. V6 freezes reviewed Rights evidence; V7 makes Path eligibility set-based. This approves the technical architecture, not a syllabus or release of content. |
| ADR-016 | APPROVED — LEARNING EXPERIENCE V1 | Quiz pass score is at least 80%; retries are unlimited; later lessons remain accessible without completing every earlier lesson | Soft unlock does not settle quiz-to-lesson completion criteria or Chapter Review rules. These behaviors are not implemented. |
| ADR-017 | APPROVED — LEARNING EXPERIENCE V1 | Lesson completion and per-item mastery are separate; activities fit each lesson's objectives and content type | Do not require one fixed activity sequence for every lesson. Mastery levels and review algorithm remain open. These behaviors are not implemented. |

### ADR-015 technical rationale (approved architecture)

Two publication approaches were evaluated: (A) immutable relational revisions with version-pinned joins; (B) mutable relational editorial data plus frozen JSON publication snapshots and a dependency index. Both can isolate drafts and reconstruct published content. **A is owner-approved for JPN-022** because PostgreSQL can enforce pinned identity, order and reference existence with foreign keys and unique constraints. Its revisions and edges are sealed by triggers. Snapshot publications would require a document and dependency index to remain exactly synchronized. JPN-ARCH-002 separately prototyped JSONB *working drafts* with the same relational publications. They reduced reorder writes but introduced application-owned reference, ordering and key reconciliation checks; the net benefit was unproven. The owner declined the Hybrid JSONB Published Model in PR #26 and directed implementation against relational V7 on main. No source or migrations from PR #26 are part of this decision.

The public pointer changes only to a sealed revision of the same stable identity. Public reads use pinned revisions and live rights status, never working drafts. Rights revocation hides affected current and historical revisions from public reads without erasing permitted audit identities. V6 snapshots existing Rights evidence at upgrade and records later clearance transitions; reviewed provenance cannot be edited in place. V7 checks a pinned Path's dependency layers as sets. A 20-run local synthetic comparison measured Path eligibility p50/p95 of 525.313/598.901 ms before and 31.351/32.562 ms after; see the JPN-ARCH-002 note for limits. JPN-022 implements the operator pipeline against this baseline. Future JPN-032 attempts should record exact Lesson/Item revision keys; JPN-040 progress remains separate. External media bytes require immutable private object keys and access checks before delivery.

## PM proposals, not yet owner decisions
- Guest identity using server-issued opaque ID and secure cookie; account progress claim on signup.
- Historical proposal: Spring Boot 3.x / Java LTS, modular monolith, Flyway, OpenAPI. Current backend source uses Spring Boot 4.1.0 and Java target 21; OpenAPI is not present in current source.
- Any future HTTP operator API or public admin UI needs a separate decision; JPN-022 already uses an authenticated local CLI.
- MVP first content release limited to reviewed Hiragana and a small set of introductory lessons; scope must be explicitly approved before public launch.

## Open questions (do not silently decide)
1. Whether guest progress is durable or best-effort and its retention period.
2. Whether guest→account merge is mandatory for first public MVP and conflict policy.
3. Email verification/password reset at first beta versus later; associated email provider and cost.
4. First release minimum content quantity and rights-cleared audio/stroke assets.
5. Public beta date, target audience, performance budget, backup retention/RPO/RTO.
6. Final public domain, final logo asset and any legal/trademark checks; **product name Nichigo is approved**.
7. Quiz-to-Lesson and Chapter completion criteria, whether Chapter Review is required, and the per-item mastery/review policy. The approved 80% quiz pass score does not decide these rules.

## Change control
Product Owner approves product decisions, feature acceptance, release scope and spend. PM maintains PRD and backlog. Engineering may propose technical defaults but must flag material product/security/cost tradeoffs before implementation. Apply the feature workflow in ADR-012 without silently resolving the open questions above.
