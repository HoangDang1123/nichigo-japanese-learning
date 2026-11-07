# JPN-021 content package contract — schema version 1.0

This document describes the implemented authoring and offline validation format. The exact field types, maximum lengths, enums, required fields and closed-field lists are in [`content/schemas/v1`](../content/schemas/v1). The Java validator enforces the schema subset used there plus the cross-record rules below. No format validity or dry-run result grants publication clearance. JPN-022 import and operator HTTP contracts remain proposed.

`ContentSchemaValidator` enforces the schema keywords used by these files: `type` (object, array, string, integer), `required`, `properties`, `additionalProperties: false`, `items`, `minItems`, `maxItems`, `maxLength`, `pattern`, `enum`, and `minimum`. `$schema` and `title` are annotations. This is a checked-in JSON Schema subset, not a general Draft 2020-12 validator; adding another keyword requires implementation and tests before relying on it.

## Package and files

A package is one flat directory with `manifest.json` and one to five declared data files. The manifest requires `schemaVersion: "1.0"`, `packageKey`, semantic `packageVersion` (three nonnegative dotted integers), `locale: "vi"`, and `files: [{"path":"items.csv","type":"items"}, ...]`; `author` is optional. Only schema version `1.0` is accepted. Each type appears at most once. Types `rights`, `media`, `items` use `.csv`; `lessons`, `paths` use `.json`. Every declared file must exist, and undeclared files are rejected. File names are flat ASCII lowercase names matching `[a-z][a-z0-9-]*.(csv|json)`, at most 80 characters. No directory paths, `..`, symlinks or URLs are followed by the CLI.

CSV uses known headers, UTF-8, comma separators and RFC-4180-style quoted fields. Optional columns may be omitted; required columns must be present. Empty cells become absent fields and required values are then rejected. JSON-valued Item cells (`payload`, `knowledgeDomains`, `languageSkills`, `topics`, `mediaRefs`) contain JSON encoded as a quoted CSV cell. Duplicate or unknown headers, malformed quoting and inconsistent column counts are errors.

| File | Required headers | Other allowed headers |
| --- | --- | --- |
| `rights.csv` | `key,originKind,sourceLabel,attribution,permissionBasis` | `sourceUrl,evidenceRef` |
| `media.csv` | `key,kind,storageKey,checksumSha256,mimeType,rightsKey` | `altTextVi,transcriptVi` |
| `items.csv` | `key,kind,payload,rightsKey` | `displayTextJa,displayTextVi,jlptLevelCode,communicationLevelCode,knowledgeDomains,languageSkills,topics,mediaRefs` |

`lessons.json` and `paths.json` each have exactly two root properties: `schemaVersion: "1.0"` and, respectively, `lessons: [...]` or `paths: [...]`. Each Lesson requires `key`, `slug`, `titleVi`, `rightsKey`, `objectives`, `sections`; optional `summaryVi`, level codes and `prerequisites`. Sections have `key`, `position`, optional `titleVi`, and ordered `items: [{position,itemKey}]`. Each Path requires `key`, `titleVi`, `rightsKey`, `stages`; Stages require `key`, `position`, `titleVi`, `rightsKey`, `chapters`; Chapters require the same core fields plus `lessons: [{key,position,lessonKey}]`. Descriptions are optional. See the linked schemas for nested bounds and exact allowed fields.

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

Keys use lowercase kebab case matching `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$` and at most 80 characters. Duplicate keys within one record type are rejected. Item, Lesson and Media keys identify their respective editorial roots globally; Rights keys are globally unique when present in V5. A Section key is unique within its Lesson, and a Path placement key is unique within its Chapter. Stage keys are unique within a Path and Chapter keys within a Stage. Sibling `position` values must be positive and unique. Reordering must retain keys; position is not identity. JPN-022 must reconcile matching keys under an authenticated, version-checked transaction; JPN-021 does not upsert or infer a new revision.

Package-local references resolve before database references. A local Rights declaration still requires authorized review even if a database row has the same key. An Item key matching an existing Item with a different kind is rejected (`CONTENT_KIND_CONFLICT`); matching kinds can be edited later by JPN-022 under its conflict rules. A missing reference is an error with a database resolver, or an `EXTERNAL_REFERENCE_UNRESOLVED`/`EXTERNAL_RIGHTS_UNRESOLVED` warning offline. Item references in Lessons and Path placements, Item/Dialogue media references, and Lesson prerequisites are checked. Self-prerequisites and cycles in the combined package/existing prerequisite graph are rejected. Canonical Item keys may be reused by multiple Lessons.

Rights rows require `key`, `originKind`, `sourceLabel`, `attribution`, `permissionBasis`; licensed origins also require `evidenceRef`. `sourceUrl`, when present, must be HTTPS. The package has no clearance-status field. Existing rights statuses are read as `cleared`, `unverified`, or `revoked`; the latter two produce warnings and cannot make content publication-ready. Reports never echo `evidenceRef` or other raw content. Media rows require `key`, `kind`, relative `storageKey`, lowercase SHA-256 checksum, `mimeType`, and `rightsKey`. Kind and MIME type must agree, and unsafe storage keys are rejected. Validation checks metadata, not media bytes or license authenticity.

## Limits and diagnostics

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

The argument may instead be the package's `manifest.json`. The launcher uses the Maven Wrapper to build the local classpath and then runs Java directly. Standard output contains one JSON object; operational/build errors go to standard error. Exit `0` is valid, `1` is a validation failure, and `2` is an input or execution failure. The CLI is offline and never connects to a database, imports content, alters rights or publishes revisions. The proposed `/api/v1/internal/import/*` endpoints in the REST contract are separate JPN-022 work.
