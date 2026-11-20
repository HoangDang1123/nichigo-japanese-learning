# Git delivery and quality gates

Authoritative Git rules, branch naming, commit format, PR contents, merge strategy and completion language are in [AGENTS.md](../../AGENTS.md) and the `git-workflow` skill. They win over anything here. Short version for the Orchestrator:

- Exception: ordinary docs-only changes may go through the full branch → commit → push → PR → CI → squash merge → branch cleanup flow without per-step approval, under "Standing authorization: docs-only delivery" in [AGENTS.md](../../AGENTS.md). That section holds the scope, the list of what still needs PO approval and the safety conditions; the Orchestrator's merge gate is both CI checks SUCCESS on the exact PR head commit via `gh`. Anything outside it follows the rule below.
- No Git write operation (branch, stage, commit, push, PR, merge, stash, rebase, delete) without explicit, specific PO authorization. Never `reset --hard`, `clean`, force-push, destructive checkout. Preserve all uncommitted and untracked work; untracked files are not junk.
- "Feature finished" never means "authorized to merge".
- Before a PR: branch and base correct, diff reviewed, no secrets, no unrelated files, tests as required, docs consistent, no open decision touching the scope.
- Before a merge: right PR and head commit, CI for that exact commit PASS (local results are not CI), mergeable, no review blockers, scope and docs checked, merge authorized. Any failed gate: no merge. Report the merge commit only after it is confirmed in Git history.
- A single clone is now used. Use a worktree only when real isolation is needed and authorized. Do not read or touch the retired Codex clone.
- Quality gates by layer: FE lint, typecheck, `npm test`, build, responsive/a11y/theme, states, visual evidence. BE compile, unit and integration tests, Flyway, contract, security/Rights, idempotency, transactions, `git diff --check`. Skipped is not PASS; partial CI is not whole-system verification.
- Do not accept "tests PASS" from a subagent without evidence proportional to risk ([WORKFLOW §5](../../docs/orchestration/WORKFLOW.md)).
