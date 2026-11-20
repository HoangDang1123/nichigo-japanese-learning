# NichiGo agent workflow

Work on one approved feature at a time. Read the actual source and Git state before treating documentation or a prior report as evidence of completion. Preserve existing behavior and uncommitted work.

## Authorization and Git write operations

These rules are mandatory for every agent and take precedence over any workflow description below or in a skill.

1. **Default: no Git write operation without explicit owner authorization.** This covers creating, renaming, switching, merging and deleting branches; staging and committing; pushing; opening or updating pull requests; merging; deploying; and rewriting history. Read-only Git commands (`status`, `log`, `diff`, `show`, `ls-remote`) are always allowed. `git fetch` only updates remote-tracking references and is allowed when it cannot affect the working tree.
2. **Authorization is specific.** It names the operation and its scope. Approval of one operation (for example creating or switching a branch) does not authorize another (committing, pushing, merging, deleting), and approval in one task does not carry to the next. The only standing exception is "Standing authorization: docs-only delivery" below.
3. **The workflow sections below describe the procedure to follow once an operation is authorized.** They never authorize an operation by themselves.
4. **Preserve all uncommitted and untracked work.** Never discard it; if work cannot be separated and preserved safely, stop and report the blocker.
5. **Never use `git reset --hard`, `git clean -fd`, force-push, or destructive checkout**, and do not stash, delete or overwrite unfinished work unless the owner has explicitly asked for that exact operation.
6. Never silently change approved business rules, authentication/security contracts, or release scope.
7. **Fetch, pull, merge and rebase are different operations with different risk and need separate authorization where they write.** Rebase (including interactive), amending a pushed commit, cherry-pick and revert alter history or behaviour and need explicit authorization naming the branch and commits. Force-push is never the default way to resolve a conflict.

## Standing authorization: docs-only delivery

Approved by the Product Owner on 2026-11-21. This is the one exception to rules 1 and 2 above. It lets the Orchestrator run the full Git delivery of an ordinary documentation change without asking per step. Rules 4 to 7 still apply.

**Steps covered:** create a branch (following the naming convention and "reuse before create"), edit the docs, review the diff for accuracy, commit, push, open a PR, check CI, squash merge, verify the merge, delete the merged task branch.

**In scope (ordinary docs only):**
- README and usage guides.
- Task status, progress and release-checklist updates.
- Syncing docs with changes already merged or decisions already approved.
- Fixing typos, formatting, links and outdated information.
- Implementation notes that state verified status accurately.

**Still needs a specific Product Owner approval:**
- Creating or changing a Product Decision or ADR.
- Changing scope, business rules, learning rules or the roadmap.
- Changing architecture, API contract, database schema or security policy.
- Changing workflow, agent permissions or Git rules, including this section.
- A diff that touches source code, learning data or runtime configuration.
- Any content that lacks evidence to confirm it.

**Safety conditions:**
- Apply only when the PR is docs-only and in scope. If the diff goes beyond ordinary docs, stop and ask.
- Both required CI checks (Frontend and Backend) must be SUCCESS on the exact head commit of the PR, confirmed with `gh`. Missing, pending or failed checks mean no merge; no bypass of CI or branch protection; no merge while a required review is unresolved. `main` currently has no branch protection (verified 2026-11-21), so this check is the Orchestrator's own gate; never change repository settings.
- Never push directly to `main`. Never replace the PR with a local merge. If `gh` or GitHub access is unavailable, report the limit and stop.
- Delete only the branch this docs task created, after the merge is verified in Git history and nothing unmerged, no worktree and no unpreserved work depends on it. Never delete FE WIP, backup or preservation branches, and never touch stashes, preserved work or other worktrees.
- After the merge, confirm `main` and `origin/main` are in sync and the working tree is clean.

## Read before each development ticket

1. This file and the assigned feature in [the backlog](docs/05-BACKLOG.md) or current roadmap.
2. Relevant requirements in [the PRD](docs/01-PRD.md) and approved decisions in [the decision log](docs/02-DECISIONS.md).
3. [Architecture](docs/03-ARCHITECTURE.md) for architectural changes and [the design system](docs/07-DESIGN-SYSTEM.md) for UI work.
4. Relevant [API contracts](contracts/01-API-CONTRACT.md), [implementation notes](docs/implementation/README.md), and nested `AGENTS.md` files. Frontend work must follow `nichigo_frontend/AGENTS.md`, including its local Next.js documentation rule.

## Delivery

Follow: requirements → impact analysis → FE/BE/API/DB plan → implementation → integration → tests → visual review → documentation → owner approval → merge. Change only the layers the feature actually needs. Identify dependencies, assumptions, and unresolved product choices before coding. Never silently change approved business rules, authentication/security contracts, or release scope.

Use existing patterns and reusable components; avoid unnecessary dependencies. Do not invent API responses or present mock data as production data. A rendered screen or an endpoint alone does not complete a feature. Keep the implementation notes accurate and report limitations and exact verification results.

Do not commit, push, merge, deploy, delete branches, or rewrite Git history without explicit owner authorization. Preserve all uncommitted work. If feature changes cannot be separated safely, stop and report the conflict.

## Assigned-clone Git workflow

NichiGo uses one official development clone: `H:\Code\Projects\nichigo-japanese-learning`. The main Claude Code session is the Orchestrator and talks with the Product Owner. Frontend and Backend implementation is delegated to the native subagents `nichigo-fe` and `nichigo-be` (see `CLAUDE.md` and `.claude/agents/`); these are not Agent Teams, and subagents do not delegate to each other. Never let two agents edit the same file, and settle cross-layer contracts before delegating. The retired second clone (`nichigo-japanese-learning-codex`) must not be read, edited or deleted. Do not create further clones, and create a worktree only when real isolation is needed and the Product Owner authorizes it (review artifacts go outside the repo; see `.claude/rules/workspace-hygiene.md`). Coordinate cross-layer changes through GitHub review. The steps below apply only once the owner has authorized the corresponding Git operation (see Authorization and Git write operations).

### Starting a ticket

1. Read the relevant project instructions and ticket requirements. Inspect `git status`, the current branch, and untracked files before switching tickets.
2. If the current ticket has unfinished legitimate work, review it, then, once the owner authorizes it, commit and push it to its appropriate ticket branch. Separate unrelated tickets into distinct commits and branches; never stage every changed file blindly.
3. Never discard uncommitted or untracked work. If changes cannot be separated and preserved safely, stop and report the blocker instead of switching branches.
4. Fetch the latest remote state and synchronize the clone with `main` before creating the next ticket branch. Use the branch naming convention below and start only when that checkout is safe and the owner has authorized the branch operation.

### Completing a ticket

1. Review the diff, run relevant checks and tests, and update implementation documentation.
2. When the owner authorizes it, commit one logical ticket-scoped change at a time using the Conventional Commits convention below; push the branch and open or update a PR targeting `main` for review.
3. Merge only when the work is complete, verified, and explicitly authorized. Never merge an unfinished feature. After merge, synchronize the clone with `main` before starting another independent ticket.

Never use `git reset --hard`, `git clean -fd`, force-push, or destructive checkout to resolve a branch switch. Do not delete or overwrite unfinished work or rewrite historical commits to satisfy a newer convention. If a Git operation could lose work or rewrite history, stop and report the risk.

## Pull requests and merging

- **PR content.** Each PR states: the JPN ticket ID; goal and scope; base and source branches; what is and is not implemented; API/schema/migration impact; tests run with real results and checks not run with reasons; screenshots or visual verification for UI changes; known limitations and risks; decisions the owner must review. Do not mix unrelated tickets in one PR without approved scope. Opening a PR does not complete a feature.
- **Merge strategy.** Squash merge is the default for PRs into `main`. The squash commit uses Conventional Commits with the ticket ID, for example `refactor(jpn-arch-004): reorganize frontend components`. If a PR holds independent changes whose history must stay separate, report it to the Product Owner to choose an exception or split the PR. Agents never change repository or branch-protection settings.
- **CI gate.** All required CI checks must pass before merging. Never merge with failed, pending or unconfirmed checks; never bypass (including admin bypass), disable, delete or weaken checks or tests; local results are not CI evidence. If required checks are not configured in GitHub branch protection or rulesets, report the gap and do not claim the branch is protected. Changing the required-check list is a separate governance decision for the Product Owner.
- **Merge readiness.** Besides CI: owner approval for the scope, no unresolved conflicts, no known serious regression without an approved plan, updated documentation, and the PR's acceptance criteria verified. UI approval is not approval of the whole feature. Merging requires explicit owner authorization of the merge itself.
- **Conflicts.** Read both sides and check them against business rules, API contracts and architecture. Never apply blanket `ours`/`theirs`, overwrite another agent's work, or force-push after resolving. Stop and ask the owner when a conflict touches business policy, security, data schema or work outside scope.
- **After merge.** Verify the merge on GitHub or in Git history; for a squash merge find the squash commit on `main` (the original commits are not ancestors). Mark **Merged** only with that evidence and **Released** only with deployment evidence. Synchronize the clone only when authorized, and never delete branches, clear stashes or clean untracked files unless the owner asks, except the task branch deleted under "Standing authorization: docs-only delivery".

## Typography Rule

Use Be Vietnam Pro for Vietnamese and general UI, Noto Sans JP for Japanese learning content, and Noto Serif JP only for decorative Japanese accents. Reuse the centralized typography tokens in `nichigo_frontend/src/styles/tokens.css`; never add another UI font without Product Owner approval or apply Japanese serif to Vietnamese headings or body text. Preserve the typography scale and Light/Dark/System compatibility, and verify Vietnamese diacritics and Japanese glyphs. See [the design system](docs/07-DESIGN-SYSTEM.md#approved-typography) for usage and loading details.

## UI Loading States and Skeleton Policy

For every future frontend task, identify actual asynchronous data dependencies and loading boundaries before implementation. Design initial loading, success, empty, error, and relevant refreshing states together. Use the shared `Skeleton` primitive for initial loading of data-backed regions, with a feature-specific composition when the loaded layout is substantial. Approximate the real content's dimensions and responsive structure; use semantic Light/Dark/System tokens, accessible busy announcements, noninteractive decorative shapes, and reduced-motion handling. Keep valid content visible during background refresh where possible. Never substitute a skeleton for confirmed empty, error, or unavailable content, invent placeholder business data, or add artificial loading delays. Add or update tests for loading-to-content and loading-to-error/empty transitions, and verify desktop/mobile appearance in Light and Dark. Include applicable loading coverage in the feature's Definition of Done. Purely synchronous components need no individual skeleton.

See [the design system](docs/07-DESIGN-SYSTEM.md#skeleton-loading-system), [shared implementation](nichigo_frontend/src/components/ui/skeleton.tsx), and the [JPN-UI-003 note](docs/implementation/JPN-UI-003-skeleton-system.md).

## Git Branch Naming Convention

Use the following convention for all future NichiGo development branches.

### Standard format

- Frontend: `jpn-<ticket-id>/features/frontend-<feature-slug>`
- Backend: `jpn-<ticket-id>/features/backend-<feature-slug>`

Examples:

- `jpn-010/features/frontend-auth`
- `jpn-010/features/backend-auth`
- `jpn-030/features/frontend-learning-path`
- `jpn-030/features/backend-learning-path`

### Optional branch types

- Frontend and backend together: `jpn-<ticket-id>/features/fullstack-<feature-slug>`
- Shared infrastructure: `jpn-<ticket-id>/chore/<task-slug>`
- Documentation: `jpn-<ticket-id>/docs/<task-slug>`

### Rules

1. Always use lowercase kebab-case for feature and task slugs.
2. Every development branch must reference an existing JPN ticket ID. Preserve the ticket identifier, including its existing numeric padding or category (for example, `JPN-UI-001` becomes `jpn-ui-001/...`).
3. Keep the existing ticket numbering system; do not create arbitrary ticket IDs.
4. Organize work by complete features, even when frontend and backend are implemented on separate branches.
5. Clearly document how FE and BE branches are integrated and verified together before marking a feature complete.
6. Never treat a completed frontend branch as proof that the entire feature is complete.
7. Never create, rename, switch, merge, delete, or push branches without explicit owner authorization. Authorization names the operation and scope; approval to create or switch a branch does not authorize committing, pushing, merging or deleting.
8. Do not rename or rewrite existing historical branches solely to conform to this new convention.
9. If a task spans multiple features, stop and identify the correct scope before implementation.
10. Keep this convention recorded here and referenced in relevant project workflow documentation.
11. **Reuse before create.** Before proposing or creating a branch, inspect the current, local and remote branches for the same ticket and purpose, and check scope, unmerged work, history and any existing PR status. Prefer an existing unmerged branch whose work matches the requested scope when it is safe to continue. Create a new branch only when no suitable branch exists, the previous branch is completed, a separate PR is justified, or reuse would mix unrelated changes. The same ticket does not automatically require the same branch. One branch may hold several commits; never create a branch per commit. Branch names describe the work, not PR numbers, unless the task is specific to that PR. Never take over a branch that belongs to another agent or worktree without authorization. If uncertain, report the candidate branches and ask the Product Owner. Every Git write operation still requires explicit, scoped authorization under rule 7 and "Authorization and Git write operations".
12. **Approved exception (PR #45).** The Product Owner approved the branch `chore/claude-orchestrator-setup` (ticket `jpn-doc-001`) for the one-time Claude Orchestrator configuration migration, although it does not follow the standard format. This exception covers only that PR; every other branch follows the format above.

## Git Commit Message Convention

Use Conventional Commits for new commits. The required subject format is:

```text
<type>(<ticket-id>): <short-description>
```

Examples:

```text
feat(jpn-030): implement railway journey UI
fix(jpn-030): correct station hover behavior
style(jpn-ui-002): standardize global typography
docs(jpn-030): update learning path documentation
test(jpn-032): add quiz grading tests
```

Allowed types: `feat`, `fix`, `style`, `refactor`, `docs`, `test`, `chore`, `perf`, `build`, `ci`.

1. Use a lowercase type and ticket ID. Reference an existing JPN ticket and preserve its identifier, including numeric padding and categories such as `jpn-ui-002`.
2. Write the description in English imperative form, preferably keeping the subject within 72 characters. Do not end it with a period.
3. Put one logical change in each commit. Do not combine unrelated tickets in one commit.
4. Mark breaking changes with Conventional Commits syntax: `!` after the scope (for example, `feat(jpn-003)!: change shell contract`) and/or a `BREAKING CHANGE:` footer explaining the impact.
5. Apply this convention only to new commits. Do not rename or rewrite historical commits solely to conform to it.

## Completion language

- **Implemented:** source exists for the stated scope; integration may still be incomplete.
- **Tested:** named automated or manual checks were run and their results recorded.
- **Reviewed:** the owner reviewed the specified behavior or visuals; review scope must be stated.
- **Merged:** the commit is in the target branch, verified from Git history.
- **Released:** the feature is deployed and its release checks are complete.

Definition of Done for a feature: approved acceptance criteria, necessary FE/BE/API/DB integration, relevant tests, responsive and accessible UI with Light/Dark/System checks where applicable, no known unrelated regression, updated implementation docs, stated limitations, and Product Owner approval. Record each status separately; approval of one visual detail is not approval of the entire feature.

## Shared agent skills

Reusable procedures live in `.agents/skills/<name>/SKILL.md`, the single canonical source for Claude Code (the Orchestrator and the native subagents). `.claude/skills/` is generated from it by `scripts/sync-agent-skills.mjs`; never edit the generated copies. Run `node scripts/sync-agent-skills.mjs --check` after changing a skill. See [the skills README](.agents/skills/README.md).

- `feature-development` — implement an approved feature end to end.
- `git-workflow` — execute Git operations (preflight, sync, branch, stage, commit, push, PR, conflicts, merge, post-merge) under the rules in this file.
- `code-review` — review a diff or PR and report prioritized findings.
- `frontend-ui` — Nichigo frontend work: Next.js, design system, themes, states and visual verification.

Skills describe how to apply the rules in this file; they never relax them. If a skill and this file disagree, this file wins. Nested `AGENTS.md` files (for example `nichigo_frontend/AGENTS.md`) remain in force for their directories.
