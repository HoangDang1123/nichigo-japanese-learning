# JPN-021 — Content validation and offline dry-run

JPN-021 was merged through PR #24. The later [JPN-ARCH-002](JPN-ARCH-002-content-architecture.md) work keeps its package contract and shared canonical validation boundary while hardening database Rights evidence and Path eligibility. The CLI remains read-only and does not authorize publication.

**Status:** Implemented and tested; merged into `origin/main` via PR #24. Production operation and release are not evidenced. ADR-015 remains proposed. This ticket provides validation and a local dry-run, not an importer or publisher.

## Scope and structure

`content/schemas/v1` defines the package and canonical Item/Media/Rights/Lesson/Path shapes. The [authoring contract](../../contracts/02-CONTENT-PACKAGE-CONTRACT.md) records field names and bounds. `StrictCsv` and `ContentPackageValidator` parse bounded UTF-8 package files. `CanonicalContentValidator` accepts normalized `CanonicalRecord` groups and applies semantic, reference and rights checks without inspecting file extensions; `ContentSchemaValidator` checks the schema subset on `JsonNode` values. A future CMS or JPN-022 service can call this normalized boundary directly. The CLI is a separate file-system adapter and reuses `ContentPackageValidator`; it has no validation rules of its own.

The format supports manifest `schemaVersion: "1.0"`; Rights, Media and Items CSV; Lessons and Paths JSON. Six Item kinds have closed payload schemas: Kana, Vocabulary, Grammar, Kanji, Example and Dialogue. Lesson Sections reference canonical Items; Path Stage/Chapter placements reference Lessons. One Item may be reused across Lessons. The parser rejects invalid UTF-8, duplicate JSON properties, malformed CSV and unknown package paths before normalization. The canonical validator rejects unknown fields, missing and mistyped fields, duplicate keys/positions, unsupported kinds, bad Kana/Kanji glyphs, broken references and prerequisite cycles. Reports sort fixed-code diagnostics by source, row, pointer and code. They do not echo raw content or private rights evidence.

`ContentReferenceResolver` separates existing editorial-key lookup from validation. `JdbcContentReferenceResolver` performs read-only, parameterized lookups in batches of 400 and traverses existing prerequisites by frontier; query count grows with graph depth and batches, not one query per reference. Package-local references resolve first. An existing Item key with a different kind is a conflict; matching key upsert rules belong to JPN-022. Offline unresolved external keys produce warnings, while a resolver makes missing keys errors. New package Rights always require authorized review. A production caller must revalidate under publication locks in JPN-022.

The V5 migration adds optional `stable_key` columns to `content_rights`, `lesson_sections`, and `chapter_lessons`. Rights keys are globally unique; section keys are unique per Lesson; placement keys are unique per Chapter. Legacy rows retain `NULL` authoring keys and their UUID identities. V5 does not change published pointers or revision tables.

The populated upgrade test applied V1–V4 in a disposable PostgreSQL schema, inserted a Path, Stage, Chapter, Lesson, Section, Item and placement, sealed Item revision 1 and pointed its root at that revision, then applied V5. It verified all identities and positions, the pointer and seal, nullable legacy keys, valid authoring keys, duplicate-key rejection inside namespaces, permitted reuse in different namespaces and five successful Flyway history entries. The test removed only its own schema. JPN-020's public-read tests are part of the full backend regression suite; no JPN-020 API or historical migration was changed.

## Local CLI

From `nichigo_backend` in PowerShell, with JDK 21+ and `JAVA_HOME` configured:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\content-dry-run.ps1 ..\content\examples\v1\valid
```

The single argument can be a package directory or its `manifest.json` path. The launcher compiles the backend, builds the local runtime classpath, and invokes `ContentDryRunCli` as a separate Java process. The CLI does not start Spring, open a database connection, fetch URLs, upload files, or write editorial data. It reads immediate regular files in the selected directory; symlinks and nested entries are rejected. It returns one JSON object on stdout. Exit `0` means structurally valid, `1` means validation failure, and `2` means a CLI input or execution error. A valid offline report always has `publicationReady: false`; package-supplied rights need review, and external references may remain unresolved. An offline result is not permission to publish.

Example successful result, abbreviated here (actual stdout contains the full sorted warnings):

```json
{"valid":true,"publicationReady":false,"truncated":false,"errors":[],"warnings":[{"code":"RIGHTS_REVIEW_REQUIRED","severity":"warning","file":"items.csv","line":2,"row":2,"field":"rightsKey","pointer":"/0/rightsKey","entityKey":"kana-a","message":"Author-supplied rights need authorized review before publication."}]}
```

Diagnostics contain codes, locations, stable keys and fixed messages. They do not contain raw payloads, rights evidence, credentials or exception traces. Missing `manifest.json` is a validation error; an unavailable path is a CLI input error. The CLI has no database mode. Database-backed validation is available to a trusted internal caller through the read-only resolver; operator transport and publication remain open JPN-022 work.

`valid: true` confirms structure and known references only. `publicationReady` is hard false in JPN-021, even when all referenced database Rights are currently cleared: no operator authorization, human language review, locked rights recheck or publication transaction has occurred. Source metadata is a provenance proposal, not evidence of permission. Licensed records require an evidence reference, but an authorized reviewer must verify it. Media byte integrity and delivery rights are outside this validator.

## Verification and limitations

JPN-021 unit tests cover strict parsing, version and size bounds, diagnostics, canonical shapes, references, cycles, rights, media and direct normalized-record validation. Integration tests use real PostgreSQL in disposable schemas for the resolver and the populated V4→V5 upgrade. CLI tests cover valid, invalid, malformed, missing-manifest, size-bound and execution-error outcomes. The resolver integration test also invokes the CLI and checks editorial row counts and pointers after dry-run.

Final local verification on 2026-11-07 (Asia/Saigon), from `nichigo_backend`:

| Command / check | Result |
| --- | --- |
| `.\mvnw.cmd -q verify --no-transfer-progress` with `DB_URL` set to a newly created local `jpn021_final_*` schema | 44 tests, 0 failures, 0 errors, 0 skips; V1–V5 Flyway history all successful; schema removed |
| `.\mvnw.cmd -q '-Dtest=CanonicalContentValidatorTest,ContentPackageValidatorTest,ContentDryRunCliTest' test --no-transfer-progress` | 17 tests, 0 failures, 0 errors, 0 skips |
| `.\mvnw.cmd -q '-Dtest=JdbcContentReferenceResolverIntegrationTest,PopulatedV4ToV5MigrationTest,PublicContentIntegrationTest' test --no-transfer-progress` with a new local `jpn021_regression_*` schema | 14 tests, 0 failures, 0 errors, 0 skips; schema removed |
| Documented PowerShell CLI with directory, then `manifest.json` | Exit 0 both times; identical parseable JSON; `valid: true`, `publicationReady: false` |
| CLI on directory without manifest; CLI with an `items.csv` path | Exit 1 with `PACKAGE_MANIFEST_REQUIRED`; exit 2 with `CLI_INPUT_ERROR` |

The focused tests include invalid UTF-8, duplicate/trailing JSON, quoted CSV and line/row diagnostics, schema versions, duplicate keys/positions, local/database references, prerequisite cycles, rights/media failures, unsafe paths, nesting/size bounds, diagnostic truncation and reuse across Lessons. Existing JPN-020 public-content tests passed 12/12 within the regression run. No production or shared schema was accessed.

Run `./mvnw test` only with `DB_URL` pointing to a disposable local PostgreSQL schema. The resolver and migration tests reject nonlocal/shared schema URLs. The other existing backend integration tests also write fixtures, so never run the full suite against a production or shared schema. JPN-021 does not import, publish, review rights or serve an upload API. Payload validation remains an application gate; direct SQL writes can bypass it until an authorized JPN-022 writer is established. No production database or deployment verification is claimed.

### JPN-022 handoff

Provide an authenticated operator entry point; define batch identity and idempotent key reconciliation with edit-version conflicts; store import records and audit provenance; authorize rights review and re-review; validate the complete candidate under locks against live rights and dependent revisions; enforce public API size bounds before publication; seal and advance Item/Media/Lesson/Path revisions atomically; support withdrawal and media delivery authorization. None of these operations is performed by the JPN-021 CLI.
