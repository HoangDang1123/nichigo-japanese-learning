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
| JPN-UI-003 | Shared skeleton primitive, Home auth-loading composition and future data-loader layouts (merged; release not evidenced) | [JPN-UI-003-skeleton-system.md](JPN-UI-003-skeleton-system.md) |
| JPN-020 | Learning content schema, immutable revisions and published-only read API (merged; ADR-015 approved later) | [JPN-020-learning-content.md](JPN-020-learning-content.md) |
| JPN-021 | CSV/JSON validation, PostgreSQL reference checks and offline dry-run CLI (merged via PR #24; release not evidenced) | [JPN-021-content-validation.md](JPN-021-content-validation.md) |
| JPN-022 | Secured relational import, explicit reviews and exact-pin publication (merged via PR #27; release not evidenced) | [JPN-022-content-import-publishing.md](JPN-022-content-import-publishing.md), [operator runbook](JPN-022-operator-runbook.md) |
| JPN-023 | Original three-Lesson draft and isolated import/publication verification (merged via PR #28); human Rights/language review, curriculum acceptance and production publication pending | [JPN-023-first-learning-content.md](JPN-023-first-learning-content.md) |
| JPN-ARCH-002 | Reviewed Rights evidence, set-based Path eligibility and relational-vs-JSONB draft decision (merged via PR #25; ADR-015 approved later) | [JPN-ARCH-002-content-architecture.md](JPN-ARCH-002-content-architecture.md) |
| JPN-030 | Learning Path railway frontend preview; content and progress integration pending | [JPN-030-learning-path.md](JPN-030-learning-path.md) |
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

**Source baseline, 2026-11-09:** `origin/main` at `a0224c1` includes JPN-020–JPN-023, JPN-ARCH-002 and ADR-015's approved relational baseline. JPN-023's original draft was technically verified in an isolated database; qualified human review, curriculum acceptance and production publication remain pending. Test commands and results in individual notes are historical evidence, not checks rerun for this documentation alignment. No production release is evidenced.
