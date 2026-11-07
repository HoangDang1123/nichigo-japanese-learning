# JPN-ARCH-003 — Hybrid published content

**Status:** Implemented on a stacked review branch. ADR-015 and release require owner review. No production publisher or content upload was added.

## Schema and authority

V8 adds `presentation jsonb` to `lesson_revisions` and `path_revisions`, backfills every existing revision under the migration lock, and compares each generated document with the old rows before retaining the new columns. V9 validates the backfill again, then retires `lesson_revision_objectives` and `lesson_revision_sections`. It removes presentation columns from `path_revision_stages` and `path_revision_chapters`, but **retains these tables** for stable Stage/Chapter identity and independent Rights. No tables are added. All other V4–V7 tables are retained, including the V6 Rights events.

```mermaid
flowchart LR
  subgraph Before_V7
    P7[path_revisions] --> S7[path_revision_stages: identity, rights, display]
    S7 --> C7[path_revision_chapters: identity, rights, display]
    C7 --> PL7[path_revision_lessons: exact pins]
    L7[lesson_revisions] --> O7[lesson_revision_objectives]
    L7 --> LS7[lesson_revision_sections]
    LS7 --> LI7[lesson_revision_items: exact pins]
  end
```

```mermaid
flowchart LR
  subgraph After_V9
    P9[path_revisions: stages/chapters JSONB] --> S9[path_revision_stages: identity and rights]
    S9 --> C9[path_revision_chapters: identity and rights]
    C9 --> PL9[path_revision_lessons: exact pins]
    L9[lesson_revisions: objectives/sections JSONB] --> LI9[lesson_revision_items: exact pins]
  end
```

The JSONB contains only presentation data and stable layout keys. A Path Chapter JSON key equals the UUID of its thin relational Chapter row; a Lesson Section JSON key equals the `section_id` of relational Item pins. No JSONB copy of Path→Lesson or Lesson→Item revision pins exists. Relational pin positions and FKs remain authoritative. The V9 sealing trigger checks unique keys/order, complete Chapter coverage, exact pin-to-layout reconciliation, prerequisite availability/cycles and size limits. The public service validates the closed versioned schemas again and refuses orphan pins. PostgreSQL keeps PKs, FKs, uniqueness, sealed-revision immutability, pointer checks, Rights and V7 set-based eligibility. The Java `CanonicalContentValidator` shares the schema validation boundary with package validation. A small internal publication boundary validates expected edit version, stored document, live dependencies and locks Rights; JPN-022 must still provide the complete authenticated atomic writer.

Path→Lesson→Item→Media exact revision pins remain relational. Publishing a new Item does not mutate its pinned Lesson, and publishing a new Lesson does not mutate its pinned Path (Option B). Reverse lookup indexes on pins remain. Public reads use sealed revisions and current Rights status; withdrawals and revocations can hide historical revisions without changing their identity. Stage/Chapter Rights stayed relational specifically to preserve this property without a synchronized dependency index.

## Migration and verification

The populated migration test starts with V4 data, advances through V9 and compares stable identities, publication pointers, order, historical presentation and Rights. Integration tests cover public API compatibility, draft isolation, Option B, revocation/withdrawal, malformed layout rejection at seal and transaction rollback. The new schema validator has focused unit tests. On 2026-11-08, `nichigo_backend/.\mvnw.cmd verify --no-transfer-progress -q` using local PostgreSQL 17 and `DB_URL=jdbc:postgresql://localhost:5432/nichigo?currentSchema=jpn021_arch003_verify2_20261108` passed **56 tests, 0 failures, 0 errors, 0 skipped** and Maven verify. The populated upgrade test created and removed only its own nested schema. A repeat run against a previously used schema failed on an existing test's fixed Rights key; fresh schemas are required for reproducible runs. Frontend `npm run lint`, `npm run type-check` and `npm run build` each passed; no frontend source changed.

### V7 versus V9 synthetic performance

The committed JPN-020 fixture has 5 Paths, 5,000 Lessons and 50,000 Items. PostgreSQL 17.4 was initialized in an isolated temporary cluster on the workspace drive after the default local database drive ran out of space. One schema received V1–V4, the fixture and V5–V7; a second received the same sequence then V8–V9. Both had targeted `ANALYZE` on only their own tables. Each query had 20 warm `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` executions; p50/p95 are sorted observations 10 and 19. Timings are representative SQL, not HTTP latency or concurrent throughput.

| Query / 20 warm runs | V7 p50/p95 ms | V9 p50/p95 ms | Median shared hits V7/V9 | Rows |
| --- | ---: | ---: | ---: | ---: |
| Path eligibility, `path_revision_public` | 63.565 / 69.173 | 63.502 / 69.292 | 4,816 / 4,947 | 1 |
| Path detail hierarchy and pinned Lessons | 2.408 / 2.536 | 6.434 / 6.802 | 167 / 349 | 1,000 |
| Lesson detail Section and pinned Items | 0.240 / 0.282 | 0.355 / 0.461 | 53 / 50 | 10 |
| Skills first 20 kana | 4.499 / 4.922 | 4.554 / 5.430 | 397 / 394 | 20 |

The Path eligibility p50 and p95 are effectively unchanged; the V7 set-based optimization is preserved. The representative Path detail join is about 4 ms slower at p50 because V9 expands nested JSON and casts Chapter keys before joining the 1,000 relational pins. Its plan uses `jsonb_array_elements` function scans, a hash join on Chapter UUID and a final sort; V7 joins indexed relational Stage/Chapter rows. This is a real tradeoff, not a claimed improvement. The current API executes several smaller ordered queries rather than this combined query, so measure end-to-end latency and realistic Path sizes before release. Skills is effectively unchanged. Publication write throughput is unmeasured because JPN-022's production writer does not exist.

Schema table count fell from 31 to 29 in this fixture (including non-content tables), while summed table-plus-index storage rose from 80,789,504 to 81,248,256 bytes, about 0.57%. This is a structural simplification, not a storage saving. The isolated cluster was stopped after measurements; its temporary data directory at `H:\Code\Projects\jpnarch003_pgbench_20261108` remains because automatic approval review rejected recursive deletion.

## Boundaries and remaining work

Database roles with DDL or trigger-disabling privileges can bypass the publication guard; production roles must not have those privileges. JPN-022 owns authenticated review/operator attribution, package idempotency, full transactional publication, concurrent dependency rechecks and media delivery authorization. No production writer currently calls the internal boundary. Learner attempts/progress and curriculum decisions remain separate. Full concurrency and media-heavy benchmark coverage remain open.
