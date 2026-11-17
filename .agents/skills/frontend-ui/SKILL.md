---
name: frontend-ui
description: Build or change Nichigo frontend UI in nichigo_frontend (Next.js App Router, CSS Modules, semantic tokens, Light/Dark/System, responsive, accessible, loading/empty/error states, skeletons) and verify it visually. Use for any screen, component, style or UI test change in the frontend.
---

# Nichigo frontend UI

Root `AGENTS.md` and `nichigo_frontend/AGENTS.md` win over this file. Do not run Git write operations without explicit owner authorization.

## 1. Before coding
1. **Next.js is not the version you know.** Read the relevant guide in `nichigo_frontend/node_modules/next/dist/docs/` first (for example `01-app/01-getting-started/` for layouts, server/client components, project structure, CSS, fonts) and heed deprecations. `params` is a Promise in pages; dynamic routes here use `generateStaticParams` with `dynamicParams = false`.
2. Read `docs/07-DESIGN-SYSTEM.md` (typography, themes, skeleton system, rōmaji rule) and the nearest existing feature as the pattern.
3. Inventory real asynchronous data sources and loading boundaries for the screen. Static or mock data has no loading state.

## 2. Where code goes
- `src/app/`: routes, layouts, framework boundaries only. Keep URLs, layouts and navigation behaviour stable.
- `src/components/<feature>/`: feature components, logic, types, demo data, CSS Module and tests together. Skills are grouped by area (for example `skills/vocabulary/`, `skills/grammar/`).
- `src/components/ui|layout|states|branding`: genuinely shared primitives and shell. Do not promote a component to shared because two nearby screens use it.
- Shared code must not import from a feature. Avoid import cycles; put shared types in a file both sides can import.
- Keep demo data separate from domain types and logic, and keep the "demo data, not approved for publishing" label wherever mock content is shown. Never present mock data as production data.
- Reuse existing components (`Button`, `Input`, `Card`, `Dialog`, `Tooltip`, `Progress`, `Skeleton`, `EmptyState`, `ErrorState`). No new dependency, UI library, Tailwind or second styling system.
- Preserve the Redux auth store, Axios client (`withCredentials`, CSRF flow) and feature-local provider lifecycles (for example `VocabularyProvider` mounted in its route layout).

## 3. Styling and design system
- CSS Modules plus tokens from `src/styles/tokens.css` and `src/styles/themes.css`. Use `var(--color-*)`, `--space-*`, `--radius-*`, `--font-size-*`. Never write raw hex colours in TSX or CSS modules.
- Fonts: Be Vietnam Pro for Vietnamese and UI, Noto Sans JP for Japanese learning content (`lang="ja"`), Noto Serif JP only for decorative Japanese accents. Never use Japanese serif for Vietnamese text; never add a font.
- Rōmaji: Hepburn, italic, `--font-body`, secondary colour, no slashes or brackets, hidden behind a "Hiện cách đọc" toggle with `aria-expanded` when optional, shown between Japanese and Vietnamese. Never derive a reading from kanji; omit the reading and its toggle when no verified reading exists.
- Theme: Light, Dark and System must all work (`data-theme` via `next-themes`); no wrong-theme flash.
- Layout: no fixed heights that clip text; let content wrap (`min-width: 0`, `overflow-wrap`); prefer container queries for areas inside the AppShell; mobile 320 px must not overflow horizontally.

## 4. States
Design these together: initial loading, success, empty, error, and refreshing (when relevant).
- Initial loading of data-backed regions: shared `Skeleton` inside `SkeletonRegion` with a meaningful Vietnamese label, shapes `aria-hidden`, reduced-motion safe, sized like the real content. Keep valid content visible during background refresh.
- Never use a skeleton for confirmed empty, error or unavailable content, never add artificial delays, and never invent placeholder business data.
- Error states state the truth and offer "Thử lại" only when a real retry exists.

## 5. Tests
- Node test runner compiled by `tsc -p tsconfig.test.json`; run with `npm test`. New test files must be added to `tsconfig.test.json` `include` and the `npm test` script.
- Render with `react-dom/server` `renderToStaticMarkup`. Alias `@/` and CSS Modules are mocked in memory (`Module._load` for `.css`); do not write stub files into the source tree.
- Cover loading to content and loading to error/empty transitions where the feature has them, plus optional-content branches. Prefer asserting behaviour over source text.

## 6. Verify
1. `npm run lint`, `npm run type-check`, `npm test` (run twice when tests write files), `npm run build`, from `nichigo_frontend/`. Confirm no generated files remain under `src/`.
2. Visual check against a production build (`npm run build` then `npm start`), not only dev: widths 1280, 1440, 1920, 390 and 320; Light and Dark; keyboard Tab order and visible focus; measure `scrollWidth <= clientWidth`.
3. Check Vietnamese diacritics and Japanese glyphs render, and that browser console shows no new warnings or hydration errors. The known auth-session request failing without a backend is expected.
4. Report what you actually ran and what you could not (real devices, screen readers, other browsers).
