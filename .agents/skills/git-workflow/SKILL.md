---
name: git-workflow
description: Perform Git operations safely in the Nichigo monorepo - preflight, sync, branch create/switch, safe staging, commit, push, pull request, conflict handling, merge and post-merge verification - always under the authorization rules in AGENTS.md. Use whenever a task goes beyond read-only Git inspection, or when asked about branches, commits, pushes, PRs, merging or syncing main.
---

# Git workflow

`AGENTS.md` is the authoritative Git policy (authorization, clone ownership, branch and commit naming, history protection, PR and merge rules, completion language). This skill only describes how to carry out each operation. If they disagree, `AGENTS.md` wins. Work only in your assigned clone.

## 0. Preflight (read-only, always allowed)
```bash
git status -sb                      # branch, upstream, tracked/staged changes
git status --short | grep -c '^??'  # untracked count (preserve them all)
git log --oneline -5 && git stash list
git remote -v && git ls-remote --heads origin <branch>   # does the remote branch exist?
```
Record the branch, HEAD, staged/unstaged/untracked counts and stash SHAs before any write, so you can show nothing was lost afterwards.

## 1. Authorization gate (before every write operation)
Write operations: branch create/rename/switch/delete, stage, commit, push, PR open/update, merge, pull, rebase, cherry-pick, revert, amend, stash, tag.
- Proceed only when the owner's authorization names this operation and its scope (branch, commits, PR). Earlier approval of a different operation does not count.
- If unsure, stop and ask in one short message: the operation, the exact branch/paths, the expected effect and the risk.
- Read-only commands and a `git fetch` that cannot touch the working tree need no authorization.

## 2. Synchronize (fetch, pull, merge and rebase are different risks)
- **fetch** updates remote-tracking refs only: `git fetch origin`. Then inspect: `git log --oneline HEAD..origin/main`, `git diff --name-status HEAD origin/main`.
- **pull / merge** integrate changes into the current branch. Use `git pull --ff-only origin main` on `main`; if it cannot fast-forward, stop and report. Never create merge commits or merge `main` into a feature branch unless authorized for that branch.
- **rebase** rewrites history: never without explicit authorization naming the branch. Never interactive.
- Report incoming commits and any path overlap with local changes before integrating.

## 3. Create or switch a branch
**Branch reuse check (read-only, before any branch is proposed or created; `AGENTS.md` rule 11).**
```bash
git branch --show-current && git status -sb
git branch -vv                              # local branches and upstreams
git fetch origin && git branch -r           # remote branches (fetch is safe)
git branch -r --merged origin/main          # remote branches already merged
git log --oneline origin/main..<candidate>  # unmerged commits; also <candidate>..origin/main for divergence
```
Check PR status of each candidate when `gh` or the GitHub UI is available (a merged or closed PR means the branch is complete). Filter candidates by ticket id and purpose, then classify and give the reason:
1. **Continue existing branch:** same ticket and scope, unmerged or unfinished, no unrelated changes mixed in, safe for uncommitted work, a suitable base, and not owned by another agent or clone.
2. **Create separate branch:** no suitable branch; the earlier branch is merged or closed and the new work is independent; the scope needs its own PR; or reuse would mix history or tickets. The same ticket alone is not a reason to reuse.
3. **Stop and ask the Product Owner:** several candidates, diverged history, a merged branch that still holds uncommitted work, another agent's branch, or any doubt.

Report the candidates and recommendation; do not check out, create or rewrite anything from the audit alone. Never create a branch per commit, and do not name a branch after a PR number unless the task is about that PR.

1. Preflight (section 0). Identify unfinished work and who owns it.
2. Collision check against the target:
```bash
git diff --name-only HEAD <target> | sort > /tmp/changes.txt
git ls-files --others --exclude-standard | sort | comm -12 - /tmp/changes.txt   # must be empty
```
Any tracked or staged change that would be overwritten, or any untracked path the target adds, is a blocker: stop and report. Do not stash, reset, clean or move files to get around it.
3. Name: `jpn-<ticket-id>/features/frontend-|backend-|fullstack-<slug>`, `jpn-<ticket-id>/chore/<slug>` or `jpn-<ticket-id>/docs/<slug>`; lowercase kebab-case; an existing, approved ticket ID with its padding and category kept. Never invent an ID; if none fits, ask.
4. New work starts from an up-to-date `main` (`git switch main`, then `git pull --ff-only origin main`), then `git switch -c <branch>`. Do not stack one branch on another unless told.
5. Afterwards verify: HEAD is where expected, untracked count and stash list unchanged.

## 4. Stage and commit safely
1. `git status`; decide which files belong to this ticket and this one logical change.
2. Stage explicit paths only: `git add -- path1 path2`. Do not use `git add .`, `-A` or `-u` unless the owner asked and you listed every file first.
3. Review: `git diff --cached --name-status`, `git diff --cached --stat`, then read `git diff --cached`.
4. `git diff --cached --check` must be clean.
5. Scan the staged diff for secrets, tokens, `.env*`, credentials, local settings, generated artifacts (`.next`, `.test-dist`, build logs, screenshots) and unrelated edits. If anything out of scope is staged, stop and report; unstage only that path with `git restore --staged -- <path>` when the owner has allowed unstaging, otherwise ask.
6. Message: `<type>(<ticket-id>): <short imperative English description>`; types `feat fix style refactor docs test chore perf build ci`; lowercase type and ticket id (for example `jpn-ui-002`); preferably 72 characters or fewer; no trailing period; breaking change marked with `!` or a `BREAKING CHANGE:` footer. Add the attribution trailer your environment requires.
7. Commit only when authorized: `git commit -m "<subject>" -m "<body>"`. Verify with `git log -1 --stat`. One logical change per commit; never amend or rewrite a pushed commit.

## 5. Push
1. Confirm the remote (`git remote -v`), the current branch name and that `git log origin/main..HEAD` lists only the intended commits and `git diff --stat origin/main...HEAD` only intended files.
2. Authorized push only: `git push -u origin <branch>`. Never `--force` or `--force-with-lease`, and never push another branch, unless the owner authorized exactly that.
3. Afterwards confirm `git rev-parse HEAD` equals the remote head (`git ls-remote origin <branch>`).

## 6. Pull request
Open or update a PR only when authorized, and use the draft state the owner chose. If `gh` or a GitHub integration is unavailable, say so and give the compare URL plus the prepared description; do not use stored credentials to call the API on your own.
- Title: Conventional Commit style with the ticket id, for example `refactor(jpn-arch-004): reorganize frontend components` (it becomes the squash commit subject).
- Body must state: JPN ticket; goal and scope; base and source branch; implemented versus not implemented; API/schema/migration impact; tests run with actual results and checks not run with reasons; screenshots or visual verification for UI changes; known limitations and risks; decisions the owner must make. Never write "CI passes" from local results.
- One ticket per PR unless the owner approved a combined scope.
- After opening, verify base and head branches, commit list, changed-file list and CI status from GitHub, and report them.

## 7. Conflicts
1. List conflicted files and both branches; read both sides in full.
2. Check each side against business rules, `contracts/01-API-CONTRACT.md` and architecture. No blanket `--ours` or `--theirs`; never overwrite another agent's in-progress work.
3. Business policy, security, data schema or out-of-scope conflicts: stop and ask the owner.
4. Re-run the relevant tests after resolving. Do not force-push to finish.

## 8. Merge (only with explicit merge authorization)
Checklist, every item verified from GitHub, not memory:
- [ ] All required CI checks have passed (none failed, pending or unconfirmed). Local test results do not count.
- [ ] Owner approval covers this PR's scope; no unresolved conflicts or review threads; no known serious regression without an approved plan; docs updated; acceptance criteria of this PR checked.
- [ ] Merge method is **squash** (default). The squash subject is a Conventional Commit with the ticket id. If the PR holds independent changes needing separate history, ask for an exception or a split.
- [ ] You are not changing repository settings, branch protection or the required-check list. If required checks are not configured in GitHub, report that gap instead of claiming the branch is protected.
If CI fails: find the cause (code, test, environment or infrastructure), fix the real cause, re-run, and propose merge only when all required checks are green. Never disable, delete or weaken a check or test, and never use admin bypass.

## 9. After merge
1. Verify on GitHub or in history that the PR is merged: `git fetch origin && git log origin/main --oneline -5` and find the squash commit by its title or PR number. With squash merge the original branch commits are **not** ancestors of `main`; do not require that.
2. Check the CI status of the merge commit. Record **Merged** only with that evidence; **Released** needs deployment evidence.
3. Sync the clone (`git switch main`, `git pull --ff-only origin main`) only when authorized, after the preflight and collision check in section 3.
4. Do not delete local or remote branches, clear stashes or clean untracked files unless the owner explicitly asks.

## 10. Reporting a blocker
Report in the owner's language: what you tried to do, the exact state found (branch, HEAD, counts, conflicting paths), why it is unsafe, the options with their risks, and the one decision you need. Stop; do not improvise a workaround with stash, reset, clean or force.
