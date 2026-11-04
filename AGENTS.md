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

## Completion language

- **Implemented:** source exists for the stated scope; integration may still be incomplete.
- **Tested:** named automated or manual checks were run and their results recorded.
- **Reviewed:** the owner reviewed the specified behavior or visuals; review scope must be stated.
- **Merged:** the commit is in the target branch, verified from Git history.
- **Released:** the feature is deployed and its release checks are complete.

Definition of Done for a feature: approved acceptance criteria, necessary FE/BE/API/DB integration, relevant tests, responsive and accessible UI with Light/Dark/System checks where applicable, no known unrelated regression, updated implementation docs, stated limitations, and Product Owner approval. Record each status separately; approval of one visual detail is not approval of the entire feature.
