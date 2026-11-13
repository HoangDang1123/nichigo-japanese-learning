# Nichigo — Visual Design System & Theme Specification (v1.2)

**Status:** Product Owner approved the conceptual layouts below and Light/Dark/System modes. Layout concepts are design direction, not evidence of implemented screens or approval of their release scope. Source and verification status live in [the feature roadmap](05-BACKLOG.md) and [implementation notes](implementation/README.md).

## Identity and design intent
- **Product name:** Nichigo. The name was selected by the Product Owner; domain availability and final logo assets are separate decisions.
- **Art direction:** **Modern Japanese Learning Studio** — modern education first, Japanese editorial composition second, restrained shodō/calligraphy accents third.
- **Visual priorities:** content-first lessons, readability of Vietnamese and Japanese, recognizable Japanese stationery/textbook aesthetics without cliché decoration.
- **Current palette:** Sakura Pink semantic light/dark tokens in `nichigo_frontend/src/styles/themes.css` (light background `#fff9fb`, primary `#983b62`; dark background `#17191c`, primary `#dda3bd`). The earlier sage/cream/amber proposal is historical, not the active palette. Change color values centrally rather than in component CSS.
- **Light/Dark/System:** all three are mandatory; default to System.
- **Branding:** reuse the existing assets in `nichigo_frontend/public/branding/`. Do not replace them or treat generated AI images as production-ready design specifications without owner review.

## Approved typography

The Product Owner approved **Be Vietnam Pro** for all Vietnamese and general interface text, **Noto Sans JP** for Japanese learning content, and **Noto Serif JP** only for decorative Japanese editorial accents. This is a project-wide rule, independent of the status of any individual screen.

| Semantic token | Font | Use |
| --- | --- | --- |
| `--font-body` | Be Vietnam Pro | UI copy, navigation, forms, buttons, cards, labels and Vietnamese explanations. |
| `--font-heading` | Be Vietnam Pro | Page, section and lesson headings, including Learning Path. |
| `--font-japanese` | Noto Sans JP | Kana, kanji, vocabulary, examples, furigana and ordinary Japanese learning text. |
| `--font-japanese-serif` | Noto Serif JP | Short decorative Japanese labels and editorial accents only. |

Load fonts once in the root layout with `next/font/google` and CSS variables; use `display: swap` and local system fallbacks. Preload only the Latin and Vietnamese Be Vietnam Pro subsets used by the interface. Japanese font files load on demand through their Unicode ranges, without preloading every CJK subset. Production builds fetch these font assets; CI needs build-time access to Google Fonts or a separately reviewed local-font fallback. Keep the existing size, weight and line-height tokens in `src/styles/tokens.css`: body text starts at `--font-size-base` with `--line-height-normal`; headings use the existing scale and clear semibold hierarchy. Choose only weights the interface uses. Do not apply Japanese serif to Vietnamese text or ordinary learning content. For mixed-language labels, style the Japanese span separately and mark it `lang="ja"`.

Check Vietnamese diacritics and Japanese glyphs in both Light and Dark at desktop and mobile widths. Keep a legible line height, visible focus states and wrapping without horizontal text overflow. Font choices must remain the same in System mode as the resolved theme changes.

### Japanese Reading & Rōmaji Typography

Project-wide convention for showing how Japanese is read. It applies to new and future Kana, Vocabulary, Grammar, Flashcards and related learning UI; it is not a mandate to refactor existing modules in one pass.

- **Style.** Hepburn rōmaji is *italic* by default, in a semantic secondary colour (for example `--color-text-muted`).
- **Typeface.** Rōmaji is Latin text: use the regular Latin UI face (`--font-body`), never the Japanese font stack or Japanese glyph styling.
- **No decoration.** Do not wrap rōmaji in phonemic slashes `/…/` or phonetic brackets `[…]`, and do not put it in badges or chips. Rōmaji is a Latin-script representation of Japanese, **not IPA**.
- **Other text stays plain.** Japanese text and Vietnamese meanings are not italic unless another documented style requires it independently.
- **Example sentences.** Rōmaji for a whole sentence may be optional and collapsed by default (a small text control such as “Hiện cách đọc”, exposing its state with `aria-expanded`) so learners are nudged to read Japanese script first. Place it between the Japanese sentence and its Vietnamese translation.
- **Data integrity.** Never infer a kanji word's reading from its glyphs, and never generate sentence readings in bulk. Use authoritative or hand-curated reading data only; when none exists, omit the reading and its toggle instead of guessing. Do not alter example sentences to fit a reading.
- **Markup.** Mark Japanese spans `lang="ja"`; rōmaji spans need no `lang` override.

Current deviations (reported, not yet changed): the Kana chart tiles render rōmaji in `--font-mono` and upright, while the Kana detail drawer already uses italic secondary text.

## Approved conceptual layouts

These describe composition and interaction intent. The shared shell and Home Study Desk presentation are present in current source; other planned screens and real learning progress need scoped feature work and acceptance review. See the roadmap before scheduling implementation.

| Area | Direction |
| --- | --- |
| Shared AppShell | One consistent collapsible desktop sidebar, responsive mobile drawer, shared header and semantic theme states. Expanded/collapsed modes use a panel-style toggle, aligned icons, and Profile/Settings near the bottom. Focused lessons can hide the sidebar through the shell. |
| Home | Minimal Study Desk with a clear next step; personalize from real progress only when authenticated data exists. |
| Learning Path | Railway Journey showing ordered learning stages. The `/learn` route now has a presentation preview; station labels and state variants are explicitly illustrative until real content and progress are integrated. |
| Course | Chapter Canvas for a course's reviewed chapters and lessons. |
| Lesson | Notebook-style reading interface with legible Vietnamese/Japanese content. |
| Focus Lesson | Distraction-free writing practice using verified stroke or writing assets where available. |
| Skills | Editorial learning library for free exploration of published content. |
| Mini Games | Separate layouts suited to each game, including a town map, quiz and flashcards. Game release scope remains unapproved. |
| Profile | Identity, goals, achievements and learning activity backed by supported data. |
| Settings | Theme, language and password/account controls only where behavior is supported. |

The current source implements the shared AppShell, Light/Dark/System switcher and real NichiGo branding. The owner-reviewed sidebar refinements from `e2c8c08` are merged in `origin/main` at `c1b254c` via PR #13, verified on 2026-11-04. This records sidebar appearance approval and merge status, not full shell acceptance or release. `/learn` has a railway presentation preview without published lessons or progress; `/skills` and `/progress` remain empty states. `/courses`, `/games`, `/profile`, and `/settings` are unavailable navigation proposals. Home presents the Study Desk layout with honest empty states; personalized resume, activity and goals still require real JPN-040/JPN-041 data.

## Theme architecture
- Centralize semantic color tokens in CSS (e.g. `src/styles/tokens.css` and `src/styles/themes.css`); use `:root`/light and `[data-theme="dark"]` or an equivalent documented selector.
- Style components through semantic variables such as `--color-background`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-primary`, `--color-on-primary`, `--color-accent`, `--color-focus`, `--color-danger`, `--color-success`, plus hover/disabled states. Do not embed raw color hex values throughout components.
- Include tokens for typography, spacing, radius, stroke/border and motion; document how to swap palettes in one place.
- **Mode behavior:** persist explicit light/dark/system preference locally; when System is selected, resolve `prefers-color-scheme` and react to OS changes. Restore preference without a visible wrong-theme flash/hydration mismatch.
- Use `next-themes` if compatible with the chosen Next.js version; this is a proposal, not an enforced dependency. Theme mode is not a separate per-user backend feature.
- Theme switcher must be keyboard and screen-reader accessible. Respect `prefers-reduced-motion` and ensure readable contrast in both effective modes.
- The spotlight tour, dialogs, tooltips, forms, lesson pages, writing grids, feedback/error states and navigation must follow the active theme.

## Skeleton Loading System

Skeletons represent **initial loading of a real data-backed region**, not a confirmed empty result, error, static preview, or brief button submission. The shared `Skeleton` primitive in `nichigo_frontend/src/components/ui/skeleton.tsx` offers `line`, `circle`, and `block` shapes with optional width and height. A `SkeletonRegion` gives one nonvisual status announcement and marks the corresponding content region busy; every decorative shape is hidden from assistive technology and cannot receive focus.

Use `--color-skeleton-base` and `--color-skeleton-highlight` from the centralized Light/Dark/System theme definitions and `--duration-skeleton` from motion tokens. The pulse is subtle, has no bright moving gradient, and stops under `prefers-reduced-motion: reduce`. Skeletons use the same radii, spacing, responsive grids and panel proportions as the content they precede. Avoid fixed white highlights, arbitrary progress percentages, fake learner data, and animated placeholders with no pending request.

The Home Study Desk composition follows its welcome, resume, activity, recommendations, goal and quick-access layout during the existing auth session check. Railway and Skills compositions are available for future published-content loading, but their current static preview/empty routes do not mount them. Stable AppShell branding and navigation remain visible. When initial loading resolves, render actual content, a confirmed empty state or a distinct unavailable/error state. During background refresh, retain valid content with a small pending indicator where possible. See [JPN-UI-003 implementation notes](implementation/JPN-UI-003-skeleton-system.md) and the [root agent policy](../AGENTS.md#ui-loading-states-and-skeleton-policy).

## Japanese editorial / calligraphy usage
- A restrained paper/washi feel through warm backgrounds and fine dividers; no heavy faux textures that hurt readability.
- Chapter numbering, vertical rhythm, typographic hierarchy, subtle asymmetry and grid-aware composition can evoke Japanese books/stationery.
- Brush strokes, a stamp/seal, or large Japanese glyphs are **selective accents** (e.g. section headers or kana intro), not UI navigation or body text.
- Use legible typefaces with correct Vietnamese diacritics and Japanese glyph coverage. For kana/kanji study and stroke guidance, use unambiguous, verified glyphs/assets rather than decorative calligraphy.
- Preserve intentional whitespace and keep decoration out of lesson reading and writing areas unless it aids orientation.
- The heuristic **70% modern education / 20% Japanese editorial / 10% calligraphy** expresses visual balance, not a measurable acceptance criterion.

## Anti-generic-UI principles
- Avoid ubiquitous gradients, glassmorphism, oversized rounded cards, stacked shadows, redundant icons/emoji and generic SaaS dashboard hero + three cards.
- Different learning tasks require task-specific layouts: kana study grids, vocabulary lists/cards, grammar explanations with examples, focused quiz surfaces, progress without chart overload.
- Prefer meaningful whitespace, restrained borders and typographic hierarchy. Animations must help feedback/orientation rather than continuously decorate the page.
- Use real, checked Japanese example content in reviewed screens; no invented pedagogical claims or cliché placeholder copy.
- No template or UI library guarantees originality: **review actual screenshots** on desktop and mobile, in light and dark, before closing UI tickets.

## UX acceptance checks
1. Switching Light / Dark / System works; System follows OS changes, preference survives reload.
2. No incorrect-theme flash on first load; no hydration errors.
3. Change the palette by editing central variables only; representative components adapt without hunting JSX hex values.
4. Verify readable foreground/background, focus outline, hover, disabled, error and success states in both effective modes.
5. Guided tour retains dimmed backdrop, focused DOM target, correctly anchored arrow, controls and progress in both modes.
6. Screens use task-appropriate layout and clear hierarchy, not repeated generic card templates.
7. Desktop/mobile screenshots for home, first lesson, quiz and tour are reviewed by PM/Owner before UI acceptance.

## Ownership
Owner approves identity/palette direction and visual changes; PM updates docs/acceptance; Antigravity implements a ticket at a time. Do not silently replace the chosen direction with a generic generated theme.
