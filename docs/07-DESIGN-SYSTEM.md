# Nichigo — Visual Design System & Theme Specification (v1.2)

**Status:** Product Owner approved visual direction and three theme modes. Technical implementation details below are PM recommendations, subject to engineering validation.

## Identity and design intent
- **Product name:** Nichigo. The name was selected by the Product Owner; domain availability and final logo assets are separate decisions.
- **Art direction:** **Modern Japanese Learning Studio** — modern education first, Japanese editorial composition second, restrained shodō/calligraphy accents third.
- **Visual priorities:** content-first lessons, readability of Vietnamese and Japanese, recognizable Japanese stationery/textbook aesthetics without cliché decoration.
- **Initial palette:** muted sage green (#4F8F7B), warm cream (#FBFAF6), amber accent (#F4B860), dark ink text (#263238). These are editable defaults, **not immutable brand requirements**.
- **Light/Dark/System:** all three are mandatory; default to System.

## Theme architecture
- Centralize semantic color tokens in CSS (e.g. `src/styles/tokens.css` and `src/styles/themes.css`); use `:root`/light and `[data-theme="dark"]` or an equivalent documented selector.
- Style components through semantic variables such as `--color-background`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-primary`, `--color-on-primary`, `--color-accent`, `--color-focus`, `--color-danger`, `--color-success`, plus hover/disabled states. Do not embed raw color hex values throughout components.
- Include tokens for typography, spacing, radius, stroke/border and motion; document how to swap palettes in one place.
- **Mode behavior:** persist explicit light/dark/system preference locally; when System is selected, resolve `prefers-color-scheme` and react to OS changes. Restore preference without a visible wrong-theme flash/hydration mismatch.
- Use `next-themes` if compatible with the chosen Next.js version; this is a proposal, not an enforced dependency. Theme mode is not a separate per-user backend feature.
- Theme switcher must be keyboard and screen-reader accessible. Respect `prefers-reduced-motion` and ensure readable contrast in both effective modes.
- The spotlight tour, dialogs, tooltips, forms, lesson pages, writing grids, feedback/error states and navigation must follow the active theme.

## Japanese editorial / calligraphy usage
- A restrained paper/washi feel through warm backgrounds and fine dividers; no heavy faux textures that hurt readability.
- Chapter numbering, vertical rhythm, typographic hierarchy, subtle asymmetry and grid-aware composition can evoke Japanese books/stationery.
- Brush strokes, a stamp/seal, or large Japanese glyphs are **selective accents** (e.g. section headers or kana intro), not UI navigation or body text.
- Use legible typefaces with correct Vietnamese diacritics and Japanese glyph coverage. For kana/kanji study and stroke guidance, use unambiguous, verified glyphs/assets rather than decorative calligraphy.
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
