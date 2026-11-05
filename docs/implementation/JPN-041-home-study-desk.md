# JPN-041 — Home Study Desk presentation

**Status (2026-11-06):** Frontend presentation and its second visual polish iteration are implemented. The Product Owner approved **Desktop Light after polish iteration 2**. Dark and Mobile were tested by Codex but have not received independent visual approval from the owner. No merge, release or complete JPN-041 integration is claimed.

**Frontend branch:** `jpn-041/features/frontend-study-desk`, based on `origin/main` at `81c33d5`. This branch contains Home presentation and directly related documentation only; backend integration remains future JPN-040/JPN-041 work.

## Scope and architecture

The `/` route keeps the existing JPN-003 `AppShell`, including sidebar, mobile drawer, header, branding and Light/Dark/System theme control. `src/app/page.tsx` now renders the Home state adapter inside that shell.

- `src/components/home/home-state.tsx` reads the existing Redux auth status and user. It passes no progress data because the current application has no learning progress source.
- `src/components/home/home-study-desk.tsx` renders the welcome, resume, recommendations, activity, goal and quick-access areas. Its exported `HomeProgress` interface is a future presentation boundary for **verified** learning data.
- `src/app/home.module.css` provides responsive Study Desk styling using existing semantic theme variables. No new palette, logo, sidebar or UI dependency was added.

The view distinguishes authenticated learners with a supplied real `HomeProgress` object, authenticated learners without it, guests, auth checking, and auth unavailable. Resume titles, completed counts, activity minutes, recommendations and goal percentages only render when supplied through that typed object. The live adapter currently supplies `null`, so it never presents fabricated learner history. Empty states and generic exploration links remain visible.

Iteration 2 tightened the welcome composition and moved its sakura accent into a smaller editorial detail. Empty resume panels are shorter and their primary action is more prominent; real resume data retains a taller layout. The activity empty state now uses seven unfilled weekday markers instead of dashed bar shapes. Navigation suggestions are headed **“Bắt đầu từ đây”** until verified recommendation data exists, when **“Hôm nay nên học gì?”** is used. The empty goal state uses a compact icon rather than a large ring. Quick Access cards have refined spacing, a small top accent and explicit focus styling. Unavailable Home copy is concise while the shared header continues to report connection state.

## Routes and behavior

Quick Access links for Kana, Vocabulary and Grammar open the existing `/skills` route; Practice opens `/learn`. Recommendations without personalized data link to those same routes. These destinations are currently placeholder screens, not functional lessons or exercises. A guest can also open `/login`. No new route or API is introduced.

The existing auth provider still decides whether the visitor is authenticated, a guest, checking, or unavailable. The Home view does not change authentication requests or contracts. It does not persist or infer progress from auth identity.

## Verification and limitations

Run from `nichigo_frontend`: `npm run lint`, `npm run type-check`, `npm run test`, and `npm run build`. All passed on 2026-11-06; the existing test suite has two passing tests covering auth and theme switcher. A production preview can be opened with `npm run start` at `/` and checked with the shared theme switcher. Headless browser captures at 1440px, 768px, 390px and 320px in Light and Dark confirmed no horizontal overflow and links only to existing `/learn` and `/skills` routes. Guest, authenticated-without-progress and checking copy were checked through temporary local responses to the existing auth endpoint; the unavailable state was checked with that endpoint offline. The temporary responses are outside the repository. The supplied-progress presentation path remains unintegrated and was not visually checked with real learner data. Owner visual approval covers Desktop Light only; Dark and Mobile approval remains pending.

JPN-040 must first supply persisted completion and resume data. JPN-041 integration then needs an approved progress contract, an adapter mapping verified responses into `HomeProgress`, validation of route destinations, and joint checks that Home, path and skills show consistent progress. The current UI does not establish a goal editor, recommendation algorithm, activity totals, practice flow or completed feature acceptance. Security remains under the existing auth/session model; no learner data is sent by this Home implementation.
