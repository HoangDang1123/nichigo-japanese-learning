# JPN-037 — Grammar Skill UI Foundation (frontend)

> **Prototype status.** This is a **frontend UI prototype on demo data**. Product Owner visual approval of *Grammar UI prototype v1* is a visual approval only. It does not approve the whole ticket, the content, the learning rules or a release. The work is on a local branch: it is **not merged and not released**.

**Ticket:** JPN-037 — Grammar Skill UI Foundation (registered in [the backlog](../05-BACKLOG.md)). **Branch:** `jpn-037/features/frontend-grammar-ui-foundation`. **Depends on:** JPN-003, JPN-UI-002, JPN-035 (Skills overview), JPN-036 (Vocabulary reading and rōmaji conventions). Frontend only: no backend, database or API changes, so there is no FE/BE integration to verify.

## Scope
Included (inside the unchanged AppShell):
- **Grammar Overview** at `/skills/grammar`: heading, demo-data label, local search, filter chips and a grid of grammar pattern cards.
- **Grammar Detail** at `/skills/grammar/[grammarId]`: a single-column notebook.

Not included: Flashcards (JPN-033), Kanji or other Skills; Grammar study flow, quizzes, bookmarks, progress, mastery, spaced repetition or any persistence; audio; published-content integration; backend, API or database changes; a separate `/explore` route for Grammar.

## Status (kept separate)
- **Implemented:** both screens, routes and states below.
- **Tested** (from `nichigo_frontend/`, on this branch on top of `origin/main` `da5ab79`): `npm run lint` clean; `npm run type-check` clean; `npm test` — 91 tests, 91 pass, 0 fail, run twice in a row; `npm run build` succeeds and prerenders `/skills/grammar` and 12 `/skills/grammar/[grammarId]` pages. The Grammar suite is `grammar.test.tsx`.
- **Real-browser QA (automated):** headless Chrome against a production build. Overview at 1280, 1440, 1920, 390 and 320 px; Detail at 1280, 1440, 390 and 320 px; Light and Dark; keyboard Tab traversal; search plus filter; no-results state; no horizontal overflow in any measured case. The QA scripts and screenshots were kept outside the repository and are not part of this change.
- **Loading and Error states** were reviewed visually through a temporary, isolated preview route that was deleted afterwards. No production route, fake request or loading timer exists. The production page never passes a retry handler, so no inert "Thử lại" button is rendered.
- **Reviewed:** Product Owner **visually approved Grammar UI prototype v1** (Overview and Detail as shown in screenshots). Visual approval only.
- **Pending:**
  - **Independent content review** of the demo content and of the hand-written example rōmaji.
  - **Real-device (touch) testing.**
  - **A comprehensive accessibility audit** (screen reader output, full keyboard pass); only the checks listed under QA were done.
  - Browsers other than Chromium.
- **Open observation:** during the Loading/Error preview, the Next.js development overlay showed a `1 Issue` badge. Its cause was **not investigated and is unverified**; it was seen only in the development server with the temporary preview route and not in the production build. It must not be treated as resolved.
- **Not implemented:** backend, API, database, persistence, progress, bookmarks, assessment, mastery, spaced repetition, audio.
- **Merged:** no. **Released:** no.

## Routes
| Route | Screen |
|---|---|
| `/skills/grammar` | Overview |
| `/skills/grammar/[grammarId]` | Detail (`grammarId` is a static demo id; unknown ids return 404, `dynamicParams = false`) |

Both are wrapped by `app/skills/grammar/layout.tsx` (AppShell). `[category]/page.tsx` no longer prerenders the `grammar` category, because the static `/skills/grammar` route takes over (one-line change).

## Overview
- **Filter chips:** "Tất cả" plus one chip per category that actually has patterns. They only narrow the list below; they do not navigate. The selected chip is shown with a primary border and `aria-pressed`. No per-chip counts; the total result count is shown above the list (`role="status"`).
- **Search:** local, on the demo data only. It matches the Japanese pattern, the Vietnamese meaning and the category name, ignoring case and Vietnamese diacritics. Search and the chip filter combine.
- **Pattern cards:** a responsive grid, one column on narrow content and two columns when the content area is at least 42rem wide (container query, so it follows the width left after the AppShell sidebar). Each card shows the category, the Japanese pattern, the Vietnamese meaning and the entry's own first example (Japanese plus Vietnamese) in a tinted area, with an arrow icon. An entry without examples shows no example area. Cards have no fixed height and no romaji.
- **States:** content, empty dataset, no search results (with a clear-filters action), loading (shared `SkeletonRegion`) and error (shared `ErrorState`). Loading and error are reachable only through the component's `status` prop, which the production page does not use.

## Detail
A single column, max width 48rem, in this order: breadcrumb/back link, Japanese pattern, Vietnamese meaning, demo-data label, **Structure**, **Explanation**, **Examples**, **Notes** and **Related patterns**. Optional sections render only when the entry has content.
- **Structure:** annotated components, wrapping onto several lines for long patterns, with an optional remark.
- **Explanation:** one or more paragraphs, line length capped at 42rem.
- **Examples:** Japanese sentence, optional rōmaji, Vietnamese translation. Rōmaji follows the [Japanese Reading & Rōmaji Typography](../07-DESIGN-SYSTEM.md) rule: hidden by default, italic secondary Latin text between the Japanese and the Vietnamese, a "Hiện cách đọc" / "Ẩn cách đọc" toggle with `aria-expanded`, and no slashes or brackets. The toggle exists only for examples that carry a reading.
- **Notes:** usage notes, common mistakes and short comparisons, typed per entry.
- **Related patterns:** only relations declared explicitly in the data.
- **Optional illustration:** an example may carry `GrammarIllustration` (`src`, `alt`, optional `caption`). This is a **frontend-only type**; it is not a backend or API contract, and no artwork exists. The UI is complete without it.

## Demo data
Frontend-only mock data in `grammar-data.ts`: **5 categories** (Câu cơ bản, Trợ từ, Động từ, Tính từ, Thời gian), **12 patterns** and **16 examples**. Every page carries the label "Dữ liệu minh họa, chưa được duyệt để xuất bản". The content, the translations and the rōmaji were written by hand for this prototype. **They have had no independent content review and must not be treated as published or approved.** Rōmaji is present only on examples whose reading was written by hand; examples without a verified reading have none and no toggle. Readings are never derived from kanji.

## Files
- Routes: `nichigo_frontend/src/app/skills/grammar/` — `layout.tsx`, `page.tsx`, `[grammarId]/page.tsx`.
- Components: `nichigo_frontend/src/components/skills/grammar/` — `grammar-overview.tsx`, `grammar-detail.tsx`, `grammar-parts.tsx` (filter chip, pattern card, structure, examples, notes, related), `grammar-types.ts`, `grammar-data.ts`, `grammar-logic.ts` (filtering, search, normalisation), `grammar.module.css`.
- Tests: `grammar.test.tsx`, registered in `tsconfig.test.json` and the `npm test` script.
- Other: `[category]/page.tsx` (one-line change).

## Testing
Automated tests cover data integrity (unique ids, valid categories and relations, no slashes or brackets in rōmaji), category filtering, search over Japanese, Vietnamese (with and without diacritics) and category names, combined search and filter, unknown ids, explicit relations only, Overview and Detail rendering, card content taken from each entry's first example, cards without examples, the optional rōmaji toggle, missing optional sections, optional illustrations, and the empty, loading and error states. The Detail rōmaji toggle itself and interaction flows are checked in the browser rather than by rendered unit tests. CSS Modules are mocked in memory, so the test writes no stub file to disk.

## Limitations / next steps
- Demo data only: no published-content integration, API or persistence.
- Content, translations and rōmaji need independent content review before any production use.
- Real-device testing, a full accessibility audit and non-Chromium browsers remain open.
- The `1 Issue` development badge noted above is unverified.
- Deferred cleanup (not part of this change): the old Grammar branch in `category-detail.tsx` and `MOCK_GRAMMAR_ITEMS` are now unreachable for `/skills/grammar`.
