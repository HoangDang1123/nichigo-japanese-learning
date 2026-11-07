# REST API Contract — implemented auth and proposed learning endpoints

**Base:** `/api/v1`; JSON UTF-8; authenticated identity from server session cookie, not request body. Auth endpoints are merged in `origin/main`. The four public learning-content GET routes are implemented on the JPN-020 backend branch but are not merged or deployed. All other learning routes below remain proposals. Content errors use the existing flat `{ "code", "message" }` shape.

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Email/password registration |
| POST | `/auth/login` | Public | Create session |
| POST | `/auth/logout` | Session | Revoke session |
| GET | `/auth/me` | Session | Current authenticated user; 401 without a valid session |
| GET | `/auth/csrf` | Public | CSRF token and header name for auth mutations |
| GET | `/learning-paths` | Public | Published paths, keyset-paginated |
| GET | `/learning-paths/{slug}` | Public | Published Stage → Chapter → Lesson hierarchy |
| GET | `/skills/{type}/items` | Public | Published canonical items by content kind, keyset-paginated |
| GET | `/lessons/{slug}` | Public | Published objectives, sections, items and approved media metadata |
| POST | `/lessons/{id}/attempts` | Guest/User | Submit exercise answers; server grading |
| POST | `/lessons/{id}/complete` | Guest/User | Idempotent completion; quota check in same transaction |
| GET | `/progress` | Guest/User | Lesson/item progress |
| GET | `/guest/quota` | Guest | Current day allowance and usage |
| GET | `/tour/status` | Guest/User | Tour state |
| PUT | `/tour/status` | Guest/User | Mark skipped/completed/in-progress |
| POST | `/internal/import/validate` | Operator | Dry-run import |
| POST | `/internal/import/batches` | Operator | Import validated content |
| POST | `/internal/import/batches/{id}/publish` | Operator | Publish reviewed content |

**Proposed learning typed error (not the current auth error shape)**
```json
{"error":{"code":"GUEST_QUOTA_EXCEEDED","message":"Daily lesson limit reached","requestId":"..."}}
```
HTTP: 400 invalid payload; 401 unauthenticated; 403 unauthorized; 404 unpublished/not found; 409 conflict; 422 content validation; 429 rate limited; 503 temporary upstream unavailability. Quota exhaustion could use 403 or 429; decide and document one consistently before implementation.

The implemented auth API uses `{ "code": "...", "message": "..." }` for its errors, not the proposed nested learning error above. See `docs/implementation/JPN-010-auth-backend.md` and `JPN-010-frontend-auth.md` for verified auth behavior and tests. No guest identity is returned by `/auth/me` today.

### JPN-020 public content reads (implemented on the feature branch)

- `GET /learning-paths?limit=20&after=<slug>` returns `{ "paths": [{ "id", "slug", "title", "revision" }], "nextCursor": string|null }`. `limit` is 1–50. Results are sorted by stable slug.
- `GET /learning-paths/{slug}` returns `{ id, slug, title, description, revision, stages: [{ id, position, title, description, chapters: [{ id, position, title, description, lessons: [{ id, placementId, slug, position, revision, title, summary }] }] }] }`. Each level has deterministic position ordering. The pinned Lesson revision is included; the response contains no learner-specific station status.
- `GET /lessons/{slug}` returns `{ id, slug, revision, title, summary, objectives: [{ position, kind, text }], sections: [{ id, position, title, items: [{ id, position, content: { id, key, revision, kind, displayTextJa, displayTextVi, payload, media: [{ id, revision, kind, role, mimeType, altTextVi, transcriptVi }] } }] }] }`. `payload` varies by canonical kind. Media storage keys and private rights evidence are never returned.
- `GET /skills/{type}/items?limit=20&after=<stable-key>` returns `{ "items": [{ "id", "key", "revision", "kind", "displayTextJa", "displayTextVi" }], "nextCursor": string|null }`. Current `type` values are `kana`, `vocabulary`, `grammar`, `kanji`, `example`, `dialogue`. This is a content-kind filter; listening/reading/writing/speaking are separate language-skill tags, while flashcards/quizzes are practice/assessment modes, not kinds.

Both listing routes enforce `limit` 1–50 and a cursor length ≤200; invalid filters return 400 with `invalid_content_query`. Unpublished, withdrawn, rights-invalid and nonexistent detail resources return 404 with `content_not_found`. A Path or Lesson with an invalid required pinned dependency is unavailable as a whole, never silently partial. Database read failures return a generic 503 `content_unavailable`, without SQL details. There is no unrestricted historical-revision public route. Public reads resolve only sealed revisions and live rights status in a repeatable-read transaction. Publication/withdrawal endpoints and a media delivery URL are **not** implemented in JPN-020.

Until detail pagination is designed, the backend refuses a Path larger than 100 Stages, 100 Chapters or 1,000 placements and a Lesson larger than 100 Sections, 1,000 Items, 1,000 Objectives or 5,000 media references with the generic 503 response. JPN-022 must reject such a candidate before publication; this is a protective API bound, not an approved curriculum size.

**Idempotency:** lesson completion uniquely keyed by actor/lesson; repeated calls must not double count. Import keyed by `source + externalId + version` or an explicitly documented stable key. Do not trust client-provided grade, quota date or user ID.

**Tour:** `status = not_started | in_progress | completed | skipped`; `tourVersion` and `lastStep` allow future updates. Guest persistence best effort until retention policy approved.

**Open:** session cookie/domain topology, password reset/verification, exact guest quota, merge semantics, import transport (CLI vs internal endpoint), API response envelope.
