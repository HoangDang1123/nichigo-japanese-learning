# Product Owner Decision Gate

The Product Owner (PO) has the final say on NichiGo. Never pick an unapproved option that materially affects the product, data, architecture, UX, security or operations, even to finish faster. `BLOCKED — AWAITING PRODUCT OWNER DECISION` is a valid outcome. Silence is not approval. Procedure: [WORKFLOW §2](../../docs/orchestration/WORKFLOW.md).

## Always ask the PO before deciding
- **UI/UX:** layout, navigation, component behaviour, theme, colours, typography, responsive behaviour, animation, loading/empty/error states, modals, feedback, any deviation from approved design. Approved UI is an experience contract.
- **Business logic:** lesson completion, XP, level, achievements, streak, scoring, retry, unlock, Guest quota, progress, resume.
- **Learning experience:** path, lesson structure, quiz types, SRS, flashcards, difficulty, Kanji/Vocabulary/Grammar progression, Irodori mapping, Lesson vs Skills, wrong-answer handling.
- **Schema / data model:** tables, columns, constraints, Flyway migrations, revision lifecycle, retention, deletion, data migration, progress/attempt storage.
- **API contract:** endpoints, payloads, DTOs, error codes, pagination, versioning, auth requirements, compatibility.
- **Architecture:** module boundaries, major libraries, storage, cache, jobs, queues, provider, deployment, service splits.
- **Auth / security:** roles, Guest access, permissions, sessions/tokens, public/private boundaries, Rights enforcement. Never lower security to get tests green.
- **Content / Rights:** sources, readings, Furigana, Vietnamese text, stroke assets, licences, provenance, reviews, publication, withdrawal. Never label content language-reviewed, rights-cleared, expert-verified or production-ready without evidence and the responsible person.
- **Privacy / data lifecycle:** deletion, backup, restore, retention, account deletion, export, tracking, analytics, logging user data.
- **Operations / cost:** hosting, paid services, database plan, storage, monitoring, backups. Never enable paid services.
- **QA / release:** changing test gates, skipping failing tests, weakening checks, feature flags, release scope, rollout, production publishing, CI changes.
- **Scope / roadmap:** work outside the task, large refactors, backlog order, dropping acceptance criteria, milestone changes, post-MVP items into MVP.

## No need to ask
Naming, function decomposition, formatting, internal helpers, test layout, lint/type fixes, small refactors, error handling already set by a contract, bug fixes with clear expected behaviour, optimisations that change nothing observable.

## How to ask
Problem · why it needs a decision · 2–3 realistic options with pros/cons and impact on UX/code/data/security/cost · your recommendation · one short closing question. Group related decisions into one round. Do not ask vague questions or turn implementation details into questions.

## Recording
After the PO decides, record it once in its canonical file (ADR in `docs/02-DECISIONS.md`, contract in `contracts/`, UI in `docs/07-DESIGN-SYSTEM.md`) with decision, rationale, scope, status, date and related task. Do not mark a proposal as approved because it appears in a document. Do not change an approved decision without PO agreement.

## Conflict priority
1. Data safety, security and non-negotiable constraints. 2. Latest direct PO instruction. 3. Approved decisions and contracts. 4. Git rules and quality gates. 5. Approved task scope. 6. Implementation preferences. Equal-priority conflicts with large impact go to the PO.
