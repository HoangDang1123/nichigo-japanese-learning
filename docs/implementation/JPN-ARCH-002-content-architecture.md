# JPN-ARCH-002 — Content architecture hardening and draft-model decision

**Status:** Implemented on the review branch; PostgreSQL tests and local synthetic benchmarks run. Owner review, merge and release are separate. ADR-015 remains proposed. This task does not add an importer, publisher, CMS, quiz or progress model.

## Decision and scope

Keep the relational working-draft model and the existing sealed relational publication graph. The 27 V4 content tables are not independently necessary for every future editor, but the published revision tables and pinned edges protect real invariants: exact Path → Lesson → Item → Media revisions, stable placement identity, foreign-key referential integrity and deterministic order. A JSONB-draft prototype reduced some draft write statements, but did not demonstrate lower total complexity after validation, stable-key reconciliation, conflict handling and migration are included. Reconsider it when a real JPN-022 importer supplies measurable authoring costs. Do not replace published revisions with JSONB snapshots on current evidence.

The shared JPN-021 `CanonicalContentValidator` remains independent of CSV/JSON file parsing and of draft persistence. Neither model changes the package contract or public API. Path contextual Lesson reads still resolve the pinned Lesson revision, and independent Lesson/Skills reads use their own current published pointers. Lesson completion and Item mastery remain separate future models; attempts should record stable IDs and actual revision IDs. Locale-aware text can be added without changing identity until product rules for translated versus distinct curricula are approved.

## V6 — Reviewed Rights evidence

V4 allowed updates to `content_rights` source, attribution, permission basis and evidence after a record was cleared. A sealed revision held only the Rights ID, so its reviewed provenance could be silently rewritten. V6 adds `content_rights_events` and snapshots the current state of every existing Rights row at upgrade. A trigger records subsequent status transitions with source metadata and private evidence; another trigger rejects event updates/deletes. Once a record is cleared, its stable authoring key, reviewed metadata and `reviewed_at` are frozen. Cleared can only remain cleared or become revoked; V4 already rejects revoked → non-revoked. A new reviewed provenance therefore needs a new Rights record and a new publication revision. The existing UUID, V5 stable key, revision identity and publication pointer are retained.

The baseline event captures the **state at V6 migration**, not a reconstruction of any pre-V6 edits. There is no reviewer identity, signature, or operator authorization in this task; JPN-022 must add authenticated review and audit attribution. Rights events contain private evidence and have no public API. Direct database superusers can bypass triggers, so database privileges and backup/audit controls remain operational requirements.

Sealing a revision locks its root Rights row `FOR SHARE`; a simultaneous revocation update waits. The production publisher still must lock and recheck **all** dependency Rights rows within its transaction. A read uses a repeatable-read snapshot: a revocation committed after a response snapshot cannot retract a response or already delivered media bytes. No media URL is issued today. Future delivery must use private storage, recheck eligibility at issuance, and define signed-URL lifetime/cache policy; public immutable CDN URLs cannot satisfy immediate revocation.

## V7 — Set-based Path eligibility

The V4 Path check called `lesson_revision_public` for each placement, which called `item_revision_public` per Item and `media_revision_public` per Media. The JPN-020 fixture's 1,000-Lesson Path traversed about 10,000 Item dependencies. V7 checks root, Stage, Chapter, Lesson, Item and Media Rights/seal/withdrawal sets directly over exact pinned revisions. It never follows working rows or a child's current pointer. A missing Rights row fails closed through `IS DISTINCT FROM 'cleared'`; published Stage/Chapter Rights remain `NOT NULL`. Existing FK and order constraints remain. The public repository and DTO contract did not change.

### Reproducible synthetic comparison

Local PostgreSQL 17, isolated `jpnarch002_bench_20261108` schema, the committed JPN-020 fixture (5 Paths, 5,000 Lessons, 50,000 Items), and collected planner statistics. Each function ran 20 warm `EXPLAIN (ANALYZE, BUFFERS)` calls in one psql session. The query was `SELECT path_revision_public(benchmark_uuid('path',1),1)` for V7 and `SELECT path_revision_public_legacy(benchmark_uuid('path',1),1)` for V4. The old V4 function was copied under that comparison name **only in the disposable schema**. Timings are SQL function calls, not HTTP request latency or concurrent throughput. p50/p95 use sorted observations 10 and 19 of 20.

| Path eligibility | p50 execution | p95 execution | shared-buffer hits (median) |
| --- | ---: | ---: | ---: |
| V4 nested function | 525.313 ms | 598.901 ms | 108,144 |
| V7 set-based function | 31.351 ms | 32.562 ms | 3,840 |

A separate first `EXPLAIN` after each change measured 585.998 ms and 109,255 hits for V4 versus 85.456 ms and 4,865 hits for V7. The V7 inlined query plan uses sequential scans of the 50,000-row Item and Item-revision tables with hash/set joins, plus indexed joins for selected edges. That is a planner choice on this fixture, not an index-removal recommendation. Existing PKs on revision identity and edge parent keys, `ix_lesson_revision_items_target`, and `ix_path_revision_lessons_target` remain. The indexed Skills benchmark in JPN-020 is separate and was not rerun. Recheck plans on realistic production data and concurrent load before an SLO claim.

One benchmark setup command issued unqualified `ANALYZE` on the local database. It may have refreshed planner statistics outside the disposable schema; it did not change application rows. Subsequent SQL measurements selected only the disposable schema through `search_path`. Future runs should enumerate the isolated schema's tables for `ANALYZE` explicitly.

## Relational versus JSONB working-draft prototype

[`jpnarch002-draft-prototype.sql`](../../nichigo_backend/src/test/resources/jpnarch002-draft-prototype.sql) runs after the benchmark fixture and V1–V7 in an isolated schema. Both model transactions roll back. Each imports a Lesson draft referencing Item 1 (already used by another Lesson), edits that Item, reorders two Sections and two Item placements, updates a working Path placement, publishes Lesson 1 revision 2 through the same relational graph, and queries the Path still pinned to Lesson revision 1. Both yielded `draft_item_refs=2`, `paths_still_pinning_v1=1`, `current_lesson_revision=2`. This checks the core Option B and reuse behavior; it is not a production publishing workflow or complete validator implementation.

| Workload in prototype | Relational working rows | JSONB working document |
| --- | --- | --- |
| Import Lesson draft | 3 INSERT statements for root, Sections and Item placements | 2 INSERT statements for root and document, plus prototype table setup |
| Edit reused Item | 1 conditional root UPDATE | Same 1 UPDATE |
| Swap Sections and two Items | 6 UPDATEs because unique positions need temporary slots | 1 document UPDATE with expected edit version |
| Move a working Path placement | 1 UPDATE | 1 document UPDATE |
| Publish Lesson revision 2 | Same 5 relational insert/seal/pointer statements | Same 5 statements |
| Find a pinned downstream Path | Same reverse-edge query | Same reverse-edge query |

Each statement is a psql round trip in the prototype; production batching could reduce either count. The JSONB document deliberately has no database foreign keys for nested Item/placement references and no database uniqueness constraint for nested positions. Implementing its safe writer would require canonical validation, version checks, complete stable-key reconciliation, and a rule preventing direct SQL from bypassing these checks. The JPN-021 validator can serve both input adapters, but the prototype does not measure Java implementation size or concurrent edit conflict rates. The relational model already enforces these draft relationships and is used by the current source/tests. Its extra reorder writes do not justify a migration without a real authoring bottleneck. A JSONB approach would be preferable if a future CMS predominantly replaces whole documents, editing conflicts are rare, and its integrated writer is demonstrably simpler.

Historical placements cannot be silently reassigned to a different Lesson: `fk_pinned_placement_identity` binds the placement UUID to Chapter and Lesson. A changed Lesson identity requires a new placement identity and explicit Path publication. Position is presentation order, not identity. This should be surfaced by JPN-022's key reconciliation diagnostics.

## Verification and remaining work

The PostgreSQL integration suite covers reviewed Rights immutability/events, revocation, a sealing/revocation lock race, all six Path Rights layers, Media/Item/Lesson/Path withdrawal, revision pins, order, rollback and public draft isolation. The populated migration test now runs V4 → V5 → V6 → V7 and checks preexisting IDs, order, seal, pointer and the V6 Rights baseline event. JPN-021 parser/validator tests remain unchanged except making one fixture text substitution independent of CRLF/LF checkout conversion.

On 2026-11-08, with `DB_URL` targeting a newly created local `jpn021_arch002_verify_20261108` PostgreSQL schema, `nichigo_backend/.\mvnw.cmd verify --no-transfer-progress` passed: **49 tests, 0 failures, 0 errors, 0 skipped**, followed by a successful Maven verify build. The populated upgrade test created and removed only its own nested isolated schema. The draft prototype was run separately with `psql -v ON_ERROR_STOP=1 -f nichigo_backend/src/test/resources/jpnarch002-draft-prototype.sql` against the disposable benchmark schema and both transactions rolled back. All disposable schemas created for this task were dropped by exact name after verification. Frontend `npm run lint`, `npm run type-check`, and `npm run build` each exited 0; no frontend source changed. CI on the review branch is pending.

JPN-022 still owns authenticated review actor evidence, import idempotency, locked revalidation of every dependency, optimistic edit conflicts, production multi-root publish/rollback, publication-size limits and audit access. JPN-032/JPN-040 own quiz/progress semantics. Concurrent load at 100 and 1,000 learners and realistic media-heavy Paths is unmeasured; measure p50/p95/p99, buffers, CPU, connections and revocation latency before release. A future snapshot migration would require historical parity tests and a non-destructive backfill, not an in-place rewrite of V4/V5.
