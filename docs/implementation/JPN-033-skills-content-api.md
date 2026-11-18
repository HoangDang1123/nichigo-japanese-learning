# JPN-033 Skills Content API foundation

This is one backend/API foundation slice of JPN-033 Skills & Practice, **merged via PR #36** (`3a39048` on `main`; developed on `jpn-033/backend/skills-content-api`). Not released. JPN-033 as a whole is not complete: frontend integration (the Kana, Vocabulary and Grammar UIs still use demo data and do not call this API), any review experience or Flashcard review persistence, and production content remain pending. JPN-037 remains the separate Grammar UI frontend ticket.

## Implemented API contract

All routes are public GET under `/api/v1`, return `Cache-Control: no-store`, and use the existing `{ "code", "message" }` error shape. They do not create a Guest identity, consume Lesson unlocks, or mutate bookmarks. Directory contains eight Skills; content list/detail/search/flashcards remain limited to the four canonical Skills kinds (`kana`, `vocabulary`, `grammar`, `kanji`). Existing `/skills/{type}/items` remains available with its original DTO and cursor semantics.

| Route | Response | Query |
| --- | --- | --- |
| `GET /skills` | `{ groups: [{ id, skills: [{ type, availability, itemCount }] }] }` in fixed group and Skill order | None |
| `GET /skills/items` | `{ items: [SkillContent], nextCursor }` | Optional `type`, optional `q`, `limit` 1–50 (default 20), optional `after` stable key |
| `GET /skills/items/{itemId}` | `SkillContent` | Canonical UUID only; no revision selector |
| `GET /skills/flashcards` | `{ cards: [Flashcard], nextCursor }` | Optional `type`, `limit` 1–50 (default 20), optional `after` stable key |

`SkillContent` has `id`, `key`, `revision`, `kind`, `displayTextJa`, `displayTextVi`, and a public projection of the immutable published `payload`. Only kind-schema fields from the pinned revision are returned. Vocabulary/Grammar `exampleRefs` are withheld because a referenced Example may be unpublished or Rights-ineligible; eligible example resolution needs a separate reviewed presentation contract. The payload is not padded with FE demo fields. Search is case-insensitive literal substring matching on the published Japanese and Vietnamese display text; blank `q` means no search. It does not search draft payloads or define ranking. Results use ascending unique `stable_key` keyset pagination. A cursor belongs to the same query and type; clients must retain their filters between pages. Empty lists have `nextCursor: null`.

`Flashcard` has `id`, `key`, `revision`, `kind`, `front`, `back`, and nullable `reading`. Kana uses `glyph` / `reading`; vocabulary uses `surface` / `glossVi` plus `reading`; grammar uses `pattern` / `explanationVi`; kanji uses `glyph` / `meaningVi`. A card is omitted when a required side is missing or blank. No answer generation, progress, scheduler, score, or review persistence is included.

### Directory scope and availability assumption

`groups` always contains `foundation-knowledge` (Kana, Vocabulary, Grammar, Kanji) followed by `language-skills` (Listening, Speaking, Reading, Writing). These are directory identities, not canonical Item kinds or learner progress. Flashcards remain a separate review tool, not a ninth Directory Skill.

`availability` describes **published-content read usability through this API**, not FE integration or release readiness. Its values are `available`, `no_published_content`, and `feature_unavailable`. The four Foundation Skills have implemented read routes; they are `available` only when their eligible published Item count is positive, otherwise `no_published_content`. This is a technical assumption for the Directory API, combining explicit route support with actual eligible content. The four Language Skills remain `feature_unavailable` regardless of any Item tags or kinds, because their learning features are not implemented. Their `itemCount` is `null`, meaning no approved mapping/count contract exists; it is not a fabricated zero. Foundation `itemCount` is the real eligible count, including zero. FE demo availability remains independent of this API field.

All Foundation directory counts, list, detail, search and flashcard queries resolve `content_items.published_revision` and call `item_revision_public` for live withdrawal, sealed revision, Rights and referenced Media checks. A missing or unavailable detail returns 404. Counts represent currently eligible Items, not learner progress. Public queries expose neither Rights evidence nor historical revisions. No database change is required.

## Integration and verification

The frontend may consume `id` for JPN-011 bookmarks and use `payload` fields only when present. The UI must keep an empty state for zero eligible Items and avoid interpreting `itemCount` as progress. The existing FE Vocabulary and Grammar prototypes still use demo data. A FE adapter must map only reviewed source fields and handle missing example content; this branch does not integrate the FE.

The source uses `SkillsContentController`, `SkillsContentService`, and `SkillsContentRepository`; the existing SecurityConfig grants anonymous GET access and the existing content exception handler preserves the error shape. No migration was added. No JPN-032/JPN-040, lesson unlock, bookmark mutation, or spaced repetition code was changed.

On 2026-11-17, `mvnw.cmd -q test` passed **74 tests, zero failures/errors** against a fresh, isolated PostgreSQL 17 schema (`jpn021_jpn033_review`) with Flyway V1–V9. `SkillsContentIntegrationTest` covers all eight Directory entries, eligible counts, stable availability, related Item tags, an eligible Flashcard before Rights revocation and absence across every paginated page afterward, anonymous Directory/list/detail/flashcard reads with `Cache-Control: no-store`, and no Guest identity creation. The suite also includes JPN-011 Guest/unlock/bookmark regressions, existing Auth and content tests, and the populated migration test. `mvnw.cmd -q -DskipTests package` passed using JDK 25.0.4.1. The isolated cluster was started from the ignored backend `target/` directory. Earlier suite runs used a `public` schema that two existing tests correctly refused, and then reused a schema whose fixed fixture key collided. The final run on a fresh schema passed.

Pending: FE integration and responsive/visual review, independently reviewed and published Skills content, any eligible Example presentation contract, and Product Owner review of the full feature. This backend foundation is merged (PR #36) but not released. The test results above are branch-era evidence, not rerun for this documentation update.

## Frontend Slice 1: Skills API client and Directory integration

Branch `jpn-033/features/frontend-skills-directory-api`. **Implemented and locally tested; not pushed, not reviewed by the Product Owner, not merged, not released.** JPN-033 as a whole remains incomplete. Kanji UI, Flashcards UI, Skill Detail integration and Guest frontend are not part of this slice.

**Scope.** `/skills` now loads `GET /api/v1/skills` and renders the eight backend Skills in backend group and Skill order. Flashcards stays a frontend review tool (`planned`), not a ninth backend Skill. Kana, Vocabulary, Grammar and Kanji screens are unchanged and still use demo data.

**Files.** `nichigo_frontend/src/api/skills.ts` (typed client: `directory`, `items`, `item`, `flashcards`; Directory response validation), `src/components/skills/overview/skills-directory.ts` (adapter, filter, status, load state), `skills-overview.tsx` (container/view split, loading/error/empty states), `skills-overview.module.css` (status lines), `skills-skeleton.tsx` (comment only), tests `src/api/skills.test.ts` and `skills-directory.test.tsx`, plus `package.json` and `tsconfig.test.json` registration.

**Contract verified from source** (`SkillsContentController`, `SkillsContentService`): `GET /skills` returns `{ groups: [{ id, skills: [{ type, availability, itemCount }] }] }`; `availability` is `available`, `no_published_content` or `feature_unavailable`; `itemCount` is an integer (0 is a real zero) or `null` (no count contract). Item payload fields per kind are optional: kana `script/glyph/reading`; vocabulary `surface/reading/glossVi/usageNoteVi`; grammar `pattern/explanationVi/usageNoteVi`; kanji `glyph/meaningVi/onReadings/kunReadings`. The client reuses the shared Axios instance, `ApiError` and `NEXT_PUBLIC_API_BASE_URL`, sends query values and cursors unmodified, and creates no Guest session or CSRF request (all four routes are anonymous GETs).

**Availability semantics.** Each card keeps three separate facts. The backend status line (`N mục đã xuất bản` / `Chưa có nội dung xuất bản`) reports published-content readability only; `feature_unavailable` shows no line. Frontend readiness stays the existing badge (demo, planned, unavailable). Cards that open a demo-data screen state `Giao diện đang dùng dữ liệu minh họa`, so `available` is never presented as published content being shown. `itemCount` is never treated as progress. Backend Skills or groups unknown to the frontend are skipped rather than invented; a malformed response is an error, not a render.

**States.** Loading uses the existing `SkillsSkeleton` region; error uses `ErrorState` with a working Retry (aborts the superseded request); an empty response uses `EmptyState`; no mock Items or timers are used. Directory search and filters apply only to card metadata (title, subtitle, description) and make no claim about Item search.

**Verification (2026-11-18, local).** `npm run lint` clean; `npm run type-check` clean; `npm test` 103 pass, 0 fail (91 before this slice); `npm run build` succeeds; `node scripts/sync-agent-skills.mjs --check` OK. Browser QA used headless Chrome against a production build and a **local mock API that returns fixture data** (not the real backend or published content): 1440, 390 and 320 px in Light and Dark showed no horizontal overflow and no console errors; filter, search, no-result, error then Retry, loading and empty states behaved as described; the request log showed only `GET /api/v1/skills` and `GET /api/v1/auth/me`, with no Guest requests. **No end-to-end check against the real Spring Boot backend and database was run**, and no published Skills content was available to confirm real counts.

**Pending.** Real-backend integration check and CORS verification; Kanji and Flashcards slices; adapters for Kana, Vocabulary and Grammar (the API lacks most fields those UIs show); Guest frontend and bookmarks; Product Owner visual review of the two added status lines.
