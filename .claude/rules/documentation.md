# Documentation governance

Docs are part of Done. Every task needs a docs-impact assessment; not every task needs a docs edit. Feature Definition of Done and status terms: [AGENTS.md](../../AGENTS.md); status ladder and procedures: [WORKFLOW](../../docs/orchestration/WORKFLOW.md).

## Subagents, after each task
1. Find the affected docs. 2. Update them in the same task. 3. Check them against the code. 4. Check they do not contradict an ADR or contract. 5. List docs changed, or say why none. Never edit an ADR to legitimise an unapproved decision; never write production-ready without evidence.

## Orchestrator
Compare the docs-impact statement with the diff; reject cosmetic updates and docs claiming more than implemented; make sure backlog/status match reality; check docs before PR and before merge.

## What to update
API change → `contracts/01-API-CONTRACT.md`, implementation note, tests, release checklist if needed. Database → migration, architecture/data model, implementation note, tests. UI → design system (only for newly approved decisions), acceptance criteria, implementation note, review evidence. Content pipeline → content package contract, operator runbook, validation docs, Rights/publication notes. Product decision → `docs/02-DECISIONS.md`, plus PRD/backlog if affected.

## One source of truth
Each decision has one home, each contract one home; implementation notes link to them; `docs/orchestration/PROJECT-STATE.md` only summarises status and links. Do not copy a decision into several files. Distinguish approved decision, implemented, verified, proposal and production blocker.
