@AGENTS.md

# Claude Code entry point

`AGENTS.md` is the authoritative instruction source for every agent in this repository; the line above imports it. Nested instruction files (for example `nichigo_frontend/AGENTS.md` and `nichigo_frontend/CLAUDE.md`) stay in force for their directories.

Shared skills live in `.agents/skills/` (canonical). `.claude/skills/` is generated from it by `scripts/sync-agent-skills.mjs`: do not edit it, and run `node scripts/sync-agent-skills.mjs --check` after changing a skill. If skills are not discovered automatically, read the relevant `.agents/skills/<name>/SKILL.md` directly. Skills: `feature-development`, `code-review`, `frontend-ui`, `git-workflow`. See `.agents/skills/README.md`.

Never run a Git write operation (branch, stage, commit, push, PR, merge) without explicit owner authorization; see "Authorization and Git write operations" in `AGENTS.md`.
