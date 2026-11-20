# NichiGo Project State

Short, link-first status for the Orchestrator across sessions. **Not a source of truth**: PRD, ADR, contracts and implementation notes win. If this file and Git disagree, verify with Git and fix this file. Do not start the "next" item below without the Product Owner (PO) asking for it.

Last verified: 2026-11-21 against `main` / `origin/main` `a5e4bd8` (Git history only; GitHub PR/CI state not verified because `gh` is not installed on this machine).

## Workspace

- Single official clone: `H:\Code\Projects\nichigo-japanese-learning`. The old Codex clone is retired: do not read, edit or delete it.
- Review artifacts live outside the repo in `H:\Code\Projects\_nichigo-artifacts`.
- Backend and docs status below is taken from `origin/main`, not from any local feature branch. Older local branches carry a Backend that predates PRs #42–#44: never read production state from them.

## Milestone and workstreams

| Workstream | Status | Source |
|---|---|---|
| Frontend | **PAUSED** by PO. Read-only audits only until PO resumes it. | — |
| Backend Kanji v2b foundation | MERGED to `main` (squash commits): #42 `2489845` relations/revision pins/Furigana/Kanji Detail API, #43 `589809c` private stroke storage + Rights-gated delivery, #44 `ab764ee` content pilot fixtures + integration tests. Not released. | [v2b backend](../implementation/JPN-033-kanji-v2b-backend.md), [content pilot](../implementation/JPN-033-kanji-content-pilot.md) |
| Frontend Kanji UI (v2a + stroke pilot) | Not on `main`. Lives on the PO's local FE branch (stroke pilot uncommitted there). FE integration with the v2b API not done. | — |
| Orchestrator setup | MERGED to `main` as squash commit `a5e4bd8` (PR #45, `chore(jpn-doc-001)`), verified in Git history. CI for that PR not verified here (`gh` not installed). The branch `chore/claude-orchestrator-setup` still exists locally and on `origin`; not deleted. | [WORKFLOW](WORKFLOW.md) |

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

- "Content Preflight" is a candidate BE task named by the PO. It is not described anywhere in the repo docs and has no approved scope. Do not implement it.
- QA subagent: not created; propose only near FE–BE integration or MVP release, with separate PO approval.

## Local work to preserve

FE Kanji stroke pilot work (untracked: stroke pilot data, kana pilot JSON, `skills-library.*`, `docs/designs/`, `docs/research/`) is not part of `main`. A preservation copy (originals not removed) lives outside the repo:

- `H:\Code\Projects\_nichigo-artifacts\backups\jpn-033-fe-preservation\` (manifest with sha256: `MANIFEST.tsv`; taken 2026-11-21 from branch `jpn-033/features/frontend-kanji-ui` @ `7763d43`)
- `H:\Code\Projects\_nichigo-artifacts\preserved-work\jpn-033-fe-local\`
- Local doc drafts: `H:\Code\Projects\_nichigo-artifacts\backups\jpn-doc-001-local-drafts\`

One git stash also exists (`stash@{0}`, from `jpn-041/features/frontend-study-desk`, 2026-11-07). Never reset, clean, drop the stash or switch branches over FE work without explicit PO approval. The two temporary worktrees (`orchestrator-config`, `nichigo-main`) were removed on 2026-11-21 after being verified clean; use an isolated worktree only when really needed and authorized.

## Next proposed task (not started)

A small BE task to exercise the Orchestrator end to end; Content Preflight is a candidate only after the PO defines its scope.
