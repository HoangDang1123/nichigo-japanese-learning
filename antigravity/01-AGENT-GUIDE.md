# Antigravity Agent Operating Guide

## Authority & working method
Product Owner makes final product, release and spending decisions. PM supplies requirements/backlog and reviews scope. This guide follows the repository-wide [`AGENTS.md`](../AGENTS.md). Execute **one approved user-facing feature at a time**, using the historical JPN tickets in the [feature roadmap](../docs/05-BACKLOG.md) as traceability. Do not implement the entire PRD autonomously.

## Rules
1. Read root `AGENTS.md`, the assigned feature and linked JPN tickets, PRD, decision log, relevant architecture/API contract, implementation notes and nested agent rules. Inspect source and Git state.
2. State assumptions and unresolved choices before coding. Do not invent guest quota number, content copyright permissions, payment plans or public domain.
3. Make smallest viable diff; use existing conventions and no surprise dependencies.
4. Plan the FE, BE, API, DB, tests and documentation impact; change only layers the feature needs. Integrate and verify across changed layers.
5. Run relevant lint, typecheck, unit/integration tests and visual checks; report exact commands/results and any checks not performed.
6. Include changed files, decisions, limitations, security implications and manual test steps.
7. Never paste secrets or credentials in code, logs or answer.
8. Follow `docs/07-DESIGN-SYSTEM.md` for frontend work. Preserve current semantic tokens and real brand assets; keep Light/Dark/System, responsive behavior and accessible typography. Approved screen concepts are not implemented features.
9. Keep implemented, tested, reviewed, merged and released states separate. Do not commit, push, merge, deploy, delete branches or rewrite history without explicit owner authorization. Preserve uncommitted work and report unsafe separation.
10. Follow the [root Git Branch Naming Convention](../AGENTS.md#git-branch-naming-convention) for future branches, using an existing JPN ticket and lowercase kebab-case slugs. Creating, renaming or switching branches also requires explicit owner authorization. Preserve historical branch names. Document FE/BE branch integration and joint verification; a completed frontend branch does not complete a feature. Stop to resolve scope if the task spans multiple features.
11. Follow the [single-workspace Git workflow](../AGENTS.md#single-workspace-git-workflow): use the primary checkout and ticket branches, preserve and push unfinished ticket work before switching, and do not create another worktree or duplicate project directory without explicit Product Owner authorization. Review and test each ticket diff before its PR; do not merge unfinished features.
12. For frontend work, follow the [root loading-state policy](../AGENTS.md#ui-loading-states-and-skeleton-policy) and the [Skeleton design rules](../docs/07-DESIGN-SYSTEM.md#skeleton-loading-system): identify real async boundaries; implement loading, success, empty and error transitions; use shared skeletons only for initial data-backed loading; keep refresh content visible; verify accessibility, reduced motion, themes and responsive layouts. Synchronous UI needs no skeleton.

## Feature kickoff

Before coding, identify the approved objective, legacy tickets, dependencies, acceptance criteria, proposed technical layers, and unresolved decisions. After implementation, report integration evidence, exact checks, manual visual review scope, docs updates, limitations and owner approval needed. Historical ticket estimates and old milestone order do not replace this feature plan.

## Review template
- Ticket ID / scope match:
- Feature objective / related legacy tickets:
- Files changed:
- Tests run and results:
- Security/privacy review:
- UX states / a11y:
- Migration or API changes:
- Open questions for owner:
- Status (implemented / tested / reviewed / merged / released):
- PM recommendation: accept / revise / block.
