# Nichigo — Implementation Notes

Tài liệu này mô tả **code đã triển khai** trong repository, khác với PRD/backlog (yêu cầu và kế hoạch).

## Danh mục

| Ticket | Nội dung | Tài liệu |
| --- | --- | --- |
| JPN-001 | Bootstrap monorepo, runtime, CI | [JPN-001-bootstrap.md](JPN-001-bootstrap.md) |
| JPN-002 | PostgreSQL và Flyway baseline | [JPN-002-database-baseline.md](JPN-002-database-baseline.md) |
| JPN-003 | App Shell, responsive navigation, UI states | [JPN-003-app-shell.md](JPN-003-app-shell.md) |
| JPN-010A | Backend authentication, session, CSRF and V2/V3 migrations | [JPN-010-auth-backend.md](JPN-010-auth-backend.md) |
| JPN-010B | Frontend authentication, session and CSRF integration | [JPN-010-frontend-auth.md](JPN-010-frontend-auth.md) |
| JPN-011 | Guest identity, active-use retention, Lesson unlock/access, and Skills bookmarks (backend merged via PR #35; Flyway V9; frontend integration pending; not deployed or released) | [JPN-011-guest-foundation-backend.md](JPN-011-guest-foundation-backend.md), [technical contract](JPN-011-guest-foundation-contract.md) |
| JPN-UI-003 | Shared skeleton primitive, Home auth-loading composition and future data-loader layouts (merged; release not evidenced) | [JPN-UI-003-skeleton-system.md](JPN-UI-003-skeleton-system.md) |
| JPN-ARCH-004 | Frontend component structure and test CI (maintenance): Skills areas split into overview/kana/category beside vocabulary/grammar, Home styles moved next to Home, Kana type cycle removed, `npm test` and the agent-skill drift check added to CI; behavior-preserving; merged via PR #38 (merge commit `86e3421`); not released | [JPN-ARCH-004-frontend-component-structure.md](JPN-ARCH-004-frontend-component-structure.md) |
| JPN-020 | Learning content schema, immutable revisions and published-only read API (merged; ADR-015 approved later) | [JPN-020-learning-content.md](JPN-020-learning-content.md) |
| JPN-021 | CSV/JSON validation, PostgreSQL reference checks and offline dry-run CLI (merged via PR #24; release not evidenced) | [JPN-021-content-validation.md](JPN-021-content-validation.md) |
| JPN-022 | Secured relational import, explicit reviews and exact-pin publication (merged via PR #27; release not evidenced) | [JPN-022-content-import-publishing.md](JPN-022-content-import-publishing.md), [operator runbook](JPN-022-operator-runbook.md) |
| JPN-023 | Original three-Lesson draft and isolated import/publication verification (merged via PR #28); human Rights/language review, curriculum acceptance and production publication pending | [JPN-023-first-learning-content.md](JPN-023-first-learning-content.md) |
| JPN-ARCH-002 | Reviewed Rights evidence, set-based Path eligibility and relational-vs-JSONB draft decision (merged via PR #25; ADR-015 approved later) | [JPN-ARCH-002-content-architecture.md](JPN-ARCH-002-content-architecture.md) |
| JPN-030 | Learning Path railway frontend preview; content and progress integration pending | [JPN-030-learning-path.md](JPN-030-learning-path.md) |
| JPN-035 | Skills overview (mock/demo data) and Kana reference chart, drawer and vendored AnimCJK stroke guidance; frontend source merged via PR #30; Kana UI v1 visually approved only; **AnimCJK licensing review PENDING (release blocker)**; published-content integration, audio, real-device and accessibility checks pending; not released | [JPN-035-skills-kana-reference.md](JPN-035-skills-kana-reference.md) |
| JPN-036 | Vocabulary skill UI prototype (frontend only): topic study, separate Quick Check, Explore and Saved on demo data with in-memory state; frontend source merged via PR #31; Product Owner visually approved for UI prototype v1 only; published-content/bookmark integration and nine example readings await review; not released | [JPN-036-vocabulary-ui-foundation.md](JPN-036-vocabulary-ui-foundation.md) |
| JPN-037 | Grammar skill UI prototype (frontend only): Overview with filter chips, search and example cards, and a Detail notebook, on demo data with no persistence; frontend source merged via PR #34 (`20b050e`), not released; Product Owner visually approved for UI prototype v1 only; demo content and example readings await independent content review | [JPN-037-grammar-ui-foundation.md](JPN-037-grammar-ui-foundation.md) |
| JPN-033 backend/API foundation | Eight-skill Directory with availability states; Foundation content search/detail and flashcard presentation over eligible canonical Items (backend merged via PR #36; no Flashcard review persistence; frontend Slice 1 (typed client and Directory integration) merged via PR #41; Slice 2 (Kanji Overview/Detail) implemented on a local branch, not pushed or merged; Flashcards and the rest of JPN-033 pending; not released) | [JPN-033-skills-content-api.md](JPN-033-skills-content-api.md) |
| JPN-041 | Home Study Desk frontend presentation; progress integration pending | [JPN-041-home-study-desk.md](JPN-041-home-study-desk.md) |

## Workflow và mức độ xác nhận

Follow root [`AGENTS.md`](../../AGENTS.md) and the [feature roadmap](../05-BACKLOG.md): deliver one approved user-facing feature through the technical layers it needs, keeping historical JPN IDs as traceability.

1. **Trước code:** đọc feature/ticket trong `docs/05-BACKLOG.md`, PRD, decisions, architecture, design system và API contract liên quan; kiểm tra source và nested `AGENTS.md`.
2. **Sau code:** viết hoặc cập nhật `docs/implementation/JPN-<id>-<name>.md`, dựa trên **source thực tế**, không mô tả chức năng chưa làm.
3. Mỗi ghi chú gồm: mục tiêu/phạm vi, kiến trúc & các file chính, luồng xử lý, API hoặc routes, môi trường/cách chạy, testing, security, hạn chế và bước sau.
4. Khi sửa code có tác động đến kiến trúc/hành vi, cập nhật tài liệu tương ứng **trong cùng PR**.
5. Không đưa mật khẩu, access token, connection string chứa credentials, dữ liệu nhạy cảm vào docs. Phân biệt ví dụ và giá trị production.
6. Tách **source implemented**, **tested** (nêu lệnh và kết quả), **owner/visual reviewed** (nêu phạm vi), **merged** (xác nhận Git), **released** (xác nhận deployment/release gate). Không suy ra mức sau từ mức trước.
7. Follow the [root Git Branch Naming Convention](../../AGENTS.md#git-branch-naming-convention) for future branches. Feature notes must identify related FE/BE branches, their shared ticket and API contract, how they integrate, and the checks run against the integrated feature before completion. Keep historical branch names unchanged; branch operations require explicit owner authorization.
8. Use the [root Git Commit Message Convention](../../AGENTS.md#git-commit-message-convention) for new commits. Keep one logical ticket-scoped change per commit; do not rewrite historical commits.
9. Follow the [assigned-clone Git workflow](../../AGENTS.md#assigned-clone-git-workflow): Anti works only in `H:\Code\Projects\nichigo-japanese-learning` (Frontend); Codex works only in `H:\Code\Projects\nichigo-japanese-learning-codex` (Backend, Database and Content). Both are clones of the same monorepo and GitHub repository. Inspect status before switching tickets, preserve unfinished work, and keep branch operations, commits, pushes, PRs and merges subject to root `AGENTS.md` and owner authorization.

**Source baseline, 2026-11-18:** `origin/main` at `86e3421` (PR #38 merge commit) includes PR #29 (JPN-DOC-001), #30 (JPN-035 frontend), #31 (JPN-036 frontend), #34 (JPN-037 frontend), #35 (JPN-011 backend), #36 (JPN-033 backend foundation), #37 (JPN-DOC-001 shared agent skills, squashed as `9aaadfb`) and #38 (JPN-ARCH-004), alongside JPN-020–JPN-023 and JPN-ARCH-002. Flyway migrations in source are V1–V9. JPN-023's original draft was technically verified in an isolated database; qualified human review, curriculum acceptance and production publication remain pending. Guest identity, daily Lesson unlock and Skills bookmark quotas exist in the **backend only**; Guest frontend integration, Skills UI integration with the Skills Content API, official Assessment and learner progress remain unimplemented. Test commands and results in individual notes are historical evidence recorded on their branches, not checks rerun for this documentation alignment, and no CI result is recorded here. No production release is evidenced.

*Historical baseline (superseded):* the 2026-11-14 baseline at `81fad8e` predated PR #34–#38.
