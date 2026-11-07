# NichiGo agent workflow

Work on one approved feature at a time. Read the actual source and Git state before treating documentation or a prior report as evidence of completion. Preserve existing behavior and uncommitted work.

## Read before each development ticket

1. This file and the assigned feature in [the backlog](docs/05-BACKLOG.md) or current roadmap.
2. Relevant requirements in [the PRD](docs/01-PRD.md) and approved decisions in [the decision log](docs/02-DECISIONS.md).
3. [Architecture](docs/03-ARCHITECTURE.md) for architectural changes and [the design system](docs/07-DESIGN-SYSTEM.md) for UI work.
4. Relevant [API contracts](contracts/01-API-CONTRACT.md), [implementation notes](docs/implementation/README.md), and nested `AGENTS.md` files. Frontend work must follow `nichigo_frontend/AGENTS.md`, including its local Next.js documentation rule.

## Delivery

Follow: requirements → impact analysis → FE/BE/API/DB plan → implementation → integration → tests → visual review → documentation → owner approval → merge. Change only the layers the feature actually needs. Identify dependencies, assumptions, and unresolved product choices before coding. Never silently change approved business rules, authentication/security contracts, or release scope.

Use existing patterns and reusable components; avoid unnecessary dependencies. Do not invent API responses or present mock data as production data. A rendered screen or an endpoint alone does not complete a feature. Keep the implementation notes accurate and report limitations and exact verification results.

Do not commit, push, merge, deploy, delete branches, or rewrite Git history without explicit owner authorization. Preserve all uncommitted work. If feature changes cannot be separated safely, stop and report the conflict.

## Single-workspace Git workflow

Use one primary local checkout at `H:\Code\Projects\nichigo-japanese-learning` and work with Git branches in that directory. Do not create another Git worktree or a duplicate project directory unless the Product Owner explicitly authorizes an exception.

### Starting a ticket

1. Read the relevant project instructions and ticket requirements. Inspect `git status`, the current branch, and untracked files before switching tickets.
2. If the current ticket has unfinished legitimate work, review it, then commit and push it to its appropriate ticket branch. Separate unrelated tickets into distinct commits and branches; never stage every changed file blindly.
3. Never discard uncommitted or untracked work. If changes cannot be separated and preserved safely, stop and report the blocker instead of switching branches.
4. Fetch the latest remote state and synchronize with `main` before creating the next ticket branch. Use the branch naming convention below and start only when the primary checkout is safe.

### Completing a ticket

1. Review the diff, run relevant checks and tests, and update implementation documentation.
2. Commit one logical ticket-scoped change at a time using the Conventional Commits convention below; push the branch and open or update a PR targeting `main` for review.
3. Merge only when the work is complete, verified, and explicitly authorized. Never merge an unfinished feature. After merge, synchronize the primary checkout with `main` before starting another independent ticket.

Never use `git reset --hard`, `git clean -fd`, force-push, or destructive checkout to resolve a branch switch. Do not delete or overwrite unfinished work or rewrite historical commits to satisfy a newer convention. If a Git operation could lose work or rewrite history, stop and report the risk.

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
7. Never create, rename, switch, merge, delete, or push branches without explicit owner authorization.
8. Do not rename or rewrite existing historical branches solely to conform to this new convention.
9. If a task spans multiple features, stop and identify the correct scope before implementation.
10. Keep this convention recorded here and referenced in relevant project workflow documentation.

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
