# JPN-033 Kanji v2b content pilot

## Scope and provenance

`content/pilots/jpn-033-kanji-v2b/package` is a package 1.1 technical pilot for 山, 川 and 人. It has three Kanji, six canonical Vocabulary Items, six canonical Example Items, three writing Media records and eighteen separate Rights proposals. Each Kanji has two ordered Vocabulary references; each Vocabulary has one Example reference. Examples use authored `segments` and `kanjiDetailCandidate: yes`. No Lesson or Path records are included.

The Japanese phrases and Vietnamese translations were drafted for this pilot. They have **not** received qualified language review. The `stroke-fixtures` JSON bytes were drawn from simple schematic paths and arrows to exercise validation, checksums, ingestion and delivery. They are **not verified stroke outlines, directions or teaching content**. Their three, three and two path counts are test data; no production asset Rights or language clearance is granted by this repository. No AnimCJK or MakeMeAHanzi data is included.

`generate-fixtures.py` deterministically writes the package and asset bytes, including SHA-256 values in `media.csv`. The package stores metadata only; fixture bytes are adjacent to, and not inside, the import directory.

## Isolated execution

Use a fresh PostgreSQL database/schema and a fresh private storage root outside the repository and public/static directories. Set `DB_URL` with an explicit `currentSchema`, `DB_USERNAME`, `DB_PASSWORD`, `STROKE_STORAGE_ROOT`, `CONTENT_OPERATOR_ID` and `CONTENT_OPERATOR_TOKEN_SHA256` as described in [the JPN-022 runbook](JPN-022-operator-runbook.md). Use a test-only operator token. Never point this pilot at production or a learner-facing environment.

From the repository root:

```powershell
python .\content\pilots\jpn-033-kanji-v2b\generate-fixtures.py
.\nichigo_backend\scripts\content-operator.ps1 validate .\content\pilots\jpn-033-kanji-v2b\package
.\nichigo_backend\scripts\content-operator.ps1 dry-run .\content\pilots\jpn-033-kanji-v2b\package
.\nichigo_backend\scripts\content-operator.ps1 import .\content\pilots\jpn-033-kanji-v2b\package --confirm
.\nichigo_backend\scripts\content-operator.ps1 import .\content\pilots\jpn-033-kanji-v2b\package --confirm
```

The first import must report `applied`; the second must report `already_applied`. Validation should report `valid: true`, `publicationReady: false` and eighteen Rights-review warnings. In a disposable database, an authorized test operator may then perform explicit Rights and language review for each imported key. This mimics the workflow, **not** professional editorial or legal approval. Inspect each candidate before review. The order is:

1. Review Rights for the eighteen `rights-pilot-*` keys. Review language for the fifteen Items and three Media at edit version 1.
2. Publish each Example with no pins. Publish each Vocabulary with `--pin item:pilot-example-<word>=1`.
3. Ingest each fixture with `stroke ingest pilot-stroke-<slug> pilot-kanji-<slug> <absolute fixture path> --confirm`, then publish its Media at version 1. The corresponding Media checksum must match the source bytes.
4. Preview and publish each Kanji with its two `item:pilot-vocab-*` revision 1 pins and `pilot-stroke-<slug>=1`. A Kanji publish before its Vocabulary or before stroke ingestion must fail.
5. Call anonymous `GET /api/v1/skills/kanji/{itemId}` and `GET /api/v1/skills/kanji/{itemId}/stroke-asset` using the Item UUID returned by the isolated database. The detail must show ordered Vocabulary, pinned Examples and segments. The asset route must return the exact fixture bytes with `Cache-Control: no-store`.
6. In the disposable database only, revoke `rights-pilot-example-yama`, `rights-pilot-vocab-yama` and `rights-pilot-stroke-yama` one at a time. The corresponding Example, Vocabulary and asset disappear while the Kanji detail remains public. The stroke route becomes 404.

The automated path is `KanjiContentPilotIntegrationTest`, which reads these same files and invokes the existing import, review, publication and HTTP services on an isolated test database and temporary private storage root. It verifies the gate, pins, checksums, anonymous Skills and stroke delivery, and independent Rights revocation. Existing suite tests cover Lesson/Path and Guest regressions; this pilot introduces no new Lesson/Path records.

The authored Vocabulary `exampleRefs` supply the ordered publication edges. Example `itemRefs` document the reverse association and are validated as references; they are not separate publication pins. Media metadata can publish before its bytes are ingested, while a Kanji publication pinning that Media is blocked until valid bytes are staged. The pilot test checks both rules. The generated package is a single fixed version, so content edits require a new package version and a fresh review/publish cycle; rerunning the same version is idempotent.

## Local verification, 2026-11-19

- Offline operator `validate` on the package: valid, zero errors, eighteen Rights-review warnings, `publicationReady: false`.
- Full `nichigo_backend/mvnw.cmd -q test --no-transfer-progress` with PostgreSQL 17 at `127.0.0.1:55487`, disposable `jpn021_content_pilot_final` schema and JUnit temporary private stroke root: **82 tests, zero failures, zero errors, one skipped**. Flyway V1–V10 applied; V10 history row is successful.
- The skipped `StrokeAssetSecurityTest.rejectsParentAndTargetSymlinks` case is an existing Windows environment limitation: test symlink creation was denied. Linux CI evidence for this case belongs to the stroke-delivery work, not to this pilot.
- `git diff --check`: passed. The initial full-suite attempt used a schema name without the mandatory `jpn021_` prefix; two isolation guards correctly refused to run. A fresh correctly named schema was used for the passing run. No existing schema was removed.

## Limits and review gates

Package validation checks structure and references, not Japanese correctness or artwork provenance. The test's review calls only prove that explicit gates work in a disposable environment. Production publication requires qualified language review, Rights review and separately approved production asset provenance. The production private persistent mount and filesystem permissions remain unapproved; frontend integration remains pending. The pilot must not be imported into production or interpreted as released content.
