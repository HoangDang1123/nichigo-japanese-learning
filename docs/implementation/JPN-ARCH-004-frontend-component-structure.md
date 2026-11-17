# JPN-ARCH-004 — Frontend component structure and test CI

> **Maintenance status.** A behavior-preserving reorganization of `nichigo_frontend/src/components/` plus CI hardening. No product feature, route, API, authentication, state lifecycle, backend, database or content change. The work is on a local branch: it is **not merged and not released**.

**Ticket:** JPN-ARCH-004 (registered in [the backlog](../05-BACKLOG.md); Product Owner approved, P1). **Branch:** `jpn-arch-004/chore/frontend-component-structure`, from `main` at `9aaadfb`. **Depends on:** JPN-003, JPN-UI-003, JPN-035, JPN-036, JPN-037, JPN-DOC-001 (shared skills script).

## Why
A source audit found, with evidence from the import graph:
- `components/skills/` mixed the Skills directory, Kana, Kanji/category pages, shared mock data and skeletons in one flat folder beside the already separate `vocabulary/` and `grammar/` features.
- `skills-mock-data.ts` (679 lines) held the category metadata and the demo data of four areas; Kana logic imported demo data from it.
- Home components imported `../../app/home.module.css` (component code reaching into `app/`).
- `kana-stroke-data.ts` and `kana-stroke-guidance.ts` imported each other (a type-only cycle).
- CI did not run `npm test`, and with a clean `.test-dist` one Kana test failed because it only stubbed one of the CSS modules its components import.

## What changed
| Area | Before | After |
|---|---|---|
| Home styles | `app/home.module.css` | `components/home/home.module.css` |
| Skills overview | `components/skills/skills-overview.*`, `skills-skeleton.*` | `components/skills/overview/` |
| Kana | 12 `kana-*` files directly in `components/skills/` (chart, data, detail, drawer, study grid, stroke data/guidance, 3 tests) | `components/skills/kana/` |
| Category detail | `components/skills/category-detail.tsx` | `components/skills/category/category-detail.tsx` |
| Shared page chrome | `components/skills/skills-detail.module.css` (used by Kana and category) | `components/skills/shared/skills-detail.module.css` |
| Mock data | one `skills-mock-data.ts` | `shared/skills-categories.ts` (category metadata, legacy categories), `kana/kana-mock-data.ts`, `category/category-mock-data.ts`; content identical (every declaration and data line compared) |
| Stroke types | declared in `kana-stroke-guidance.ts` | `kana/kana-stroke-types.ts` (guidance re-exports them, so imports keep working); the import cycle is gone |
| Vocabulary, Grammar, `ui`, `layout`, `states`, `auth`, `learning-path`, `api`, `store`, `app` routes | — | unchanged (route files only had import paths updated) |

Moves were done with `git mv`; every moved file is a 100% rename, and the only content edits inside them are import paths (plus the Kana CSS test mock below). Routes and URLs are unchanged.

**Legacy files kept on purpose.** `components/skills/skills-mock-data.ts` remains as a deprecated re-export of the three new modules because the untracked legacy `skills-library.tsx` still imports from it; nothing in tracked source imports it. Delete both together when the owner decides. `skills-library.*` was not touched.

**Deliberate deviation from the planned folder list.** A `components/skills/shared/` folder was added: `skills-detail.module.css` is page chrome used by both Kana and the category page, and moving it into either area would have created a cross-area import. Splitting the stylesheet was rejected as a visual-regression risk.

## CI and tests
- `.github/workflows/ci.yml` frontend job: added **Test** (`npm test`) and **Agent skills drift check** (`node scripts/sync-agent-skills.mjs --check`, run from the repository root with `working-directory: .`). Existing steps, the BOM and the backend job are unchanged.
- **Test fix found by the new gate.** With a freshly deleted `.test-dist`, `kana-stroke-guidance.test` failed (`Cannot find module './kana-chart.module.css'`): it wrote a stub only for `kana-drawer.module.css` but renders `kana-chart`. It had only passed locally thanks to stale build output. The Kana tests now answer every `.css` request in memory (`Module._load`), as the Grammar tests do, so they write no stub files. No assertion was changed or removed.
- `ui/skeleton.test.tsx` paths for the moved Home and Skills stylesheets were updated; test registrations in `package.json` and `tsconfig.test.json` follow the new Kana paths.

## Verification (run from `nichigo_frontend/` on this branch, with `.test-dist` deleted first)
- `npm run lint`: no problems. `npm run type-check`: no errors. `npm test`: 91 tests, 91 pass, 0 fail (re-run after each change group). `npm run build`: succeeds. Import-graph check (script kept outside the repository): 0 cycles.
- Production server: `/`, `/learn`, `/skills`, `/skills/kana`, `/skills/vocabulary` (+ `explore`, `saved`, `study/greetings`), `/skills/grammar` (+ `de-place`), `/skills/kanji`, `/skills/listening`, `/login`, `/register`, `/progress` return 200; unknown Grammar id returns 404.
- Headless Chrome, 11 routes at 1440 Light, 1440 Dark, 390 and 320: no horizontal overflow and no console errors other than the expected refused connection to the absent backend (`/auth/me`); Dark applies the dark background.
- Vocabulary lifecycle: a word bookmarked in Explore is listed in Saved after in-app navigation through the Vocabulary Home link (provider still mounted by the route layout). Grammar filter chips and the Kana drawer still respond.
- **Not done:** no side-by-side visual or HTML comparison with the pre-refactor build (a baseline build could not be set up in this environment); no comparison of the state reset on full reload against a baseline beyond the documented behavior; the new CI steps have **not been run on GitHub or on Linux**; no real-device, screen-reader or non-Chromium checks.

## Conventions (see also [FRONTEND-CONTEXT](../agents/FRONTEND-CONTEXT.md) and [architecture](../03-ARCHITECTURE.md))
Routes in `app/`; feature code, demo data, styles and tests together in the feature folder; shared folders never import features; Skills areas do not import each other (category and overview both read the category metadata from `shared/skills-categories.ts`); a file used by two areas goes in `skills/shared/`; no import cycles; demo data stays separate and labelled.

## Limitations / next steps
- The deprecated `skills-mock-data.ts` shim and untracked `skills-library.*` remain; the unreachable Vocabulary and Grammar branches of `category-detail.tsx` and their old mock lists remain (cleanup is a separate decision).
- `components/theme-*` files and `account/` stay where they are; no `src/features/` migration was made.
- Required CI checks and branch protection on GitHub were not changed and have not been verified.
