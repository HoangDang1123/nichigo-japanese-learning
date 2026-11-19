# JPN-022 operator runbook

Use a dedicated PostgreSQL credential and an explicit `currentSchema` in `DB_URL`. Back up and verify the target environment before production migration. For local verification, use a disposable PostgreSQL schema. Set `DB_USERNAME`, `DB_PASSWORD`, `CONTENT_OPERATOR_ID`, and `CONTENT_OPERATOR_TOKEN_SHA256` in the operator environment. The token must be at least 32 characters; compute its lowercase SHA-256 hash locally and store the token itself only in an operator secret manager. Rotate by changing the token and hash together. Never put the token in a command line, script or committed file. Mutating commands prompt for it or read one line on stdin.

From the repository root on Windows:

```powershell
.\nichigo_backend\scripts\content-operator.ps1 validate .\content\examples\v1\valid
.\nichigo_backend\scripts\content-operator.ps1 dry-run .\content\examples\v1\valid
.\nichigo_backend\scripts\content-operator.ps1 import .\content\examples\v1\valid --confirm
.\nichigo_backend\scripts\content-operator.ps1 inspect batch <batch-uuid>
.\nichigo_backend\scripts\content-operator.ps1 rights review original-sample cleared --confirm
.\nichigo_backend\scripts\content-operator.ps1 language review item kana-a 1 --confirm
.\nichigo_backend\scripts\content-operator.ps1 language review lesson intro-kana-a 1 --confirm
.\nichigo_backend\scripts\content-operator.ps1 language review path intro-path 1 --confirm
.\nichigo_backend\scripts\content-operator.ps1 preview item kana-a
.\nichigo_backend\scripts\content-operator.ps1 publish item kana-a --expected-version 1 --confirm
.\nichigo_backend\scripts\content-operator.ps1 preview lesson intro-kana-a --pin kana-a=1
.\nichigo_backend\scripts\content-operator.ps1 publish lesson intro-kana-a --expected-version 1 --pin kana-a=1 --confirm
.\nichigo_backend\scripts\content-operator.ps1 preview path intro-path --pin intro-kana-a=1
.\nichigo_backend\scripts\content-operator.ps1 publish path intro-path --expected-version 1 --pin intro-kana-a=1 --confirm
.\nichigo_backend\scripts\content-operator.ps1 inspect publication path intro-path
.\nichigo_backend\scripts\content-operator.ps1 rights review original-sample revoked --confirm
```

For Media, review its Rights and language candidate, then `publish media <key> --expected-version <n> --confirm`. Item publication referencing Media requires `--pin <media-key>=<published-revision>` for every association. Supply repeated `--pin` pairs for multiple dependencies. The `preview` output lists required keys and echoes the exact selected pins when provided; inspect the actual revision content and reviewer evidence before confirming. A v2 Item can be published without moving Lesson v1. Publish a new Lesson with an explicit Item v2 pin, then a new Path with the desired Lesson revision pin. An existing Path continues to serve its older graph until deliberately republished. Never use synthetic example content in a learner-facing environment.

For Kanji stroke JSON, set `STROKE_STORAGE_ROOT` to an existing absolute private persistent directory before starting the operator or API. After importing Media/Item metadata, stage the bytes with `content-operator.ps1 stroke ingest <media-key> <kanji-key> <local-json-path> --confirm`; it uses the same token input as other mutations. The bytes must match the draft Media SHA-256, MIME and Kanji glyph. Review Rights and language, publish Media, then publish Kanji with the explicit Media revision pin. Reusing an occupied storage key with different bytes is rejected; stage a new draft key and publish a new Media revision instead. Filesystem mounts without atomic hard-link support fail closed. No public upload route exists.

Before setting `STROKE_STORAGE_ROOT` in any deployment, verify filesystem ACLs for the root and every ancestor/mount point: only the service account, trusted operator identity and administrators may write, delete or rename entries. Do not use a shared writable temp directory or a mount writable by other users/processes. Java path checks cannot eliminate a concurrent parent-directory swap by an actor with those permissions; such a mount is unsupported. Also verify the mount supports atomic hard-link creation and remains private from the web/static server.

`validate` is offline. `dry-run`, `preview` and `inspect` disable Flyway and do not write. Mutating commands authenticate before Spring starts, then run Flyway before the operation. An invalid package, stale edit version, missing review, Rights conflict, unavailable dependency, failed constraint or wrong pin rolls back the action; correct the input and retry. Applied batches are immutable; failed attempts leave no batch row. The script exits with status 0 success, 1 content failure, 2 usage/execution failure, or 3 authentication failure. Standard output is one JSON result; startup diagnostics go to standard error. Do not disclose private Rights evidence or credential material in tickets or learner APIs.
