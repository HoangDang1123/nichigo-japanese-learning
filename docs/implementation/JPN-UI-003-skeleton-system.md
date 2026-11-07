# JPN-UI-003 — Reusable Skeleton Loading System

## Scope and status

This frontend infrastructure branch adds a shared skeleton primitive, one currently mounted Home composition, and reusable Railway/Skills compositions for future real data loaders. It updates no backend, auth contract or progress source. JPN-UI-003 is distinct from JPN-003's shared shell and generic loading/error states. Source and tests are implemented on `jpn-ui-003/features/frontend-skeleton-system`; owner visual review, merge and release remain separate.

## Loading audit

Classification: **A** real initial asynchronous content load; **B** loading is owned by a parent; **C** short interaction pending state; **D** synchronous/static. No production request was added for this ticket.

| Route or component | Class and loading source | Previous behavior | Skeleton decision | Reason |
| --- | --- | --- | --- | --- |
| `/` Home Study Desk | A: Redux `checkSession()` at app startup | `checking` copy appeared inside otherwise empty-looking resume/activity/goal panels | **Mounted** `HomeSkeleton` while auth status is `checking` | Preserve welcome, two-column panels and quick links without implying confirmed empty progress. |
| Home verified progress adapter | Future A: JPN-040/041, currently `null` | No progress request exists | **Deferred** data-specific transition | No endpoint or verified learner progress is available. |
| `/login`, `/register` initial session check | C: shared auth check | Brand and `LoadingState` status spinner | **Kept** | Short, focused transition; form is not a content feed. |
| Auth submit, logout, account menu | C/B: mutation or shared auth state | Pending button/disabled account control | **Kept** | Preserve action feedback and stable header; no content panel to skeletonize. |
| `/learn` Railway | D now; future A with published Path | Interactive, explicitly illustrative preview | `LearningPathSkeleton` **available, not mounted** | No live published-content loader or invented delay. |
| `/skills` | D now; future A with published Skills | Honest static empty state | `SkillsSkeleton` **available, not mounted** | No Skills API adapter exists. |
| `/progress` | D: static empty state | Honest unavailable/empty view | **None** | No progress data request. |
| AppShell, sidebar, mobile nav, brand, theme switcher | D, with account identity owned by auth parent | Stable navigation and account checking label | **None** | Keep navigation usable while page content loads. |
| `/dev/ui`, `/dev/states` | D: static development previews | Existing component examples | **None** | No asynchronous source. |
| Next.js `loading.tsx` | No current server-side content load | No route loading files | **None added** | The Home auth check is client-side; a route fallback would not represent it accurately. Revisit with future server data loaders. |

## Shared API and implementation

`src/components/ui/skeleton.tsx` exports `Skeleton({ variant, width, height, className })`, where `variant` is `line`, `circle` or `block` and defaults to `block`. Width and height are React CSS dimensions; they are the only inline styles. Every shape has `aria-hidden="true"`, no role and no focus target. `SkeletonRegion({ label, className, children })` renders one visually hidden status announcement and a busy content region. Put only decorative placeholders inside it, and replace the region when loading settles.

`src/styles/themes.css` supplies light and dark `--color-skeleton-base` and `--color-skeleton-highlight`, including the system-dark fallback. `src/styles/tokens.css` supplies `--duration-skeleton`. The primitive CSS Module uses a restrained color pulse and disables it under reduced motion. CSS Modules for Home, Railway and Skills compose the shapes with existing spacing, radii and responsive grids. No skeleton library, client directive, image asset or fabricated progress was added.

`HomeState` uses the existing Redux auth status: `checking` shows `HomeSkeleton`; `guest`, `authenticated` and `unavailable` continue through `HomeStudyDesk`. The live adapter still passes `progress: null`. A supplied verified progress object remains a future presentation path; the test-only supplied value is never used at runtime. Once session checking resolves, Home displays content, a confirmed empty state or the existing unavailable copy. There is no background progress refresh today, so no refresh skeleton is mounted. The Railway and Skills compositions are exported for their future data adapters and are deliberately absent from their current routes.

## Automated verification

Run from `nichigo_frontend`: `npm run lint`, `npm run type-check`, `npm run test`, `npm run build`. The Node test runner renders real React markup by stubbing emitted CSS Module imports; CSS token/motion assertions read the source styles. Existing auth and theme tests remain in the suite. This test technique verifies markup and state selection, not pixel appearance.

| ID | Status | Evidence or limit |
| --- | --- | --- |
| SKEL-01 | PASS | `skeleton.test.tsx` renders line, circle and block with requested dimensions. |
| SKEL-02 | PASS | CSS test checks semantic color variables and no fixed palette colors in the primitive. |
| SKEL-03 | PASS | CSS test checks reduced-motion animation override. |
| SKEL-04 | PASS | Rendered shapes are hidden from assistive technology and not focusable. |
| SKEL-05 | PASS | Home auth `checking` selects the actual Home skeleton. |
| SKEL-06 | PASS | Resolved supplied-progress presentation renders content without a skeleton in a test-only fixture. |
| SKEL-07 | PASS | Guest and authenticated-without-progress render established empty/navigation content. |
| SKEL-08 | PASS | Auth `unavailable` renders existing unavailable copy without a skeleton. |
| SKEL-09 | DEFERRED | No background content refresh exists; future adapters must retain valid content. |
| SKEL-10 | PASS | Home skeleton markup has no progress, XP, streak or interactive business data. |
| SKEL-11 | PASS | Current Railway route does not mount its future skeleton. |
| SKEL-12 | PASS (visual) | Browser screenshots at 1440 × 900 and 500 × 844 show the Home skeleton fitting the AppShell with stacked mobile panels and no visible horizontal clipping. Automated pixel/overflow measurement is not available. |
| SKEL-13 | PASS (visual/token) | Light and Dark browser screenshots reviewed at desktop and mobile widths; System uses the existing theme provider and matching dark-media token fallback. |
| SKEL-14 | PARTIAL | Existing auth and theme tests pass; no separate navigation test exists. |

## Accessibility, visual review and limitations

The busy region has a single nonvisual announcement; decorative shapes are hidden and do not enter tab order. Navigation, theme and account controls remain in the AppShell. The pulse is disabled for reduced motion. A temporary, uncommitted preview route rendered the Home skeleton inside the real AppShell. Headless Chrome screenshots at 1440 × 900 and 500 × 844 in Light and Dark were inspected on 2026-11-07. Panels stack at mobile width, colors follow the theme, and no horizontal clipping is visible. The preview route was removed before committing. A 390 px image could not be reliably evaluated because Chrome's headless window layout cropped its minimum content width; 500 px is the verified mobile size. A live loading-to-loaded pixel shift comparison and automated overflow measurement remain unverified. These screenshots are local verification, not owner visual approval.

`npm run lint`, `npm run type-check`, `npm run test` (six tests) and `npm run build` all passed on 2026-11-07. `git diff --check` passed.

Future JPN-030 published Path and Skills loaders should mount their compositions only while a real initial request is pending; they must replace them with data, a confirmed empty state, or a distinct error. JPN-040/041 should retain current Home progress during background refresh. The auth form keeps its existing spinner/pending controls. No fake network request or Next.js route fallback was added.
