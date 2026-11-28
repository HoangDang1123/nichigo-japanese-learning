# MVP Release Gate / QA Checklist

- [ ] JPN-033 stroke delivery: approve and configure a private persistent `STROKE_STORAGE_ROOT` mount outside public/static paths; verify restart, multi-instance access, backup and permissions.
- [ ] Verify root and ancestor ACLs deny write/delete/rename to untrusted principals; verify atomic hard links and no shared writable mount. The adapter assumes this trust boundary because Java path checks do not eliminate parent-swap TOCTOU.
- [ ] Approve provenance/licensing and human review for each Kanji stroke JSON, including direction arrows; do not import AnimCJK production assets while Rights are pending.
- [ ] Verify stroke 200/404/503, no-store, no key exposure and revocation in the deployment environment; FE integration requires separate review.

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
- [ ] V4 content migration applied to the target PostgreSQL release database; published-only API, rights revocation, and migration rollback/restore plan checked before serving content.
- [ ] V5 nullable authoring-key migration checked against a populated backup; existing content identities, order and published pointers remain intact.
- [ ] Published media uses private objects or short-lived authorized URLs; revocation is tested against the actual delivery path, not only the metadata API.
- [ ] Concurrent guest completions do not bypass quota.
- [ ] Import dry-run, idempotency, publication gate, provenance tested.
- [ ] Database export performed and restore tested on separate database.

## Legal / third-party licensing
- [ ] **BLOCKER — AnimCJK (LGPL-3.0-or-later per file headers) licensing review before any commercial release.** Stroke-guidance assets derived from AnimCJK (`nichigo_frontend/src/data/kana-strokes/`) must be reviewed by the Product Owner/legal for LGPL obligations on bundled data (licence/source notices, replaceability) and for the **unresolved provenance of the kana outlines** (AnimCJK says shapes were partly derived from Arphic KaitiM fonts, which fall under the Arphic Public License; it is unconfirmed whether the kana outlines can be offered under the LGPL). Status: **PENDING** — see [JPN-035-skills-kana-reference.md](implementation/JPN-035-skills-kana-reference.md). Importing the data (now all 148 chart characters) does not satisfy this item. Any later Kanji data (Arphic Public License) needs its own review. **Licence reading (Orchestrator, 2026-11-28; not legal advice):** upstream `COPYING.txt` lets Kana stroke SVGs be used under LGPL-3.0-or-later, which permits commercial use. Remaining obligations before release: an in-app notice that NichiGo uses AnimCJK data under the LGPL, with copies of the LGPL and the GNU GPL (the GPL text is not in the repo yet); keep the modification statement and keep the converted data and source publicly available (the repository is public). Kanji SVGs from AnimCJK fall under the Arphic Public License instead and are not covered by this reading.

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
