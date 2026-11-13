# JPN-036 — Vocabulary Skill UI Foundation (frontend)

> **Prototype status.** This is a **frontend UI prototype on demo data**. Product Owner visual approval of *Vocabulary UI prototype v1* is a visual approval only. It is not approval of the whole ticket, of the learning rules, of the content, or of a release. It is **not merged and not released**.

**Ticket:** JPN-036 — Vocabulary Skill UI Foundation (registered in [the backlog](../05-BACKLOG.md); JPN-033 remains Flashcards). **Branch:** `jpn-036/features/frontend-vocabulary-ui-foundation`. **Depends on:** JPN-003, JPN-UI-002, JPN-035 (Skills overview). Frontend only: no backend, database or API changes, so there is no FE/BE integration to verify.

## Scope
Included (all under `/skills/vocabulary`, inside the unchanged AppShell):
- **Vocabulary Home** — one topic catalogue (8 topics, 72 demo words) with word counts and progress, plus entries to Explore and Saved.
- **Topic study** — a session of groups of up to 10 words (a 24-word topic is 10 + 10 + 4).
- **Pre-study review modal** — a blocking dialog of previously studied words.
- **Post-study knowledge check** — one question per word of the group just studied.
- **Explore** and **Saved** — search, selected-word detail, related words and bookmarking.
- **Real routes** and an in-memory demo state and learning-logic layer.

Not included: Flashcards (JPN-033), Grammar, Kanji or other Skills; pronunciation audio; published-content integration; backend, API, database or persistence; production spaced repetition.

## Status (kept separate)
- **Implemented:** all screens, routes and interactions above.
- **Tested** (from `nichigo_frontend/`, on this branch on top of `origin/main` `26176ca`): `npm run lint` clean; `npm run type-check` clean; `npm test` — 79 tests, 79 pass, 0 fail (includes the Vocabulary suites below); `npm run build` succeeds and prerenders `/skills/vocabulary`, `/skills/vocabulary/explore`, `/skills/vocabulary/saved` and `/skills/vocabulary/study/[topicId]` (8 topics).
- **Real-browser QA (automated):** headless Chrome driven with puppeteer-core against a production build, desktop 1280/1440/1920 and mobile 390/320 (plus 1024 and 768 spot checks), Light and Dark. It covered layout stability between questions, sidebar column alignment, auto-advance, focus movement, the review-modal failure layout at 900px height, the route and state flow, and no horizontal overflow. The QA scripts and screenshots were kept outside the repository and are not part of this change. QA was run on the Vocabulary work before it was committed; the same source was re-verified (lint, type-check, tests, build) on this branch.
- **Reviewed:** Product Owner **visually approved Vocabulary UI prototype v1** (screens and interactions as demonstrated by screenshots). Visual approval only.
- **Pending:**
  - **Independent content review of nine example-sentence rōmaji readings** (below).
  - **Real-device (touch) testing.**
  - **A comprehensive accessibility audit** (screen reader output, full keyboard pass); only the checks listed under QA were done.
  - Browsers other than Chromium.
- **Not implemented:** backend, API, database, persistence, production spaced repetition, audio.
- **Merged:** no. **Released:** no.

## Routes and state lifetime
| Route | Screen |
|---|---|
| `/skills/vocabulary` | Home (topic catalogue, Explore and Saved entries, demo-only control) |
| `/skills/vocabulary/explore` | Explore |
| `/skills/vocabulary/saved` | Saved |
| `/skills/vocabulary/study/[topicId]` | Topic study, knowledge check and group result (`topicId` is a static demo topic id; unknown ids return 404) |

All four are wrapped by `app/skills/vocabulary/layout.tsx` (AppShell plus `VocabularyProvider`). Next.js keeps a layout mounted across client navigation, so progress, bookmarks and the active session **survive in-app navigation and browser Back/Forward**. They are held in memory only and are **reset by a full page load or refresh, and by leaving the `/skills/vocabulary` layout**. A direct load of a study route has no session, so it re-runs the start rules (review modal if there are previously studied words, otherwise start). The Vocabulary demo state does not touch any other part of the app.

`[category]/page.tsx` no longer prerenders the `vocabulary` category, because the static `/skills/vocabulary` route takes over.

## State model
Four independent pieces of state, deliberately not conflated:
- **Word content** — static demo data (`vocabulary-data.ts`).
- **Learning progress** — `new | learning | review | learned` per word (`ProgressMap`).
- **Bookmarks** — a set of word ids. **Saved is not Learned**: bookmarks never influence learning rules or review selection.
- **Quiz and session state** — the question runner, the study session (group, word, stage, furthest word reached, per-group check result) and the review modal.

Everything is in `VocabularyProvider` (context) and pure functions in `vocabulary-logic.ts`, so it can be replaced by real learning APIs later.

## Learning flow (frontend demo rules, not production rules)
- **Study.** Groups of up to 10 words. Viewing a word only moves `new → learning`; **Next never marks a word `learned`**. The group list on the right shows only the current word and visited words; **upcoming words show only "Từ N / Chưa mở"** and no Japanese or meaning appears in the page for them.
- **Pre-study review modal.** Shown only when previously studied words exist. Selection: words with state other than `new`, **across all topics**, ordered `review`, then `learning`, then `learned`, up to 10. Bookmarks are never an input, and brand-new words are never included. With zero eligible words the session starts without the modal. Questions: one multiple-choice question per word. Pass threshold `ceil(0.8 × questionCount)`. A failed attempt lists the wrong answers and disables retry for **30 seconds**; **Skip and continue learning** is always available and is recorded as "skipped", never as a pass. Esc or the close button returns to Home without starting. Review results do not change progress. It uses a native `<dialog>` with focus return.
- **Answering.** Choosing an answer records it once, locks the options, shows correct/incorrect feedback for 600 ms (with a check mark, text and screen-reader text, not colour alone) and advances automatically. There is no confirm button.
- **Post-study knowledge check.** Covers exactly the words of the group just studied, with the same 80% threshold. If it passes, correct words become `learned` and incorrect words `review`. If it fails, correct words become `learning` and incorrect words `review`. A failed group may continue to the next group, but it is **not marked completed**, and the result screen says so.
- **Demo-only control.** A clearly labelled "Công cụ demo" panel on Home switches between 0, 4 and 10 previously studied words to demonstrate the modal. It is not a learner feature, and changing it resets the demo progress.

## Explore and Saved
- **Search** matches Japanese text, kana, rōmaji or Vietnamese meaning, ignoring macrons and Vietnamese diacritics.
- With an empty query, Explore shows a small hand-picked discovery list (11 words across topics). There are no filters, sorting or JLPT levels.
- **Related words** come only from hand-authored relation data, with the labels Cùng chủ đề, Thường đi với, Đồng nghĩa and Trái nghĩa. Words with no authored relation show a plain "no related words" line. No relation is inferred.
- **Saved** has its own search, selected-word detail, related words, an unbookmark action and an empty state.

## Rōmaji and example readings
- Word rōmaji is shown in italic, secondary text, following the new [Japanese Reading & Rōmaji Typography](../07-DESIGN-SYSTEM.md) rule. It is Hepburn and is never wrapped in slashes or brackets.
- Example sentences have an optional **"Hiện cách đọc"** control (collapsed by default, `aria-expanded`) that shows the sentence rōmaji between the Japanese sentence and its Vietnamese translation. The toggle is omitted when no reading exists, and it resets when the word changes.
- **Nine example-sentence readings are hand-curated and need independent content review before any production use:** `greetings-02`, `-03`, `-04`, `-05`, `-06`, `-07`, `-09`, `-11` and `school-01` (in `vocabulary-data.ts`, `EXAMPLE_ROMAJI`). They were written from the sentences' standard readings. They are **not** verified by a second reviewer. All other examples have no reading data and no toggle. Readings are never derived from kanji.

## Files
- Routes: `nichigo_frontend/src/app/skills/vocabulary/` — `layout.tsx`, `page.tsx`, `explore/page.tsx`, `saved/page.tsx`, `study/[topicId]/page.tsx`.
- Components and logic: `nichigo_frontend/src/components/skills/vocabulary/` —
  - `vocabulary-types.ts`, `vocabulary-data.ts`, `vocabulary-logic.ts`, `vocabulary-provider.tsx` (types, demo data, pure rules, in-memory state)
  - `vocabulary-home.tsx`, `topic-study.tsx`, `study-session.tsx`, `review-modal.tsx`, `quiz-runner.tsx`, `word-browser.tsx`, `vocabulary-parts.tsx`
  - `vocabulary.module.css`, `vocabulary-quiz.module.css`
- Tests: `vocabulary-logic.test.ts`, `quiz-runner.test.tsx`, `study-rail.test.tsx`, registered in `tsconfig.test.json` and the `npm test` script.
- Other: `[category]/page.tsx` (one-line change), `docs/07-DESIGN-SYSTEM.md` (rōmaji rule, separate commit).

## Testing
Automated tests cover review eligibility (0, fewer than 10, 10 and the cap), the pass threshold, the retry countdown, 10-word grouping, learning-state transitions, failed-check continuation without false completion, single answer submission and auto-advance (no double advance, timer cancellation, result transition), stable prompt structure for kanji and kana-only words, the masked group list and its three-column structure, the example-reading toggle and its missing-data behaviour, bookmark and progress independence, search, related words and the saved empty state. Some assertions read source or CSS text, which is brittle under refactoring. Focus movement after an answer, and the toggle reset when the word changes, are checked in the browser rather than by rendered unit tests.

## Console errors when the backend is not running
Every page logs `GET http://localhost:8080/api/v1/auth/me` failing with `ERR_CONNECTION_REFUSED`. This is the existing authentication session check (`checkSession`, dispatched from the root Redux provider), configured through `NEXT_PUBLIC_API_BASE_URL`. It happens on `/skills` and `/skills/kana` as well, so it is not Vocabulary code. Vocabulary adds no network requests.

## Limitations / next steps
- Demo data only. No published-content integration, API, persistence or production spaced repetition; these need their own design.
- Audio is a visible but **disabled** placeholder with no handler, audio, TTS or API.
- Progress and bookmarks reset on refresh and when leaving the Vocabulary routes.
- Decisions to confirm before production: cross-topic review selection, allowing a failed group to continue, the 80% threshold and the 30-second retry for the real learning flow.
- Deferred cleanup (not part of this change): the old Vocabulary branch in `category-detail.tsx` and its mock data are now unreachable for `/skills/vocabulary`, and `vocabulary.module.css` defines `.resultList` twice. The JPN-035 note's remark that the Vocabulary page shows a few demo items describes the earlier state and is superseded by this ticket; that note is intentionally not edited here.
- Real-device testing, a full accessibility audit, and non-Chromium browsers remain open.
