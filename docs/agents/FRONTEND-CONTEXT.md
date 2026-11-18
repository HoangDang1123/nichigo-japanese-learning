# NichiGo Frontend Context & Architecture Guide

A lightweight, persistent guide for AI coding sessions working on `nichigo_frontend`.
Read this file first before touching frontend code. Do not reread the entire repository.

---

## 1. Authoritative Documents & Reading Strategy

Always defer to authoritative project documentation for product and architectural rules:
- [Root Agent Workflow](../../AGENTS.md) — Single-workspace Git, branch naming, and commit conventions.
- [Frontend Agent Rules](../../nichigo_frontend/AGENTS.md) — Next.js 16 breaking change warnings and loading rules.
- [Visual Design System](../../docs/07-DESIGN-SYSTEM.md) — Sakura Pink palette, typography tokens, AppShell, and skeleton policy.
- [Technical Architecture](../../docs/03-ARCHITECTURE.md) — System topology, modular boundaries, and API expectations.
- [Feature Backlog](../../docs/05-BACKLOG.md) — Scoped tickets, dependencies, and verified implementation status.

> **Reading Rule for Agents:** Inspect only the specific files relevant to your current ticket (e.g., target component, its CSS module, and direct types). Never reload the entire codebase.

---

## 2. Tech Stack & Directory Structure

- **Framework:** Next.js 16.2.12 (App Router, Turbopack)
- **UI & Language:** React 19.2.4, TypeScript 5
- **State & Networking:** Redux Toolkit (`@reduxjs/toolkit`), `react-redux`, Axios (`^1.21.0`)
- **Theme & Icons:** `next-themes` (`^0.4.6`), `lucide-react` (`^1.63.0`)
- **Testing:** Node test runner with `tsc -p tsconfig.test.json` (`npm test`; new test files must be added to `tsconfig.test.json` `include` and to the `npm test` script). CI runs lint, type-check, `npm test` and build.

```text
nichigo_frontend/
├── src/
│   ├── api/          # Axios instance, typed ApiError, auth, CSRF and public Skills content endpoints (skills.ts)
│   ├── app/          # Routes, layouts and framework boundaries only (see section 6 for the routes)
│   ├── components/   # Shared UI plus feature folders
│   │   ├── account/  # Account menu dropdown
│   │   ├── auth/     # AuthForm, AuthLayout
│   │   ├── branding/ # BrandLogo component
│   │   ├── home/     # HomeStudyDesk, state adapter, home-skeleton, home.module.css
│   │   ├── layout/   # AppShell, DesktopSidebar, MobileNav, AppHeader, navigation.ts
│   │   ├── learning-path/ # Railway journey UI preview, state adapter & skeleton
│   │   ├── providers/     # ReduxProvider
│   │   ├── skills/
│   │   │   ├── overview/    # /skills directory: SkillsOverview, SkillsSkeleton
│   │   │   ├── kana/        # Kana chart, drawer, stroke guidance (+ data adapter, types, mock data, tests)
│   │   │   ├── category/    # /skills/[category] detail (Kanji demo, "unavailable" placeholders) and its mock data
│   │   │   ├── kanji/       # /skills/kanji and /skills/kanji/[itemId]: Skills Content API only (mapping, list reducer, detail loader, tests)
│   │   │   ├── vocabulary/  # Vocabulary feature (provider, logic, data, tests)
│   │   │   ├── grammar/     # Grammar feature (overview, detail, data, logic, tests)
│   │   │   ├── shared/      # skills-detail.module.css (page chrome) and skills-categories.ts (category metadata), used by more than one area
│   │   │   └── skills-mock-data.ts, skills-library.*   # legacy; see "Legacy files" below
│   │   ├── states/   # EmptyState, ErrorState, LoadingState
│   │   ├── theme-*   # ThemeProvider, ThemeSwitcher
│   │   └── ui/       # Button, Input, Card, Dialog, Tooltip, Progress, Skeleton
│   ├── data/         # kana-strokes (vendored AnimCJK-derived JSON, source SVGs, README)
│   ├── lib/          # Utilities (auth helpers)
│   ├── store/        # Redux store and slices (auth-slice, hooks.ts)
│   └── styles/       # tokens.css, themes.css
```

### Where new code goes (JPN-ARCH-004)
- **Routes** (`src/app/`): pages, layouts, `generateStaticParams`; import the screen from a feature folder. No feature logic or feature CSS here.
- **Feature code** (`src/components/<feature>/` or `src/components/skills/<area>/`): components, logic, types, demo data, CSS Module and the tests that exercise them, together. Prefer relative imports inside a feature and `@/` for other areas.
- **Shared** (`ui/`, `layout/`, `states/`, `branding/`): only genuinely reusable primitives and shell. Do not promote a component because two nearby screens use it. A file used by two skills areas goes in `skills/shared/`.
- **Direction of imports:** features may import shared folders; shared folders must not import features; skills areas do not import each other. Keep the import graph free of cycles.
- **Demo data** stays separate from types and logic, keeps its "demo data, not approved for publishing" labelling, and is never presented as production content.
- **Legacy files** (not imported by tracked source; do not delete without owner approval): `skills/skills-mock-data.ts` (a re-export kept so the untracked `skills-library.tsx` compiles) and the untracked `skills-library.*`.

---

## 3. Design System, Semantic Tokens & Themes

Follow the **Modern Japanese Learning Studio** visual direction ([docs/07-DESIGN-SYSTEM.md](../../docs/07-DESIGN-SYSTEM.md)):
- **Palette (Sakura Pink):** Centralized in `src/styles/themes.css`.
  - Light: Primary `#983B62` (Deep Sakura), Background `#FFF9FB`, Accent `#F3B6CB`, Text `#30252C`.
  - Dark: Primary `#DDA3BD`, Background `#17191C`, Surface `#22262B`, Accent `#F3B6CB`.
  - *Note:* Sage green (`#4F8F7B`) was a historical bootstrap proposal and is no longer active.
  - **Rule:** Never embed raw hex colors in JSX or CSS modules. Reference `var(--color-*)`.
- **Typography Rule:** Loaded via `next/font/google` in `src/app/layout.tsx`:
  - `--font-body`, `--font-heading`: **Be Vietnam Pro** (UI copy, Vietnamese text).
  - `--font-japanese`: **Noto Sans JP** (Kana, Kanji, learning content, Furigana).
  - `--font-japanese-serif`: **Noto Serif JP** (Decorative accents only, never for body/headings).
- **Themes:** Light, Dark, System (default). Powered by `next-themes` via `data-theme` attribute on `<html>`.

---

## 4. Reusable UI Primitives & Locations

All primitives live in `src/components/ui/` with scoped `.module.css`:
- **`Button`:** Variants (`primary`, `secondary`, `outline`, `ghost`, `danger`), sizes (`sm`, `md`, `lg`), `isLoading` spinner.
- **`Input`:** Accessible `<label>`, `aria-invalid`, `aria-describedby` referencing only rendered error/helper elements.
- **`Card`:** Compound components (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`); variants (`default`, `accent`, `interactive`).
- **`Dialog`:** Accessible modal with backdrop, Escape dismiss, scroll lock, and Tab/Shift+Tab focus containment.
- **`Tooltip`:** Hover & focus triggered (`onFocus`/`onBlur`, Escape dismiss, responsive viewport wrapping).
- **`Progress`:** `role="progressbar"`, smooth transitions, `primary` / `accent` variants.
- **`Skeleton`, `SkeletonRegion`:** Accessible loading primitive with `line`, `circle`, `block` shapes and single status announcement.
- **Standard State Components (`src/components/states/`):** `EmptyState`, `ErrorState`, `LoadingState`.

---

## 5. Shared AppShell & Navigation

- **Component:** `src/components/layout/app-shell.tsx`
- **Features:** Collapsible desktop sidebar with `localStorage` persistence, mobile drawer (`MobileNav`), top `AppHeader` (title, user status, `AccountMenu`, `ThemeSwitcher`), and accessible `#main-content` skip link.
- **Navigation config:** `src/components/layout/navigation.ts`
  - Active/Available routes: `/` (Trang chủ), `/learn` (Lộ trình học), `/skills` (Kỹ năng), `/progress` (Tiến độ).
  - Planned proposals (`available: false`): `/courses`, `/games`, `/profile`, `/settings`.

---

## 6. Page Inventory & Implementation Status

| Route | Implementation State | Notes |
|---|---|---|
| `/` | **Home Study Desk** | Auth-aware desktop layout with Redux session check and skeleton loading adapter. |
| `/learn` | **Railway Journey Preview** | Presentation preview of ordered learning stages with static empty station panels. |
| `/skills` | **Skills directory (demo data)** | `SkillsOverview` with category cards from `shared/skills-categories.ts`; availability labels are honest. `SkillsSkeleton` is ready for published data but not mounted. |
| `/skills/kana` | **Kana reference (demo data)** | Chart, drawer and verified stroke guidance from vendored AnimCJK-derived data. |
| `/skills/vocabulary` (+ `explore`, `saved`, `study/[topicId]`) | **Vocabulary UI prototype (demo data)** | In-memory state in `VocabularyProvider`, mounted by `app/skills/vocabulary/layout.tsx`; it survives in-app navigation and resets on reload. |
| `/skills/grammar` (+ `[grammarId]`) | **Grammar UI prototype (demo data)** | Filter chips, local search, pattern cards, detail notebook; no persistence. |
| `/skills/[category]` | **Category detail** | Kanji demo; other categories show an "unavailable" notice. Kana, Vocabulary and Grammar have their own routes. |
| `/progress` | **Empty State** | Wraps `EmptyState` in `AppShell`. |
| `/login`, `/register` | **Auth Pages** | Form components connected to Redux auth actions. |
| `/dev/ui`, `/dev/states` | **Dev Showcases** | Development-only verification pages; return `404` in production builds. |

---

## 7. API Integration & Frontend Data Conventions

- **Axios Client (`src/api/index.ts`):** Pre-configured with `withCredentials: true`, JSON headers, and typed `ApiError` hierarchy (`configuration_error`, `network_error`, `http_error`, `cancelled`).
- **Base URL:** Reads `NEXT_PUBLIC_API_BASE_URL` without trailing slash.
- **CSRF & Mutations (`src/api/auth.ts`):** Mutations call `bootstrapCsrf()` to obtain `X-CSRF-TOKEN`. Invalidated tokens clear cache automatically.
- **Redux Store (`src/store/`):** Manages user session state (`user`, `status`, `error`). Use `useAppDispatch` and `useAppSelector` from `src/store/hooks.ts`.

---

## 8. Accessibility, Loading & State Patterns

- **UI Loading Policy:** Skeletons represent initial asynchronous data-backed requests only.
  - Never display a skeleton for confirmed empty, failed, or static preview content.
  - Wrap skeleton layouts in `SkeletonRegion` with a meaningful localized label (e.g., `"Đang tải thư viện kỹ năng…"`).
  - All decorative skeleton shapes are `aria-hidden="true"`.
  - Respect `prefers-reduced-motion: reduce` (stops pulse animations).
- **Accessibility:** Ensure visible focus rings (`:focus-visible`), proper ARIA attributes, semantic headings, and keyboard navigation.

---

## 9. Git Conventions & Ownership Boundaries

- **Boundary:** Work strictly inside `nichigo_frontend/` for UI tasks. Do not modify backend files or unrelated configs.
- **Branch Naming:** `jpn-<ticket-id>/features/frontend-<feature-slug>` (e.g., `jpn-030/features/frontend-skills`).
- **Commits:** Conventional Commits: `<type>(<ticket-id>): <short-description>` (e.g., `feat(jpn-030): implement skills library UI`).
- **Strict Rule:** Never create, switch, commit, push, or merge branches without explicit owner authorization.
