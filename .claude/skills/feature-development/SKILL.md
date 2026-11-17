---
name: feature-development
description: Implement an approved Nichigo feature end to end (requirements, impact analysis, FE/BE/API/DB plan, implementation, integration, tests, docs, honest status report). Use when assigned a JPN ticket or feature to build; not for pure reviews or visual-only tweaks.
---

<!-- GENERATED from .agents/skills by scripts/sync-agent-skills.mjs. Do not edit; edit the source and re-run the script. -->

# Feature development

Follow root `AGENTS.md`; it wins over this file. Do not run Git write operations (branch, stage, commit, push, PR, merge) unless the owner authorized that exact operation.

## 1. Establish scope (before any edit)
1. Read `AGENTS.md`, the nested `AGENTS.md` of every directory you will touch, and the ticket row in `docs/05-BACKLOG.md`.
2. Read the matching requirements in `docs/01-PRD.md` and approved decisions in `docs/02-DECISIONS.md`. Add `docs/03-ARCHITECTURE.md` for architecture changes, `docs/07-DESIGN-SYSTEM.md` for UI, `contracts/01-API-CONTRACT.md` for API, and `docs/implementation/README.md` plus the notes of neighbouring tickets.
3. Read the real source and `git status`/branch before trusting any report or doc. Source and Git outrank documentation.
4. If the work spans several features or no ticket fits, stop and report the scope question. Never invent a JPN ID or change approved business rules.

## 2. Plan
Write a short plan with:
- Layers touched (FE, BE, API, DB, content, docs) and layers deliberately untouched.
- Dependencies, assumptions and open product choices (list them; do not resolve them by guessing).
- Files to add or change, reusing existing patterns and components; no new dependency unless justified.
- Verification: which tests, builds and manual checks prove each acceptance criterion.
- Git needs (branch, commits) as a request to the owner, not as an action.

For frontend work, also load the `frontend-ui` skill.

## 3. Implement
- Smallest diff that satisfies the approved scope. No unrelated cleanup, renames or reformatting.
- Never present mock data as production data, invent API responses, or add fake delays/progress.
- Preserve uncommitted and untracked work. Do not touch files outside the scope.
- Keep contracts (API, auth, CSRF, DB migrations) unchanged unless the ticket owns them; if it does, update the contract document in the same change.

## 4. Integrate and verify
- A rendered screen or an endpoint alone is not a finished feature: confirm the layers connect, or state exactly what is not connected.
- Run the checks that apply. For `nichigo_frontend/`: `npm run lint`, `npm run type-check`, `npm test`, `npm run build`. Backend: its Maven tests. Run a test twice when it writes files, and confirm it leaves no generated files in the source tree.
- Fix failures at the cause. Never weaken or delete a test to make it pass, and never skip a hook.
- Check `git status` afterwards for stray generated files.

## 5. Document
- Add or update `docs/implementation/JPN-<id>-<name>.md` from the real source: scope, files, routes/API, testing (command and result), limitations, next steps. Update the backlog row and the implementation index when the ticket requires it.
- Keep status words separate and exact: **Implemented**, **Tested**, **Reviewed**, **Merged**, **Released**. Do not infer a later level from an earlier one.
- Never mark demo or unreviewed content as published or approved.

## 6. Report
Report in the owner's language (Vietnamese unless told otherwise): what changed (files), exact commands and results, checks not run and why, limitations and unverified items, decisions needing the owner, and the Git state. Stop before any Git write operation that has not been authorized.

## Definition of Done (from AGENTS.md)
Approved acceptance criteria, needed FE/BE/API/DB integration, relevant tests, responsive and accessible UI with Light/Dark/System checks where applicable, no known unrelated regression, updated implementation docs, stated limitations, Product Owner approval.
