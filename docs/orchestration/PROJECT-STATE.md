# NichiGo Project State

Short, link-first status for the Orchestrator across sessions. **Not a source of truth**: PRD, ADR, contracts and implementation notes win. If this file and Git disagree, verify with Git and fix this file. Do not start the "next" item below without the Product Owner (PO) asking for it.

Last verified: 2026-11-26 against `main` / `origin/main` `20cbb5c` (Git history; no open PRs).

## Workspace

- GitHub CLI installed and authenticated (2026-11-21). `main` has **no branch protection or ruleset** (read-only API check): required checks are not enforced by GitHub; the PO decides whether to enable them.
- Single official clone: `H:\Code\Projects\nichigo-japanese-learning`. The old Codex clone is retired: do not read, edit or delete it.
- Standing authorization (PO, 2026-11-21): the Orchestrator may deliver ordinary docs-only changes end to end (branch to squash merge and task-branch cleanup) without per-step approval. Scope, exclusions and safety conditions: "Standing authorization: docs-only delivery" in [AGENTS.md](../../AGENTS.md). Product Decisions, architecture, security and Git governance changes still need a specific PO approval.
- Review artifacts live outside the repo in `H:\Code\Projects\_nichigo-artifacts`.
- Backend and docs status below is taken from `origin/main`, not from any local feature branch. Older local branches carry a Backend that predates PRs #42–#44: never read production state from them.

## Milestone and workstreams

| Workstream | Status | Source |
|---|---|---|
| Frontend | **RESUMED** by PO on 2026-11-28 (ADR-023): connect FE to existing backend APIs, keep labelled mock where no backend exists. | [Decisions](../02-DECISIONS.md) |
| Backend Kanji v2b foundation | MERGED to `main` (squash commits): #42 `2489845` relations/revision pins/Furigana/Kanji Detail API, #43 `589809c` private stroke storage + Rights-gated delivery, #44 `ab764ee` content pilot fixtures + integration tests. Not released. | [v2b backend](../implementation/JPN-033-kanji-v2b-backend.md), [content pilot](../implementation/JPN-033-kanji-content-pilot.md) |
| Frontend Kanji UI (v2a + stroke pilot) | Not on `main`. Lives on the PO's local FE branch `jpn-033/features/frontend-kanji-ui`; the stroke pilot is now committed there as `2c6d730` (2026-11-21, local only, 1 commit ahead of `origin`, not pushed). FE integration with the v2b API not done. | — |
| Backend read-only audit (BE-AUDIT-001) | Done 2026-11-24 by `nichigo-be` as a first trial of the subagent (read-only, working tree stayed clean). Rights gate for stroke delivery verified by reading code and tests only; tests were not run. Stale lines in the v2b note fixed via PR #49. Unverified: storage adapter/validator internals, pilot fixture counts, `contracts/01-API-CONTRACT.md` DTO lines. | [v2b backend](../implementation/JPN-033-kanji-v2b-backend.md) |
| Content Import Tool technical rehearsal | Done 2026-11-24 by `nichigo-be` on `nichigo-intro-v1` in a dedicated schema of the local dev database. Validate, dry-run, import, idempotent re-import, changed-content conflict, malformed CSV and the missing-language-review publish gate behaved as designed. No real Rights or language review and no publication were performed, so this is **not** verification of the operator workflow. Findings: `CSV_COLUMN_COUNT` reports the line after the broken one; the runbook's stdin token example fails on Windows PowerShell 5.1; several CLI error messages lack context; the CLI does not check that `DB_URL` targets a test schema. The rehearsal schema was dropped on 2026-11-26 after a read-only check. No fix tasks created. | Reports in `H:\Code\Projects\_nichigo-artifacts\reports\` (`content-import-*`) |
| Orchestrator setup | MERGED to `main` as squash commit `a5e4bd8` (PR #45, `chore(jpn-doc-001)`), verified in Git history. PR state MERGED and both CI checks (Frontend, Backend) SUCCESS confirmed with `gh`. The branch `chore/claude-orchestrator-setup` still exists locally and on `origin`; not deleted. | [WORKFLOW](WORKFLOW.md) |

Implementation priority (PO, 2026-11-18): Documentation alignment → Skills UI/API integration → Guest FE integration → Learning Path/Lesson → Progress/Home. See [backlog](../05-BACKLOG.md).

## Kanji production blockers (reported; none cleared)

- Qualified Japanese language review not done (pilot phrases and Vietnamese are drafts).
- Production Rights clearance not done; AnimCJK / Arphic licensing review open ([release checklist](../06-RELEASE-CHECKLIST.md)).
- Stroke asset provenance and writing accuracy not approved (pilot bytes are schematic test data).
- Private persistent storage mount/ACL for strokes not approved.
- FE integration not done. Never call Kanji production-ready.

## Pending PO decisions

- Minor leftovers, not workflow-mandating, not changed in PR #45: `docs/03-ARCHITECTURE.md` and `.agents/skills/README.md` still name Codex as a skills consumer, and `.agents/skills/git-workflow/SKILL.md` says "clone ownership". Edit the skills only via `.agents/skills/` plus the sync script, and only if the PO wants them aligned.
- Open product questions: [02-DECISIONS.md](../02-DECISIONS.md#open-questions-do-not-silently-decide).

## Proposed, not approved

- "Content Preflight" was proposed by the Orchestrator, not requested by the PO (corrected 2026-11-26). The PO decided not to build it for now; if ever needed, it would be a check mode inside the operator CLI, not a separate system. Do not implement it.
- Content Import Tool direction from the PO discussion on 2026-11-24 (not yet recorded as an ADR): keep the local operator CLI only, no CMS/admin UI/HTTP import API; content is authored outside the tool. Order of attention: Rights and language review process, N5 tagging rule (introductory content does not need `jlptLevelCode`), Activity/Question import vs JPN-032, media/audio only when the vertical slice needs it, withdrawal later. No acceptance criteria approved yet.
- QA subagent: not created; propose only near FE–BE integration or MVP release, with separate PO approval.

## Local work to preserve

FE Kanji stroke pilot work is not part of `main`. It is committed locally as `2c6d730` on `jpn-033/features/frontend-kanji-ui` (not pushed). The untracked material recorded on 2026-11-21 (kana pilot JSON, `skills-library.*`, `docs/designs/`, `docs/research/`) is not covered by that commit and was not re-checked on 2026-11-24. A preservation copy (originals not removed) lives outside the repo:

- `H:\Code\Projects\_nichigo-artifacts\backups\jpn-033-fe-preservation\` (manifest with sha256: `MANIFEST.tsv`; taken 2026-11-21 from branch `jpn-033/features/frontend-kanji-ui` @ `7763d43`)
- `H:\Code\Projects\_nichigo-artifacts\preserved-work\jpn-033-fe-local\`
- Local doc drafts: `H:\Code\Projects\_nichigo-artifacts\backups\jpn-doc-001-local-drafts\`

One git stash also exists (`stash@{0}`, from `jpn-041/features/frontend-study-desk`, 2026-11-07). Never reset, clean, drop the stash or switch branches over FE work without explicit PO approval. The two temporary worktrees (`orchestrator-config`, `nichigo-main`) were removed on 2026-11-21 after being verified clean; use an isolated worktree only when really needed and authorized.

## Next proposed task (not started)

Step B for the Content Import Tool: clarify the Rights review and language review process (who reviews, what evidence, how it is recorded) so that real content can be published. Under discussion with the PO; nothing approved.
