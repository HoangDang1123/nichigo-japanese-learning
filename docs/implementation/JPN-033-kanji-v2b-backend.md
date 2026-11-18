# JPN-033 Kanji v2b backend foundation

## Scope and status

Implemented locally on the Codex clone's `jpn-033/backend/kanji-v2b-foundation` branch for a separate Draft PR. This is not the complete JPN-033 feature. Frontend integration, production content review, media byte delivery, AnimCJK licensing and release remain pending. No production publication was performed.

## Data model and import

V10 adds `content_item_edges` for ordered Kanji→Vocabulary and Vocabulary→Example draft relationships and `content_item_revision_edges` with composite foreign keys to exact published source and target revisions. A revision-child trigger rejects updates/deletes and additions after the source revision is sealed. A kind trigger restricts each edge role to its canonical Item kinds, preventing relationship cycles. Draft edges are reconciled by package import after all Items are available. Existing batch checksum, ownership and edit-version checks remain in force.

Package 1.1 is a separate set of closed schemas; package 1.0 remains accepted with its original schema. Kanji `relatedVocabularyRefs` and Vocabulary `exampleRefs` are ordered arrays of stable keys in 1.1. A 1.0 update of a package-owned Item preserves existing draft Item edges because it cannot express their replacement. A 1.1 update replaces the Item's complete draft edge list; an empty or omitted relationship field clears it. Both use existing package ownership, edit-version and checksum rules, and neither changes sealed published edges. Operator preview requires `item:<target-key>` pins in addition to existing bare Media keys. First Kanji publication checks for at least one related Vocabulary and requires every chosen target to have a published, sealed, Rights-eligible revision. The revision edge does not move when the target publishes a newer revision.

Example 1.1 `segments` hold authored text and optional reading. Schema and semantic validation reject empty or whitespace-only text/reading; concatenated segment text must equal `textJa`. `kanjiDetailCandidate: "yes"` requires at least one nonblank reading. The Kanji Detail projection uses the same structural check, while the existing per-edit-version operator language review remains the human gate for semantic Furigana completeness. An Example without this candidate marker can be valid and published but is omitted from Kanji Detail.

## Public API and Rights

`GET /api/v1/skills/kanji/{itemId}` uses the current eligible Kanji revision. It resolves ordered pinned Vocabulary and Example revisions, filtering each by live Rights and publication status. Missing or revoked related Items produce empty child lists without replacing the pins or hiding Kanji. Direct Kanji revocation returns 404. The response exposes canonical identities, revisions, glyph/meaning/readings, Vocabulary presentation fields and structured Example segments. It does not return raw Item reference keys or Rights evidence.

Kanji stroke Media uses the existing `writing` kind and `stroke-order` role. V10 exempts only that role/kind on a Kanji revision from the otherwise mandatory Item Media eligibility gate and applies the same exception to V7's set-based Path check. The Lesson Media projection filters revoked Media metadata. Kanji Detail returns eligible stroke metadata with `status: metadata_only`, or `status: unavailable` and null fields. It returns no storage key or byte URL. The repository has Media metadata but no private object-store adapter or safe byte-serving endpoint; implementing one requires storage configuration, byte integrity/MIME/size checks, SVG/JSON sanitization, per-request Rights checks and cache policy. Previously downloaded bytes cannot be recalled. AnimCJK Kanji asset provenance and Arphic Public License obligations remain pending review; no asset was imported or cleared here.

## Verification

On 2026-11-18 (Asia/Saigon), `mvnw.cmd -q -DskipTests package --no-transfer-progress` passed with JDK 25.0.4.1. `mvnw.cmd -q test --no-transfer-progress` passed 75 tests, 0 failures/errors/skips, against a new local PostgreSQL 17 UTF-8 database and isolated `jpn021_v2b_verify` schema; Flyway V1–V10 applied. The focused `KanjiV2bIntegrationTest` passed again on that schema after its final fixture update. It covers the first-publish gate, ordered edges, exact pins after a target revision update, immutable edges, authored segments, wrong segment concatenation, omission of an Example without Furigana from Kanji Detail, anonymous Kanji Detail, single/all child Rights filtering, optional stroke revocation and retained Path eligibility. Existing Guest, Skills, Lesson/Path, import and migration tests passed in the full run. Test fixtures are synthetic, not production content.

## Open work

### Review fixes verified on 2026-11-19

PM source review found two compatibility/validation gaps. `ContentImportService.itemEdges()` now returns before draft edge reconciliation for package 1.0. A 1.0 update of the same owned Kanji keeps its 1.1-authored draft edges, and a new published Kanji revision can pin them. Package 1.1 still replaces the complete relationship list of each imported Kanji/Vocabulary Item; reordering changes draft priority and an empty list clears it. Existing sealed revisions and pins remain unchanged. This narrow rule uses existing package ownership and edit-version checks; it does not authorize a different package to take over another owner's Item.

Example 1.1 segment `text` and `reading` now declare `minLength: 1` and a non-whitespace pattern. The schema validator enforces `minLength`; the shared `ExampleFurigana` predicate rejects blank Unicode text/readings, requires exact segment concatenation and at least one nonblank reading for a Kanji Detail candidate. Both canonical validation and the public Kanji Detail projection use that predicate. Human operator language review remains responsible for semantic completeness and correctness.

`KanjiV2bIntegrationTest` now covers 1.1→1.0 import on the same owned Item, repeated-package idempotency, publication with preserved pinned edges, 1.1 reorder/clear for both relationship roles, unchanged sealed edges, empty and whitespace-only readings, invalid segment text, and the existing Rights/Media/API behavior. After these changes, `mvnw.cmd -q test --no-transfer-progress` passed 75 tests with 0 failures, errors or skips on PostgreSQL 17 using a fresh isolated `jpn021_v2b_reviewfix` schema. `git diff --check` passed. No media byte delivery, production AnimCJK import, or Rights clearance was added.

For the separate backend Draft PR, this work was transferred onto `origin/main` at `70d9885`. The only source integration changes were current-main documentation wording in the backlog and implementation index; the backend implementation and schemas match the PM-reviewed final snapshot. On 2026-11-19, `mvnw.cmd -q test --no-transfer-progress` passed 75 tests with 0 failures, errors or skips against a fresh isolated PostgreSQL 17 schema (`jpn021_v2b_pr`). Flyway V10 had no version collision on that main baseline.

- Media byte delivery and asset validation require a real private storage adapter; no delivery endpoint or production URL exists.
- A qualified reviewer must verify Kanji Detail Furigana boundaries and reading completeness for each candidate Example. The technical validator cannot prove Japanese correctness.
- Frontend Kanji v2b integration and visual/accessibility checks remain outstanding.
- The branch starts from `origin/main` at `70d9885` and carries only this backend slice. Later upstream changes need a separate review before merge.
