# Orchestrator workflow

How the main Claude Code session (Orchestrator) runs NichiGo with the Product Owner (PO) and two subagents, `nichigo-fe` and `nichigo-be`. Short rules are in [CLAUDE.md](../../CLAUDE.md) and `.claude/rules/`; this file holds the procedures. Git write rules, branch/commit conventions, completion language and the Definition of Done for features are in [AGENTS.md](../../AGENTS.md) and are not repeated here. If this file conflicts with AGENTS.md, AGENTS.md wins.

## 1. Classify the PO message first

| Intent | Orchestrator does | Does not |
|---|---|---|
| Question / discussion | Analyse, recommend, state what is unverified | Edit code, spawn subagents for simple answers |
| Brainstorm | Offer options, check fit with PRD, separate idea from decision | Implement |
| PO decides ("chọn hướng A") | Restate exactly what was decided, list consequences, record it when allowed | Treat it as a coding assignment |
| Planning request | Audit only the needed source/contracts, find dependencies and Decision Gates, split tasks | Write code |
| Implementation request | Check scope and gates, ask only real open questions, delegate, review, manage tests/docs/Git | Expand scope |
| Report of work/PR | Verify source, diff, CI for that exact commit, docs | Trust "tests PASS" blindly |
| Change of an old decision | Find the current decision, assess impact/compatibility, ask, then record | Edit implementation first |

## 2. Decision Gate

Applies before every implementation. Rules for what needs the PO are in `.claude/rules/product-decisions.md`.

1. Detect: compare the request with PRD, ADRs, design system, contracts, backlog and source.
2. Classify: implementation detail / approved / needs PO / contradictory / technical blocker / security-Rights blocker.
3. Propose: 2–3 realistic options with trade-offs and a recommendation.
4. Ask the PO; silence is not approval.
5. Record the answer in its single canonical place (ADR in `docs/02-DECISIONS.md`, contract in `contracts/`, UI in `docs/07-DESIGN-SYSTEM.md`), with rationale, scope, status, date and related task.
6. Delegate only what is fully decided.
7. If a subagent finds a new decision mid-task it stops that dependent part, reports it, and the Orchestrator asks the PO. Independent parts may continue.

`BLOCKED — AWAITING PRODUCT OWNER DECISION` is a valid result.

## 3. Feature lifecycle

Discussion → Decision → Planning → Implementation → Self-testing → Orchestrator review → Docs → PR → CI → Merge → Cleanup. Small tasks may collapse steps but may not skip a needed gate.

**Definition of Ready:** scope and acceptance criteria clear; relevant decisions made; no serious contract conflict; dependencies known; workspace safe; owner agent chosen; test strategy and docs impact known.

**Statuses** (never use bare "DONE"): PLANNED · IN PROGRESS · BLOCKED · IMPLEMENTED · LOCALLY VERIFIED · PR OPEN · CI VERIFIED · MERGED · PRODUCTION READY. Skipped tests are not PASS.

## 4. Delegation brief

Give the subagent: task ID, scope and non-goals, acceptance criteria, the few files/docs to read, base branch/commit, decisions already made, tests to run, docs to assess, and the report format. Do not ask it to read the whole repo. FE and BE never edit the same file in parallel; shared files (contracts, ADR, architecture, CI, root config) are assigned to one agent by the Orchestrator. Subagents cannot delegate to each other.

Do not delegate: simple questions, brainstorming, concept explanations, confirming decisions, a quick `git status`, short reports from existing context.

### Who does the work (communication rule, PO-approved 2026-11-21)

- **Say who owns each task, briefly, in Vietnamese**, when starting it and in updates: Orchestrator handles it directly · delegated to `nichigo-fe` · delegated to `nichigo-be` · FE/BE coordination (state order and who owns which files).
- **Implementation tasks** (source, tests, migrations, UI, FE/BE docs tied to code) must be done by the native subagent that matches the approved scope: `nichigo-fe` for Frontend, `nichigo-be` for Backend. The Orchestrator does not implement them itself to save time. If a task needs both, settle the contract and decisions first, then order the two tasks.
- **Orchestrator may handle directly**, without calling a subagent just to have a delegation: Git, PR, CI checks, cleanup, Project State, planning, documentation governance, and Product Decisions. Hand these to a subagent only when it really helps.
- **The final report ends with a short "Thực hiện bởi" line** (the fourth item of the default report in `CLAUDE.md`: what was done, result, what needs the PO, who did it). Only when a subagent was actually involved or delegation is merely proposed, separate (a) work really delegated and run, (b) work done directly by the Orchestrator, and (c) delegation only proposed. Never write that a subagent did something it was not actually invoked for.
- This rule creates no new subagent and does not change the existing limits (no Agent Teams, no QA subagent, subagents do not delegate to each other, no extra paid usage without PO approval).

## 5. Orchestrator review (by risk)

- Small UI: diff, relevant tests, screenshot if visual.
- API/schema: diff, contracts, tests, migration, compatibility.
- Auth/Rights: diff, security branches, negative tests, CI, docs.
- Content publication: revision pins, Rights, language-review status, validation, publication gates, read-API behaviour.

Check the subagent's docs-impact statement against the diff. Reject cosmetic doc updates and docs that claim more than the code does.

## 6. Git delivery

All write operations need explicit PO authorization (see AGENTS.md). Once authorized, before a PR check branch/base, diff, no secrets, no unrelated files, tests, docs. Before a merge check the right PR, the head commit, CI for that commit, mergeability, review blockers, changed files, scope and docs. Any failed gate means no merge. Report the real merge commit only after it is confirmed in history. GitHub CLI (`gh`, installed and authenticated via browser login on the PO's machine, 2026-11-21) is the Orchestrator's tool for reading PRs, diffs, checks and failed-run logs, and for creating PRs and squash merging only when the PO authorizes each operation. Never use `--admin` or any bypass, never print or store tokens, and never change branch protection or rulesets. As of 2026-11-21 `main` has no branch protection or ruleset (read-only API check), so the CI gate rests on this procedure; report that gap and do not claim the branch is protected. If `gh` is unavailable or unauthenticated, report PR/CI state as not verified.

## 7. Artifacts, backups, cleanup

- Review artifacts (screenshots, review ZIPs, reports, logs) go to `H:\Code\Projects\_nichigo-artifacts\<kind>\<TASK-ID>\`, outside the repo. Source, tests, fixtures, migrations, contracts and official docs stay in the repo.
- No whole-project backups. Use branches, commits, diffs and, only when real isolation is needed, a worktree. Never back up `node_modules`, `.next`, `target`, caches or logs.
- Do not touch `%TEMP%` or shared caches wholesale.
- Post-merge cleanup of agent-created backups/worktrees only when every condition holds (PR merged, gates PASS, work preserved, absolute path verified, agent-created, same task, clean, not the main or retired clone, not PO-created, not production storage, not shared cache). Use `git worktree remove` without force; never recursive delete on unverified paths. When in doubt keep it and ask.
- After each task report artifacts created, kept, cleaned and why.

## 8. Project State

After each task decide whether status, PR/merge commit, decisions, blockers or workstreams changed, and update only those lines of [PROJECT-STATE.md](PROJECT-STATE.md). At session start read CLAUDE.md and PROJECT-STATE, then the request, then only relevant docs.

## 9. Quota

Sonnet for Orchestrator and both subagents. No QA subagent, no Agent Teams, no pricier model or extra usage without PO approval. Prefer sequential work, short briefs, git diff/tests/CI over re-reading source, and return only needed logs. Do not call a subagent for simple questions or small research the Orchestrator can do itself; delegate only for a clear gain in quality, scope or context. This never waives the required `nichigo-fe`/`nichigo-be` delegation for approved implementation. Prefer direct tools over any other agent; ask the PO first before using an agent other than `nichigo-fe`/`nichigo-be` or before large, token-heavy research, and never create a custom agent without PO approval. Never trade away tests, security checks, diff review, docs or a Decision Gate to save quota; if quota is short, report what is done and what is unverified.

## 10. Future QA subagent

Not created. May be proposed near integrated FE–BE flows or MVP release (auth E2E, lesson completion, quiz submission, progress, Kanji detail/stroke delivery, Rights revocation in UI, release regression) and needs separate PO approval.
