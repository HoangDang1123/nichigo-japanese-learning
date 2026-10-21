# Antigravity Agent Operating Guide

## Authority & working method
Product Owner makes final product and spending decisions. PM supplies spec/backlog and reviews scope. Agent executes **one approved ticket at a time**, never broad autonomous implementation of the entire PRD.

## Rules
1. Read PRD, decision log, architecture, API contract and assigned ticket.
2. State assumptions and unresolved choices before coding. Do not invent guest quota number, content copyright permissions, payment plans or public domain.
3. Make smallest viable diff; use existing conventions and no surprise dependencies.
4. Implement tests and migrations together with code.
5. Run lint, typecheck, unit/integration tests and report exact commands/results.
6. Include changed files, decisions, limitations, security implications and manual test steps.
7. Never paste secrets or credentials in code, logs or answer.
8. Stop at approval gate; do not merge, deploy to production or purchase services without authorization.

## Copy/paste prompt — first ticket
```
You are implementing ticket JPN-001 from docs/05-BACKLOG.md.
Read README.md, docs/01-PRD.md, docs/02-DECISIONS.md,
docs/03-ARCHITECTURE.md, contracts/01-API-CONTRACT.md and this guide.

Scope ONLY JPN-001: scaffold Next.js TypeScript and Java Spring Boot
in a documented monorepo, basic CI checks, .env.example,
local startup instructions and formatting/lint/test commands.
Do not implement authentication, database tables or lessons yet.
Do not invent unapproved product choices or create paid services.

Before coding: summarize plan and list unresolved blockers.
After coding: report changed files, test results, run instructions,
known limitations and acceptance-criteria checklist.
Do not deploy or merge without explicit owner approval.
```

## Review template
- Ticket ID / scope match:
- Files changed:
- Tests run and results:
- Security/privacy review:
- UX states / a11y:
- Migration or API changes:
- Open questions for owner:
- PM recommendation: accept / revise / block.
