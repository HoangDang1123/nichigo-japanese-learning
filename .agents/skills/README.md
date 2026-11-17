# Shared agent skills

`.agents/skills/<name>/SKILL.md` is the **single canonical source** of reusable development procedures for Claude Code and OpenAI Codex. Project-wide rules stay in the root [`AGENTS.md`](../../AGENTS.md); a skill explains how to apply them and never relaxes them.

| Skill | Use it to |
|---|---|
| `feature-development` | Implement an approved feature end to end: scope, plan, implement, verify, document, report. |
| `code-review` | Review a diff, branch or PR and report findings ranked by severity. |
| `frontend-ui` | Build and verify Nichigo frontend UI: Next.js, design system, themes, states, visual checks. |

## Layout

```text
AGENTS.md                      project rules (authoritative)
CLAUDE.md                      Claude Code entry point -> AGENTS.md and these skills
.agents/skills/<name>/         canonical skills (edit here)
.claude/skills/<name>/         GENERATED copies for Claude Code (never edit)
scripts/sync-agent-skills.mjs  generator and drift check
```

## Maintaining skills

1. Edit or add `.agents/skills/<name>/SKILL.md`. It needs YAML frontmatter with `name` (equal to the directory name) and a one-sentence `description` that says when to use it.
2. Run `node scripts/sync-agent-skills.mjs` to regenerate `.claude/skills/`.
3. Run `node scripts/sync-agent-skills.mjs --check` to verify (read-only; exit code 1 on drift). Commit the source and the generated copies together.

The script records a content hash of every generated file in `.claude/skills/.agents-sync.json`. If someone edits a generated file by hand, the script refuses to overwrite it (exit code 2) and tells you to move the change into `.agents/skills`; `--force` overwrites anyway. CRLF checkouts are normalised, so Windows and POSIX agree. Symlinks are not used because `core.symlinks` is off on the project's Windows clones.

## Discovery status (what is and is not verified)

- Claude Code documents project skills under `.claude/skills/<name>/SKILL.md`; Codex reads `AGENTS.md` and, in versions that support skills, `.agents/skills/`.
- **Verified (Claude Code, one session):** after the skills were created, the skill list of the Claude Code session that created them (the VS Code extension environment) included `feature-development`, `code-review` and `frontend-ui` with the descriptions from their frontmatter. That session could not tell whether they were read from `.claude/skills/` or from `.agents/skills/`. Only that session was observed; other Claude Code versions or environments have not been tested.
- **Not verified (Codex):** the Codex CLI was not available, so discovery of `.agents/skills/` by Codex has not been confirmed. Do not assume it works until someone runs Codex and sees the skills listed.
- The root `AGENTS.md` and `CLAUDE.md` name the skills explicitly so an agent can read them directly even if discovery is unavailable.
