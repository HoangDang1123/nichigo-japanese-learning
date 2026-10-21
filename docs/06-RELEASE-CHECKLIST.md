# MVP Release Gate / QA Checklist

## Product
- [ ] Beginner path and free skill browsing both work.
- [ ] Spotlight tour targets correct elements, dim overlay + arrow, Back/Next/Skip/Finish, progress, replay.
- [ ] Tour usable on mobile, keyboard, reduced-motion; no stuck overlay.
- [ ] First reviewed lesson works end-to-end with quiz and feedback.
- [ ] Guest quota behavior and exact configured limit approved by owner.
- [ ] Register/login/logout, return and resume progress; guest merge policy resolved.
- [ ] Published content visible, drafts hidden; language review and media rights recorded.

## Security/data
- [ ] Password hash and auth/session controls reviewed; login rate limiting.
- [ ] CORS/cookies/CSRF verified across Vercel and Render origins.
- [ ] Secrets not in Git or client bundle.
- [ ] Database migration from clean state and repeat migration verified.
- [ ] Concurrent guest completions do not bypass quota.
- [ ] Import dry-run, idempotency, publication gate, provenance tested.
- [ ] Database export performed and restore tested on separate database.

## Hosting and operations
- [ ] Vercel Free FE + Render Free BE + Neon Free DB confirmed.
- [ ] Render service cold-start loading/timeout UX tested.
- [ ] Neon idle resume and connection pool limits tested.
- [ ] Current free-tier limits and expiration/retention policy rechecked before launch.
- [ ] Health check, logging, incident response and migration recovery documented.
- [ ] Paid hosting or public beta approval explicitly obtained from owner if needed.

## E2E scenario
Guest visits → skips/completes tour → begins beginner lesson → submits quiz → completes lesson → quota increments once → registers/logs in → progress persists (if merge approved) → revisits skill view → sees consistent status.

## Sign-off
Engineering QA: ______  PM: ______  Product Owner: ______  Date: ______
