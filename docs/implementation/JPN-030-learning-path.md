# JPN-030 — Learning Path railway presentation

**Status (2026-11-06):** The Product Owner approved the Railway Journey frontend UI after polish iteration 2. This is presentation approval only; JPN-030 content, progress, and free skill browsing are still incomplete. No merge, release, or end-to-end JPN-030 completion is claimed.

## Scope and architecture

The `/learn` route reuses the existing AppShell and renders `LearningPathState`. The state adapter currently supplies `null` because the repository has no published learning path API, content dataset, or learner progress source. It does not infer progress from authentication.

`LearningPathJourney` contains typed `LearningPathData`, `LearningStation`, and `LessonSection` interfaces for future verified content and progress. Reusable station buttons support completed, current, upcoming, and locked visual variants. Their current labels are **Mẫu 01–04** with explicit appearance descriptions; these are an interactive UI preview, not real lessons or learner progress. Selecting a sample updates the local information panel only; it never opens an unavailable lesson route. The Irodori / Sơ cấp 1 label is a visual reference in preview mode, not a claim that licensed Irodori content is published. The selector is disabled until a real path list exists.

The page includes a railway with CSS/SVG landscape decoration, selected lesson area, lesson content breakdown empty state, review panel, and study streak panel. Iteration 2 draws the railway through equal grid-column station centres, with a curve generated from station count. Hover changes only the circular node for eligible unselected stations; the button's full hit area remains clickable. Selection uses a persistent circular Sakura outline, and keyboard focus adds a separate circular focus ring. Locked preview variants do not gain hover styling. Lesson, streak and review empty panels use less space and no oversized bordered placeholder. No fabricated lesson titles, completion counts, review totals, or streak values are shown. Light, Dark, and System inherit existing semantic tokens. Desktop and mobile use the existing AppShell; the railway is internally scrollable on narrow screens.

## Integration and limits

JPN-020/JPN-023 must provide approved, published ordered content and its usage rights. JPN-040 must provide verified lesson/review/streak progress. A future adapter should map those sources into `LearningPathData`, handle loading and error states, and confirm any lesson navigation destination before enabling it. The proposed `/learning-paths` and `/progress` contracts are not implemented. No backend, auth, database, quiz, lesson reader, or persistence changes are part of this presentation phase. JPN-030 also includes free skill browsing, which this change does not implement.

## Verification

The Railway UI was visually checked in the source worktree at 1440px, 768px, 390px, and 320px in Light and Dark. The document width did not exceed the viewport at any checked width; the railway scrolls inside its labeled region at 390px and 320px. Browser interaction checks confirmed that hover changes only the unselected circle, mouse leave clears that effect, the selected circle retains its ring, the locked sample has no hover effect, and the station button background stays transparent. Click, Enter, and Space changed the selected station and `aria-pressed` state. Keyboard focus produced a circular outline; station node and button dimensions stayed fixed through hover. The owner approved this frontend presentation. System uses the shared theme behavior and was not independently re-tested.

The approved global Be Vietnam Pro / Noto Sans JP / Noto Serif JP typography change (JPN-UI-002) is separate uncommitted work and is deliberately excluded from this JPN-030 branch. The Railway uses semantic font tokens already present on `main`, so the isolated branch builds with the existing system font fallbacks. Final typography parity with the owner-reviewed source worktree depends on JPN-UI-002 landing separately.

On the isolated JPN-030 branch from `origin/main`, frontend lint, type-check, both existing tests, and production build passed. The production build includes `/learn` as a static route.
