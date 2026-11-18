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
