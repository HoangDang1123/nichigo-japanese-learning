# JPN-021 content package contract — schema versions 1.0 and 1.1

This document describes the v1.0 authoring and validation format and the JPN-033 backend branch's additive v1.1 format. Exact closed-field schemas are in [`content/schemas/v1`](../content/schemas/v1) and [`content/schemas/v1_1`](../content/schemas/v1_1). The Java validator enforces the schema subset used there plus the cross-record rules below. No format validity or dry-run result grants publication clearance. JPN-022 adds a secured operator CLI and relational import; there is no operator HTTP API.

`ContentSchemaValidator` enforces the schema keywords used by these files: `type` (object, array, string, integer), `required`, `properties`, `additionalProperties: false`, `items`, `minItems`, `maxItems`, `minLength`, `maxLength`, `pattern`, `enum`, and `minimum`. `$schema` and `title` are annotations. This is a checked-in JSON Schema subset, not a general Draft 2020-12 validator; adding another keyword requires implementation and tests before relying on it.

## Package and files

A package is one flat directory with `manifest.json` and one to five declared data files. The manifest requires `schemaVersion: "1.0"` or `"1.1"`, `packageKey`, semantic `packageVersion` (three nonnegative dotted integers), `locale: "vi"`, and `files: [{"path":"items.csv","type":"items"}, ...]`; `author` is optional. Each type appears at most once. Types `rights`, `media`, `items` use `.csv`; `lessons`, `paths` use `.json`. Every declared file must exist, and undeclared files are rejected. File names are flat ASCII lowercase names matching `[a-z][a-z0-9-]*.(csv|json)`, at most 80 characters. No directory paths, `..`, symlinks or URLs are followed by the CLI.

CSV uses known headers, UTF-8, comma separators and RFC-4180-style quoted fields. Optional columns may be omitted; required columns must be present. Empty cells become absent fields and required values are then rejected. JSON-valued Item cells (`payload`, `knowledgeDomains`, `languageSkills`, `topics`, `mediaRefs`) contain JSON encoded as a quoted CSV cell. Duplicate or unknown headers, malformed quoting and inconsistent column counts are errors.

| File | Required headers | Other allowed headers |
| --- | --- | --- |
| `rights.csv` | `key,originKind,sourceLabel,attribution,permissionBasis` | `sourceUrl,evidenceRef` |
| `media.csv` | `key,kind,storageKey,checksumSha256,mimeType,rightsKey` | `altTextVi,transcriptVi` |
| `items.csv` | `key,kind,payload,rightsKey` | `displayTextJa,displayTextVi,jlptLevelCode,communicationLevelCode,knowledgeDomains,languageSkills,topics,mediaRefs` |

`lessons.json` and `paths.json` each have exactly two root properties: the same `schemaVersion` as the manifest and, respectively, `lessons: [...]` or `paths: [...]`. Each Lesson requires `key`, `slug`, `titleVi`, `rightsKey`, `objectives`, `sections`; optional `summaryVi`, level codes and `prerequisites`. Sections have `key`, `position`, optional `titleVi`, and ordered `items: [{position,itemKey}]`. Each Path requires `key`, `titleVi`, `rightsKey`, `stages`; Stages require the same core fields plus `lessons: [{key,position,lessonKey}]`. Descriptions are optional. See the linked schemas for nested bounds and exact allowed fields.

## Canonical Items, keys and rights

All Items require `key`, `kind`, `payload`, `rightsKey`. The allowed kinds and minimum payload fields are:

| Kind | Required payload fields |
| --- | --- |
| `kana` | `script`, `glyph`, `reading` |
| `vocabulary` | `surface`, `reading`, `glossVi` |
| `grammar` | `pattern`, `explanationVi` |
| `kanji` | `glyph`, `meaningVi` |
| `example` | `textJa`, `translationVi` |
| `dialogue` | `turns` with `speaker`, `textJa` in every turn |

Keys use lowercase kebab case matching `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$` and at most 80 characters. Duplicate keys within one record type are rejected. Item, Lesson and Media keys identify their respective editorial roots globally; Rights keys are globally unique when present in V5. A Section key is unique within its Lesson, and a Path placement key is unique within its Chapter. Stage keys are unique within a Path and Chapter keys within a Stage. Sibling `position` values must be positive and unique. Reordering retains keys; position is not identity. JPN-022 reconciles matching keys under an authenticated transaction using package ownership and edit-version checks. Import does not infer or publish a revision.

Package-local references resolve before database references. A local Rights declaration still requires authorized review even if a database row has the same key. An Item key matching an existing Item with a different kind is rejected (`CONTENT_KIND_CONFLICT`); matching kinds can be edited later by JPN-022 under its conflict rules. A missing reference is an error with a database resolver, or an `EXTERNAL_REFERENCE_UNRESOLVED`/`EXTERNAL_RIGHTS_UNRESOLVED` warning offline. Item references in Lessons and Path placements, Item/Dialogue media references, and Lesson prerequisites are checked. Self-prerequisites and cycles in the combined package/existing prerequisite graph are rejected. Canonical Item keys may be reused by multiple Lessons.

Rights rows require `key`, `originKind`, `sourceLabel`, `attribution`, `permissionBasis`; licensed origins also require `evidenceRef`. `sourceUrl`, when present, must be HTTPS. The package has no clearance-status field. Existing rights statuses are read as `cleared`, `unverified`, or `revoked`; the latter two produce warnings and cannot make content publication-ready. Reports never echo `evidenceRef` or other raw content. Media rows require `key`, `kind`, relative `storageKey`, lowercase SHA-256 checksum, `mimeType`, and `rightsKey`. Kind and MIME type must agree, and unsafe storage keys are rejected. Validation checks metadata, not media bytes or license authenticity.

V6 database hardening preserves the reviewed provenance of a cleared Rights record and records clearance transitions in an internal append-only event table. A changed reviewed source, permission basis or evidence reference needs a new Rights record and an explicitly republished revision. Package validation cannot authorize review, clear Rights, or grant media delivery. JPN-022's authenticated operator actions provide explicit Rights and per-edit-version language reviews.

## Limits and diagnostics

### Additive package 1.1 on the JPN-033 backend branch

Package `1.0` keeps its original closed payload schemas and import meaning. Package `1.1` copies those schemas and permits three new payload fields: ordered `relatedVocabularyRefs` on Kanji; authored `segments` and optional `kanjiDetailCandidate: "yes"` on Example. Existing Vocabulary `exampleRefs` becomes an ordered editorial relationship **only when imported from 1.1**. `itemRefs` remains descriptive and is not a reverse DB edge. A 1.0 update of the same package-owned Item updates only fields understood by 1.0 and **preserves existing draft Item–Item edges**; it cannot author, reorder or delete those edges. A 1.1 reimport of a touched Item replaces its complete draft edge list for that Item kind: a reordered array changes priority, while `[]` or an omitted relationship field clears the list. Only declared Item roots are touched; package ownership, edit-version checks and whole-package byte-checksum idempotency remain in force. Previously sealed published edges and revision pins are unchanged by either import.

The order of each reference array becomes the edge position. Duplicates, missing keys and wrong target kinds are rejected. A published edge pins an explicit target Item revision supplied as `item:<target-stable-key>` in the operator preview/publish pin map; Media pins retain bare Media keys. The first Kanji publication requires at least one related Vocabulary edge with a reviewed, sealed, published, Rights-eligible target revision. Later Rights revocation only removes that target from presentation; it does not invalidate the Kanji revision. Vocabulary–Example edges use the same pin model, but Examples remain optional at read time. No edge may target a newer revision automatically.

`segments` contains one or more ordered objects with nonblank `text` and optional nonblank `reading`. The 1.1 schema declares `minLength: 1` and a non-whitespace pattern for both segment fields; the Java validator also rejects Unicode blank strings. Concatenating `text` must equal `textJa` exactly. The author adds `kanjiDetailCandidate: "yes"` only when the Example is intended for Kanji Detail; the operator's per-edit-version language review must verify all needed Kanji readings and segment boundaries before publication. Technical validation confirms structure and at least one nonblank authored reading, but cannot certify linguistic completeness. The Kanji Detail projection applies the same structural and nonblank checks. No reading is inferred and no HTML ruby is stored.

Kanji stroke guidance uses Item `mediaRefs` with role `stroke-order` and Media kind `writing`. The published Item–Media edge pins its revision. This role is optional only on Kanji for live eligibility; every other Media dependency keeps the existing gate. Validation checks metadata and MIME, not object bytes, SVG/JSON safety or legal provenance. Media byte delivery remains unavailable until a private storage adapter and per-request authorization are implemented and tested.

The validator rejects files over 4 MiB, packages over 10 MiB, more than five data files, more than 5,000 total records or 20,000 references. JSON parsing allows at most 40 nesting levels, 4,000 characters per parsed string and 100 digits per number. At most 200 diagnostics are returned; `truncated: true` makes the report invalid. Invalid UTF-8 and duplicate JSON properties are rejected. Schema objects reject unknown fields; Unicode surrogate validity, Kana script and Kanji glyph checks are applied where relevant.

Reports have `{valid,publicationReady,truncated,errors,warnings}`. Each diagnostic has `{code,severity,file,line,row,field,pointer,entityKey,message}`. CSV `line` is the physical source line and `row` is the logical record number including the header; JSON array row is one based. Diagnostics are sorted by file, row, pointer and code. Fixed messages and stable keys are returned, not source payloads or exception traces. `valid` means no errors or truncation. `publicationReady` is **always false in JPN-021**, including for `valid: true`.

Common codes include `PACKAGE_MANIFEST_REQUIRED`, `PACKAGE_VERSION_UNSUPPORTED`, `PACKAGE_UNSAFE_PATH`, `PACKAGE_FILE_LIMIT`, `PACKAGE_SIZE_LIMIT`, `PACKAGE_RECORD_LIMIT`, `PACKAGE_REFERENCE_LIMIT`, `PACKAGE_INVALID_UTF8`, `JSON_INVALID`, `JSON_DUPLICATE_KEY`, `CSV_MALFORMED`, `CSV_COLUMN_COUNT`, `CSV_DUPLICATE_HEADER`, `CONTENT_REQUIRED_FIELD`, `CONTENT_UNKNOWN_FIELD`, `CONTENT_INVALID_TYPE`, `CONTENT_DUPLICATE_KEY`, `CONTENT_DUPLICATE_POSITION`, `CONTENT_REFERENCE_MISSING`, `LESSON_PREREQUISITE_CYCLE`, `RIGHTS_REFERENCE_MISSING`, `RIGHTS_REVIEW_REQUIRED`, `RIGHTS_UNVERIFIED`, `RIGHTS_REVOKED`, `MEDIA_MIME_MISMATCH` and `MEDIA_STORAGE_KEY_UNSAFE`. The Java sources define the remaining specific codes; clients should branch on `code` and never parse the human message.

Valid example: [`content/examples/v1/valid`](../content/examples/v1/valid) has a complete original illustrative package. It validates with rights-review warnings:

```json
{"valid":true,"publicationReady":false,"truncated":false,"errors":[],"warnings":[{"code":"RIGHTS_REVIEW_REQUIRED","severity":"warning","file":"items.csv","line":2,"row":2,"field":"rightsKey","pointer":"/0/rightsKey","entityKey":"kana-a","message":"Author-supplied rights need authorized review before publication."}]}
```

The example above shows one warning; actual output includes the full sorted warning list. Invalid example: a directory without `manifest.json` yields `valid: false`, error code `PACKAGE_MANIFEST_REQUIRED`, and CLI exit `1`. A malformed manifest yields `JSON_INVALID` and exit `1`. Neither example is silently imported.

## Offline CLI

From `nichigo_backend` on Windows PowerShell with JDK 21+ and `JAVA_HOME` set:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\content-dry-run.ps1 ..\content\examples\v1\valid
```

The argument may instead be the package's `manifest.json`. The launcher uses the Maven Wrapper to build the local classpath and then runs Java directly. Standard output contains one JSON object; operational/build errors go to standard error. Exit `0` is valid, `1` is a validation failure, and `2` is an input or execution failure. This original CLI is offline. The separate JPN-022 [operator CLI](../docs/implementation/JPN-022-operator-runbook.md) provides database-aware dry-run, import, review, preview, publish and inspection; mutating commands require a token and explicit confirmation. Proposed `/api/v1/internal/import/*` endpoints remain unimplemented.

For Kanji stroke delivery, `writing` Media with `application/json` and a `stroke-order` Item reference uses the separate `stroke-asset-v1.schema.json` byte contract. Package import still imports metadata only. The authenticated operator must stage checksum-matching bytes through private CLI before a Kanji publication can pin that stroke. This narrow gate does not change package 1.0/1.1 parsing or publication rules for other Media kinds.
