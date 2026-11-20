# Workspace hygiene

- One official clone: `H:\Code\Projects\nichigo-japanese-learning`. Do not access, edit or delete `nichigo-japanese-learning-codex`. Do not create more clones or copy the project into temp folders.
- No whole-project backups before tasks. Use branches, commits, diffs and, only when isolation is really needed and authorized, a worktree. Selective backup only for non-reproducible data, with a stated reason and scope. Never back up `node_modules`, `.next`, `target`, build output, caches, logs.
- Review artifacts (screenshots, previews, review ZIPs, reports, logs, exports) go in `H:\Code\Projects\_nichigo-artifacts\{previews,screenshots,reports,logs,reviews,exports,backups}\<TASK-ID>\`, outside the repo; give the PO the absolute path. Source, tests, fixtures, migrations, contracts, schemas, official docs, agent config and build/test scripts stay in the repo. No secrets in review ZIPs.
- Do not change global temp or cache settings, clear `%TEMP%` or shared caches. Where a tool allows an output path, write straight to the artifacts folder; otherwise move keepers afterwards and delete only temp files the task created.
- Cleanup only after merge and only when every condition in [WORKFLOW §7](../../docs/orchestration/WORKFLOW.md) holds. Never before merge unless the file is trivially reproducible. No wildcard or recursive deletes on unverified paths; plain `git worktree remove`, never forced. If unsure, keep and ask.
- After each task report artifacts created, kept, cleaned and not cleaned (with reasons).
- No hooks that delete broadly, auto-merge, overwrite Git, send secrets, run dangerous commands or change system permissions. No permission bypass for convenience. No new plugins, MCP servers or dependencies unless needed and approved.
