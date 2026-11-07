# REST API Contract — implemented auth and proposed learning endpoints

**Base:** `/api/v1`; JSON UTF-8; authenticated identity from server session cookie, not request body. Auth and the five JPN-020 public learning-content GET routes are merged in `origin/main`; deployment is not evidenced. JPN-021 supplies an offline local validation CLI, **not an HTTP endpoint**. Other learning routes below, including JPN-022 operator import/publish routes, remain proposals. Content errors use the existing flat `{ "code", "message" }` shape. The implemented package format is specified in [the JPN-021 content package contract](02-CONTENT-PACKAGE-CONTRACT.md).

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Email/password registration |
| POST | `/auth/login` | Public | Create session |
| POST | `/auth/logout` | Session | Revoke session |
| GET | `/auth/me` | Session | Current authenticated user; 401 without a valid session |
| GET | `/auth/csrf` | Public | CSRF token and header name for auth mutations |
| GET | `/learning-paths` | Public | Published paths, keyset-paginated |
| GET | `/learning-paths/{slug}` | Public | Published Stage → Chapter → Lesson hierarchy |
| GET | `/learning-paths/{pathSlug}/placements/{placementId}/lesson` | Public | Exact Lesson revision pinned by a placement in the current published Path |
| GET | `/skills/{type}/items` | Public | Published canonical items by content kind, keyset-paginated |
| GET | `/lessons/{slug}` | Public | Published objectives, sections, items and approved media metadata |
| POST | `/lessons/{id}/attempts` | Guest/User | Submit exercise answers; server grading |
| POST | `/lessons/{id}/complete` | Guest/User | Idempotent completion; quota check in same transaction |
| GET | `/progress` | Guest/User | Lesson/item progress |
| GET | `/guest/quota` | Guest | Current day allowance and usage |
| GET | `/tour/status` | Guest/User | Tour state |
| PUT | `/tour/status` | Guest/User | Mark skipped/completed/in-progress |
| POST | `/internal/import/validate` | Operator | **Proposed JPN-022** authenticated dry-run transport; JPN-021 has a local CLI only |
| POST | `/internal/import/batches` | Operator | **Proposed JPN-022** import validated content |
| POST | `/internal/import/batches/{id}/publish` | Operator | **Proposed JPN-022** publish reviewed content |

**Proposed learning typed error (not the current auth error shape)**
```json
{"error":{"code":"GUEST_QUOTA_EXCEEDED","message":"Daily lesson limit reached","requestId":"..."}}
```
HTTP: 400 invalid payload; 401 unauthenticated; 403 unauthorized; 404 unpublished/not found; 409 conflict; 422 content validation; 429 rate limited; 503 temporary upstream unavailability. Quota exhaustion could use 403 or 429; decide and document one consistently before implementation.

The implemented auth API uses `{ "code": "...", "message": "..." }` for its errors, not the proposed nested learning error above. See `docs/implementation/JPN-010-auth-backend.md` and `JPN-010-frontend-auth.md` for verified auth behavior and tests. No guest identity is returned by `/auth/me` today.

### JPN-020 public content reads (merged in `origin/main`)

- `GET /learning-paths?limit=20&after=<slug>` returns `{ "paths": [{ "id", "slug", "title", "revision" }], "nextCursor": string|null }`. `limit` is 1–50. Results are sorted by stable slug.
- `GET /learning-paths/{slug}` returns `{ id, slug, title, description, revision, stages: [{ id, position, title, description, chapters: [{ id, position, title, description, lessons: [{ id, placementId, slug, position, revision, title, summary }] }] }] }`. Each level has deterministic position ordering. The pinned Lesson revision is included; the response contains no learner-specific station status.
- `GET /learning-paths/{pathSlug}/placements/{placementId}/lesson` returns the same Lesson DTO as `/lessons/{slug}`, resolved from the **current published and eligible Path revision** and its matching placement. The placement's pinned Lesson revision and all its dependencies must remain eligible. Unknown Path, absent/malformed placement, withdrawn identity or revoked required right returns 404. The client cannot choose a Path or Lesson revision; a `revision` query parameter does not override the resolution.
- `GET /lessons/{slug}` returns `{ id, slug, revision, title, summary, objectives: [{ position, kind, text }], sections: [{ id, position, title, items: [{ id, position, content: { id, key, revision, kind, displayTextJa, displayTextVi, payload, media: [{ id, revision, kind, role, mimeType, altTextVi, transcriptVi }] } }] }] }`. `payload` varies by canonical kind. Media storage keys and private rights evidence are never returned.
- `GET /skills/{type}/items?limit=20&after=<stable-key>` returns `{ "items": [{ "id", "key", "revision", "kind", "displayTextJa", "displayTextVi" }], "nextCursor": string|null }`. Current `type` values are `kana`, `vocabulary`, `grammar`, `kanji`, `example`, `dialogue`. This is a content-kind filter; listening/reading/writing/speaking are separate language-skill tags, while flashcards/quizzes are practice/assessment modes, not kinds.

Both listing routes enforce `limit` 1–50 and a cursor length ≤200; invalid filters return 400 with `invalid_content_query`. Unpublished, withdrawn, rights-invalid and nonexistent detail resources return 404 with `content_not_found`. A Path or Lesson with an invalid required pinned dependency is unavailable as a whole, never silently partial. Database read failures return a generic 503 `content_unavailable`, without SQL details. **Independent Lesson access** returns the Lesson root's current published revision. **Path-contextual access** returns the exact revision pinned by a placement in the current published Path, even if the Lesson root has since advanced. Historical audit access is deferred to an authorized internal JPN-032/JPN-022 design; there is no unrestricted historical-revision public route. Public reads resolve only sealed revisions and live rights status in a repeatable-read transaction. Publication/withdrawal endpoints and a media delivery URL are **not** implemented in JPN-020.

Until detail pagination is designed, the backend refuses a Path larger than 100 Stages, 100 Chapters or 1,000 placements and a Lesson larger than 100 Sections, 1,000 Items, 1,000 Objectives or 5,000 media references with the generic 503 response. JPN-022 must reject such a candidate before publication; this is a protective API bound, not an approved curriculum size.

**Idempotency:** lesson completion uniquely keyed by actor/lesson; repeated calls must not double count. Import keyed by `source + externalId + version` or an explicitly documented stable key. Do not trust client-provided grade, quota date or user ID.

**Tour:** `status = not_started | in_progress | completed | skipped`; `tourVersion` and `lastStep` allow future updates. Guest persistence best effort until retention policy approved.

**Open:** session cookie/domain topology, password reset/verification, exact guest quota, merge semantics, JPN-022 operator transport and authorization, API response envelope. The JPN-021 offline CLI does not settle an HTTP transport decision.
