# Nichigo — Implementation Notes

Tài liệu này mô tả **code đã triển khai** trong repository, khác với PRD/backlog (yêu cầu và kế hoạch).

## Danh mục

| Ticket | Nội dung | Tài liệu |
| --- | --- | --- |
| JPN-001 | Bootstrap monorepo, runtime, CI | [JPN-001-bootstrap.md](JPN-001-bootstrap.md) |
| JPN-002 | PostgreSQL và Flyway baseline | [JPN-002-database-baseline.md](JPN-002-database-baseline.md) |
| JPN-003 | App Shell, responsive navigation, UI states | [JPN-003-app-shell.md](JPN-003-app-shell.md) |

## Quy ước từ JPN-010 trở đi

1. **Trước code:** đọc ticket trong `docs/05-BACKLOG.md`, PRD, design system và API contract liên quan.
2. **Sau code:** viết hoặc cập nhật `docs/implementation/JPN-<id>-<name>.md`, dựa trên **source thực tế**, không mô tả chức năng chưa làm.
3. Mỗi ghi chú gồm: mục tiêu/phạm vi, kiến trúc & các file chính, luồng xử lý, API hoặc routes, môi trường/cách chạy, testing, security, hạn chế và bước sau.
4. Khi sửa code có tác động đến kiến trúc/hành vi, cập nhật tài liệu tương ứng **trong cùng PR**.
5. Không đưa mật khẩu, access token, connection string chứa credentials, dữ liệu nhạy cảm vào docs. Phân biệt ví dụ và giá trị production.
6. Tách ba mức độ: **xác nhận từ source**, **đã chạy test** (có bằng chứng), **cần kiểm thử thủ công**.

**Nguồn đối chiếu:** nhánh `main` tại thời điểm soạn tài liệu (26/10/2026). Những ticket sau này có thể làm thay đổi một số chi tiết; khi đó hãy cập nhật tài liệu ngay trên PR thay đổi.
