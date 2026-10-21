# Proposed REST API Contract — draft for implementation

**Base:** `/api/v1`; JSON UTF-8; authenticated identity from secure session cookie, not request body. This is a proposal, not a deployed API. Standard success and error envelope to be decided in JPN-001.

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Email/password registration |
| POST | `/auth/login` | Public | Create session |
| POST | `/auth/logout` | Session | Revoke session |
| GET | `/auth/me` | Optional | User/guest identity and role |
| GET | `/learning-paths` | Public | Published paths |
| GET | `/learning-paths/{slug}` | Public | Ordered published lessons |
| GET | `/skills/{type}/items` | Public | Published content by skill |
| GET | `/lessons/{slug}` | Public | Published lesson and items |
| POST | `/lessons/{id}/attempts` | Guest/User | Submit exercise answers; server grading |
| POST | `/lessons/{id}/complete` | Guest/User | Idempotent completion; quota check in same transaction |
| GET | `/progress` | Guest/User | Lesson/item progress |
| GET | `/guest/quota` | Guest | Current day allowance and usage |
| GET | `/tour/status` | Guest/User | Tour state |
| PUT | `/tour/status` | Guest/User | Mark skipped/completed/in-progress |
| POST | `/internal/import/validate` | Operator | Dry-run import |
| POST | `/internal/import/batches` | Operator | Import validated content |
| POST | `/internal/import/batches/{id}/publish` | Operator | Publish reviewed content |

**Example typed error**
```json
{"error":{"code":"GUEST_QUOTA_EXCEEDED","message":"Daily lesson limit reached","requestId":"..."}}
```
HTTP: 400 invalid payload; 401 unauthenticated; 403 unauthorized; 404 unpublished/not found; 409 conflict; 422 content validation; 429 rate limited; 503 temporary upstream unavailability. Quota exhaustion could use 403 or 429; decide and document one consistently before implementation.

**Idempotency:** lesson completion uniquely keyed by actor/lesson; repeated calls must not double count. Import keyed by `source + externalId + version` or an explicitly documented stable key. Do not trust client-provided grade, quota date or user ID.

**Tour:** `status = not_started | in_progress | completed | skipped`; `tourVersion` and `lastStep` allow future updates. Guest persistence best effort until retention policy approved.

**Open:** session cookie/domain topology, password reset/verification, exact guest quota, merge semantics, import transport (CLI vs internal endpoint), API response envelope.
