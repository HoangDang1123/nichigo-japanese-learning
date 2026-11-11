# JPN-035 — Skills Directory & Kana Reference (frontend)

> ## ⚠ PRE-COMMERCIAL-RELEASE LICENSING REVIEW REQUIRED — STATUS: PENDING
> All stroke assets are derived from **AnimCJK**. Kana SVG file headers state the **GNU LGPL v3 or later**; `licenses/COPYING.txt` states Kana/Bopomofo/stroke SVGs may be used under the LGPL at the user's option, while other character SVGs fall under the **Arphic Public License**.
> **Unresolved provenance question:** AnimCJK's README says its shapes derive partly from the Arphic PL KaitiM fonts and were edited in Inkscape. It is **not confirmed** whether the kana outlines descend from Arphic glyphs, and therefore whether they may be offered under the LGPL rather than the Arphic Public License. It is also open how LGPL obligations apply to data bundled in a web app.
> **No legal/licensing review has been performed.** Full technical coverage is **not** evidence of commercial compliance. This must be reviewed (Product Owner and legal advice if needed) **before any commercial release**. Tracked in [the release checklist](../06-RELEASE-CHECKLIST.md#legal--third-party-licensing).

**Ticket:** JPN-035 — Skills Directory & Kana Reference (registered in [the backlog](../05-BACKLOG.md); JPN-033 remains Flashcards). **Branch:** `jpn-035/features/frontend-skills-kana-reference`. Frontend only: no backend, database or API changes, so there is no FE/BE integration to verify.

## Scope
Included:
- Skills overview (`/skills`) and category navigation (`/skills/[category]`).
- Kana chart (`/skills/kana`) for Hiragana and Katakana: basic, voiced, semi-voiced and contracted (yōon) groups.
- Reference drawer: Hepburn romaji, verified example vocabulary and writing guidance.
- Vendored AnimCJK Kana stroke data and the stroke-guidance renderer (the rest of this note).

Not included: Vocabulary, Grammar, Kanji, Flashcards (JPN-033) or any other Skills content; pronunciation audio; published-content integration.

## Status (kept separate)
- **Skills overview — implemented** with frontend **mock/demo** catalogue data (`skills-mock-data.ts`). It is not curriculum content and is not connected to published content. Vocabulary, Grammar and Kanji detail pages show a few demo items under a visible "Dữ liệu minh họa" (demo data) badge; the remaining categories show a "Sắp ra mắt" / "Chưa khả dụng" notice. These demo pages do not implement those Skills.
- **Kana data and stroke guidance — implemented and tested:** converter, versioned data (148/148 chart characters), typed renderer, contracted-sound presentation, single shared attribution, fallbacks.
- **Tested** (run on this branch on top of `origin/main` `0e4e1b7`, from `nichigo_frontend/`): `npm run lint` clean; `npm run type-check` clean; `npm test` 42 tests, 42 pass, 0 fail; `npm run build` succeeds with `/skills`, `/skills/[category]` (8 non-Kana category pages prerendered) and `/skills/kana`.
- **Browser QA (automated, earlier in this work, on a production build):** headless Edge (Chromium) driven through the DevTools protocol on `/skills/kana` — desktop 1280/1440/1600/1920 and mobile 390/320, Light and Dark. Not rerun after creating this branch from the current `origin/main`, which changed no frontend file. Screenshots and scripts are local-only under `docs/research/` and are **not** part of this branch.
- **Reviewed:** the Product Owner **visually approved Kana UI v1** (chart, drawer, stroke rendering). That is a visual approval only; it is not approval of the whole ticket, of licensing or of a release.
- **Pending:** real-device (touch) testing; accessibility audit (screen reader, full keyboard pass); browsers other than Chromium/Edge.
- **Deferred:** audio playback. The sound button is a visible but disabled placeholder with no handler, audio, TTS or API.
- **Licensing: PENDING — release blocker** (banner above): AnimCJK commercial licensing and the provenance of the Kana outlines are not reviewed and not cleared.
- **Merged:** no. **Released:** no.

## Skills overview
`/skills` renders the nine category cards from `SKILL_CATEGORIES` (mock/demo data, honest availability labels). Kana links to `/skills/kana`; the other categories link to `/skills/<key>`, a static detail page (`category-detail.tsx`) that shows either clearly labelled demo items (Vocabulary, Grammar, Kanji) or an availability notice, never real lesson content. No asynchronous data is loaded, so no skeleton is needed yet; add one when the overview is connected to real data.

## Coverage (current chart)
| | Count |
|---|---|
| Unique Unicode characters the chart needs | **148** (74 Hiragana + 74 Katakana) |
| — of which chart cells (basic 46 + voiced/semi-voiced 25, per script) | 142 |
| — small kana used only inside contracted sounds (ゃゅょ / ャュョ) | 6 |
| Imported and verified | **148** |
| Missing from AnimCJK at the pinned commit | **0** |
| Unsupported / not confidently convertible | **0** |
| Logical strokes | 433 (21 strokes have split outline parts) |
| Start arrows omitted (no clear placement; number kept) | 22 (see `coverage-report.json`) |
| Numbers needing relaxed clearance | 0 |

Not imported: the other AnimCJK kana files (the 177 total include characters the chart does not use). `coverage-report.json` is regenerated by the converter (required / imported / missing / unsupported plus placement notes).

## Pipeline
`Source SVG → scripts/kana-strokes/convert-animcjk.mjs → src/data/kana-strokes/animcjk-kana.json (+ coverage-report.json) → kana-stroke-data.ts (adapter) → KanaStrokeGuidance → KanaStudyGrid`
- Required characters are listed in `scripts/kana-strokes/kana-manifest.json`, **generated from the live chart data**; a test asserts the manifest equals the chart's current character inventory, so chart changes that add characters fail until data is added.
- `expectedStrokes` in the manifest = standard stroke counts (+2 dakuten, +1 handakuten), **independent of AnimCJK**; the converter refuses any glyph whose logical count differs (that would be reported as unsupported; none were).
- Run: `node scripts/kana-strokes/convert-animcjk.mjs [--fetch]` from `nichigo_frontend/` (`--fetch` downloads the pinned SVGs and upstream licence files).
- Renderer and contract know nothing about AnimCJK markup (no `clip-path`, no animation CSS).
- Bundle: `animcjk-kana.json` is ~286 KB raw / ~92 KB gzip and is part of the `/skills/kana` client bundle. Lazy-loading per character is a possible later optimisation.

## Source and licence record
| Item | Value |
|---|---|
| Project | AnimCJK — https://github.com/parsimonhi/animCJK |
| Copyright | AnimCJK 2016-2026 Copyright FM&SH |
| Commit | `c63765b150cbd567c71d05cf4a4f8d00b57045c9` (no release tags exist) |
| Folder | `svgsJaKana/` |
| Licence per file header | GNU LGPL v3 or later — https://www.gnu.org/licenses/lgpl-3.0.html |
| Upstream notices kept | `src/data/kana-strokes/source/animcjk-c63765b/COPYING.txt`, `LGPL.txt` |
| Upstream derivation statement | AnimCJK is derived from Arphic PL KaitiM GB/Big5 fonts, Makemeahanzi, Unihan (`COPYING.txt`) |

## Files derived from AnimCJK
- `src/data/kana-strokes/source/animcjk-c63765b/*.svg` — 148 **unmodified** AnimCJK files (headers intact).
- `src/data/kana-strokes/animcjk-kana.json` — **generated derivative**; `coverage-report.json` — generated report.
- The renderer/adapter/types contain no AnimCJK data.

## Transformations
1. Filled stroke **outline** `d`, **median** `d`, stroke order and the 1024×1024 system are copied unchanged (no rescaling or per-glyph normalisation).
2. **Split outline parts** (e.g. あ stroke 3 = parts 3a/3b; の stroke 1 = 2 parts) are grouped into ONE logical stroke. For a split stroke the first part's median is used (the second part's median intentionally starts off-canvas in AnimCJK for animation timing).
3. SVG → JSON reformatting.
4. **NichiGo-computed (not AnimCJK data):** stroke-number position (nearest clear spot to the stroke start, preferring behind it, checked against the real outlines with a relaxation ladder that was never needed), start-direction arrow (short, thin, offset beside the start, parallel to the median's initial direction) and end anchor. Medians are used **only** to derive direction/placement and are **never drawn**. If no clear arrow position exists the arrow is omitted and the number kept.
5. AnimCJK has no number positions and no tome/hane/harai data. `ending` values are NichiGo-owned **metadata** in `scripts/kana-strokes/nichigo-endings.json` (い1 hane, し1 harai, の1 harai, ア2 harai, キ3 tome), `pending-review`, **not rendered**, never presented as verified. Natural tapered endings come from the AnimCJK outlines; no dots, ticks, dashed tails or synthetic taper are drawn.
6. Voiced kana are separate AnimCJK files containing dakuten (2 strokes) / handakuten (1 stroke) as real strokes; they never reuse the base character's data (tests assert count = base + 2 or + 1).

## Contracted sounds (yōon)
きゃ, シュ, ぎょ … are **two Unicode characters**, so there is no combined glyph or combined stroke sequence. The drawer shows **one 2×2 grid per constituent character, side by side**: the full-size character (e.g. き) and the small kana (e.g. ゃ), each with its **own numbering restarting at 1** and a caption such as `Chữ 1/2: き · 4 nét` / `Chữ 2/2: ゃ (chữ nhỏ) · 3 nét`. AnimCJK draws small kana natively smaller than full-size kana (ゃ ≈ 0.8 × や height), which is preserved, not enlarged. Annotation numbers get a ×1.1 scale in these narrower panels to stay legible. If a constituent has no valid guidance, that panel shows the Klee One character with `chưa có hướng dẫn nét` while the other constituent keeps its guidance. Chart selection and the combined reading are unchanged; the header glyph uses a smaller size for two-character sounds so glyph + reading fit beside the buttons.
Source of each constituent: the full-size character reuses the chart cell's own data (same Unicode character); small kana have ids `hiragana-small-ya|yu|yo`, `katakana-small-ya|yu|yo`.

## Rendering
Filled outlines in the theme text colour (Light/Dark via tokens), 2×2 guide lines, order numbers and start arrows in the existing accent colour. Only the stroke count (`4 nét`) is shown under the grid. The wooden frame is unchanged. Klee One remains the character-only fallback (`Chưa có hướng dẫn thứ tự nét đã xác minh cho chữ này`). The AnimCJK + licence attribution is shown **once at the very bottom of the Kana chart page** (`kana-chart.tsx` `StrokeAttribution`), for both scripts, with the drawer open or closed; it is not repeated in the drawer.

## Drawer content (simplified card)
Three areas inside the wooden frame, on restrained Sakura surfaces (`primary-subtle` mixed into the surface, 1px tinted border, no inset wood shadow):
- **A. Character and pronunciation** — the selected kana and its romaji **together in one compact, nearly square rounded frame** (80×84px; 1px wood-tinted border, subtle surface, 2px lower edge), stacked and centred: large glyph (2.25rem; 1.5rem for two-character sounds so ぎゃ/シャ fit without clipping) with the small Hepburn romaji (14px) directly underneath. This `h2` *is* the drawer's accessible name (`aria-labelledby`), so there is no separate "Chi tiết chữ …" title. To the right: a **disabled sound button** and the close button.
- **B. Writing guidance** — the AnimCJK study grid (one grid per character for contracted sounds) and the stroke count.
- **C. Example** — dictionary style on **three separate lines**: the Japanese word (largest), its romaji (italic, secondary/primary-accent colour, plain text — no badge, chip, brackets or IPA) and the Vietnamese meaning (regular text; first letter displayed in capitals via CSS). The romaji comes only from the verified example data; if an entry has none the line is omitted, never invented. A `section` with `aria-label="Từ ví dụ"` (no visible heading); long words wrap (`overflow-wrap: anywhere`). If there is no verified example, the muted "Chưa có từ ví dụ đã được xác minh" line is shown.
Removed: the heading, the "Nhóm âm" / "Hàng" metadata, the seigaiha panel (an illustration slot is rendered only if an `illustration` prop is supplied), the example romaji *badge* (romaji itself is back as plain italic text), section labels and the heavy inset trays. The empty state is a short prompt ("Chọn một chữ").
**Pronunciation is NOT implemented.** The sound button is a visual placeholder only: `disabled`, `aria-label="Phát âm — sắp ra mắt"`, `title`, dashed border and 55% opacity, no hover or pointer cursor, no handler, no audio/TTS/API/asset. Wiring audio is a later task.
Verified in the real page (production build, headless Edge): no overlap between heading, sound and close at 1440 (desktop), 390 and 320px; sound button disabled and not tabbable; Escape/close/reopen unchanged.

## QA results (real UI, production build, headless Edge via DevTools protocol)
- Scenarios: desktop 1440 Light Hiragana, desktop 1440 Dark Katakana, mobile 390 Light Hiragana, mobile 390 Dark Katakana, desktop 1920 Light Hiragana (side-by-side layout).
- Verified in each: attribution present exactly once and after the last chart group; no horizontal overflow of page or drawer; drawer selection and switching between あ/き/ふ/じ/きゃ/ぎゃ (Katakana: シ/キ/ヨ/ジ/シャ/ギョ) with correct stroke counts and one grid per constituent for contracted sounds; no source/licence text in any drawer; Close, reopen and **Escape** (real keyboard event) close the drawer and return focus to the originating cell; no console errors.
- Defects found and fixed during QA: (1) Escape did not close the drawer in the real app because a trusted Escape reaches the bubble phase already default-prevented (observed on every app page) — the drawer's listener now reads the flag in the capture phase; (2) the heading plaque overflowed for two-character sounds; (3) when charts stack, empty rows left large blank gaps — empty rows now collapse when stacked, fixed row heights are kept for the side-by-side layout (re-verified at 1920px: connectors k→g, s→z, t→d, h→b/p and yōon connectors align with their rows).
- Not verified: real touch interaction/gestures on a physical phone; browsers other than Edge/Chromium; screen-reader output; keyboard Tab order beyond the checks above; at chart-area widths below 42.75rem (for example a 1280px viewport, 557px) the paired charts still stack and the connectors are hidden by design.

## Chart layout tiers (desktop width utilisation)
Container = the chart area left of the reserved 24rem drawer column (`container-type: inline-size` on `.chartArea`; layout lives in `kana-chart.module.css`). Measured on the real page (headless Edge, drawer column reserved):

| Viewport | Chart area | Mode | Tile (w×h) | Gap | Page height |
|---|---|---|---|---|---|
| 1024 | 301 px | stacked (narrow tier) | 41.8×45.1 | 8 px | 2713 |
| 1280 | 557 px | stacked | 72×77.8 | 8 px | 3458 |
| 1440 | 717 px | **side-by-side (compact)** | 55.3×59.7 | 6 px | **2084** (was 3416, stacked) |
| 1600 | 877 px | side-by-side (compact) | 71.3×77 | 6 px | 2395 |
| 1920 | 1197 px | side-by-side (roomy, unchanged) | 72×77.8 | 8 px | 2444 |

Why it stacked at 1440 before: side-by-side required a 48rem (768px) chart area, but only 717px is available once the sidebar and the drawer column are reserved. Two 5-column charts need 10 tiles + 10 gaps + two header columns + a connector column + panel padding.
Tiers:
- **roomy (≥ 58rem)** — unchanged chrome (8px gaps, 28px headers, 32px connector column, 20px padding), tiles up to 72px.
- **compact (42.75rem–58rem)** — tighter chrome only: 6px gaps, 24px header and connector columns, 16px padding. Tiles are fluid with a **3.25rem (52px) minimum**, which reaches the old 56px at about 744px and is 55px at 1440; below 42.75rem tiles would be smaller than that, so the charts stack instead.
- **stacked (< 42.75rem)** — one chart at a time, rows without kana collapse, tiles up to 72px.
- **very narrow (≤ 22rem)** — padding 12px and a 2.5rem minimum tile so one chart never overflows (fixes a pre-existing 48px overflow at a 1024px viewport, where the docked drawer leaves about 300px).
Side-by-side keeps fixed row heights, so connectors align exactly: measured 0px error for every connector source and destination, and 0px row-top mismatch between paired charts, at 1440, 1600 and 1920. Chrome sizes are CSS variables (`--pad-x`, `--head-w`, `--conn-w`, `--grid-gap`, `--tile`); the stroke renderer, drawer and attribution are untouched. Mobile (390px) is unchanged.

## Limitations / next steps
- **Licensing review PENDING** (above); a site-wide credits/licences page is not built.
- Computed number/arrow placement and the 22 omitted arrows need teacher/owner review; the の stroke-1 number sits inside the loop (clear of the stroke).
- Stroke-ending annotations are unreviewed and unrendered.
- Kanji or other AnimCJK folders (Arphic Public License) need their own licence review before any import.
