# Technical Architecture & Data Model

## System topology
`Browser → Vercel / Next.js → HTTPS → Render Free / Spring Boot → TLS PostgreSQL → Neon Free`

- Next.js TypeScript frontend. Java Spring Boot modular monolith REST API.
- Neon managed PostgreSQL; Flyway migration history in repository.
- Backend modules: `identity`, `content`, `learning`, `practice`, `quota`, `contentimport`, `admin`, `common`.
- Prefer standard PostgreSQL, env-based config, and no vendor-specific business logic for portability.

## Suggested repository
```
apps/web/                 # Next.js frontend
apps/api/                 # Spring Boot backend
content/schemas/          # CSV/JSON validation schemas
content/seeds/            # Reviewed example datasets
infra/                    # deployment docs/config (no secrets)
docs/                     # project documents
```

## Data model (conceptual, adjust with migrations)
- `users(id,email,password_hash,status,created_at)`; `auth_sessions(id,user_id,expires_at,revoked_at)`.
- `guest_sessions(id,created_at,last_seen_at)`; `guest_claims(guest_id,user_id,claimed_at)`.
- `learning_paths(id,slug,title,visibility)`; `path_lessons(path_id,lesson_id,sort_order)`; `levels(id,code)`.
- `lessons(id,slug,title,status,version,level_id)`; `lesson_items(id,lesson_id,item_type,content_id,sort_order)`.
- `vocabulary`, `grammar_points`, `kana`, `kanji`, `examples`, `media_assets`, `content_provenance`.
- `questions(id,lesson_id,kind,...)`; `answer_options`; `exercise_attempts`; `attempt_answers`.
- `lesson_progress(id,actor_type,actor_id,lesson_id,status,completed_at)`; `item_progress`; `review_schedule` (optional advanced).
- `guest_daily_usage(guest_id,local_date,quota_type,used_count)` with unique composite key.
- `import_batches(id,source,status,created_at)`; `import_records`; `audit_logs`.

Use canonical content references and a join table for lesson membership. Include uniqueness constraints for progress and import keys; enforce quotas atomically with transactions and locks/conditional upsert. Store timestamps in UTC; compute guest quota date in Asia/Ho_Chi_Minh.

## Auth and security decisions to implement carefully
- Password hashing Argon2id or bcrypt, never plain text; rate limit login/register.
- Secure, HttpOnly cookies for sessions; cross-site cookie deployment needs explicit `SameSite=None; Secure`, CORS allowlist + credentials and CSRF protection, or use a same-site proxy/custom domain arrangement.
- Never assume Vercel preview URLs are safe CORS origins by wildcard; whitelist approved origins.
- Server-side authorization on every protected endpoint and content import action.
- Secrets in Render/Vercel/Neon environment management, not Git or `NEXT_PUBLIC_*`.
- Consider database connection pooling and server idle connections, short timeouts and bounded retry for transient failures.

## Free tier caveats (must be in deployment runbook)
- Render Free services may spin down after inactivity; first request may be slow and free capacity is limited. Validate current policy before deployment.
- Neon Free has compute/storage/usage limits and compute auto-suspend behavior; check current plan and connection caps.
- Neither free tier is a production availability/backup guarantee. Keep export/restore procedures and test a restore before real beta.
- **Explicit exclusion:** Render Free PostgreSQL is not the long-term database; free DB lifespan and backup limitations are unsuitable for durable progress data.
- No paid upgrade without owner approval.

## Deploy pipeline
1. Git commit → tests/lint/build.
2. Run migrations using controlled release step; fail safely on errors.
3. Deploy API to Render, configure `DATABASE_URL`, session secrets, frontend origin and health check.
4. Deploy Next.js to Vercel, configure API base URL and appropriate server-side env.
5. Smoke test register, login, lesson, quiz, progress, quota, cold start.
6. Export and verify backup process; document incident rollback.

## Observability
Structured error logs (no passwords/tokens), `/actuator/health` with safe public surface, request correlation ID, deployment version, basic metrics. Avoid logging sensitive answer payloads unnecessarily.
