# JPN-001 — Project Bootstrap

**Trạng thái:** Code bootstrap đã có trên `main`; tài liệu viết hồi tố theo source.  
**Phạm vi:** Monorepo, skeleton frontend/backend, scripts, pipeline CI.  
**Không bao gồm:** Auth, bài học thực tế, deployment.

## 1. Cấu trúc repository

```text
nichigo-japanese-learning/
├── nichigo_frontend/          # Next.js App Router
├── nichigo_backend/           # Spring Boot, Maven Wrapper
├── docs/                      # PRD, backlog, kiến trúc, design system
├── contracts/                 # API / import contracts (đặc tả, không đồng nghĩa đã code)
├── antigravity/               # Agent guide
└── .github/workflows/ci.yml   # GitHub Actions
```

**Frontend:** Next.js `16.2.12`, React `19.2.4`, TypeScript, ESLint, npm. Kiểm tra version và scripts tại `nichigo_frontend/package.json`. Giao diện hiện tại đã có thêm JPN-UI-001/002 và JPN-003; đó không phải toàn bộ deliverable của JPN-001.

**Backend:** Spring Boot parent `4.1.0`, Java target `21`, Maven Wrapper (`mvnw`/`mvnw.cmd`). Xem `nichigo_backend/pom.xml`. Dependencies PostgreSQL/Flyway đã được bổ sung **sau bootstrap, ở JPN-002**.

## 2. Chạy local

Yêu cầu Node.js 20/npm tương thích và JDK 21+ (target Java 21).

Frontend:

```bash
cd nichigo_frontend
npm ci
npm run dev
# http://localhost:3000
```

Backend (cần cấu hình PostgreSQL kể từ JPN-002):

```bash
cd nichigo_backend
# Linux/macOS (hoặc Git Bash)
bash ./mvnw spring-boot:run
# Windows cmd: mvnw.cmd spring-boot:run
# http://localhost:8080
```

**Lưu ý quan trọng:** `application.yml` hiện bắt buộc `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`. Spring Boot không mặc nhiên nạp file `.env`; nếu dùng IntelliJ, khai báo Environment Variables trong Run Configuration. Xem JPN-002.

Frontend commands: `npm run lint`, `npm run type-check`, `npm run build`. Backend commands: `bash ./mvnw test`, `bash ./mvnw verify`.

## 3. CI thực tế

`.github/workflows/ci.yml` được kích hoạt khi push lên `main` và khi PR nhắm đến `main`:

- **frontend:** Ubuntu, Node 20, `npm ci` → `npm run lint` → `npm run type-check` → `npm run build`.
- **backend:** Ubuntu, Temurin Java 21, PostgreSQL 17 service riêng cho test → `bash ./mvnw test --no-transfer-progress` → `bash ./mvnw verify -DskipTests --no-transfer-progress`.
- PostgreSQL và biến `DB_*` của CI là **môi trường thử nghiệm**, không phải database của developer hoặc Neon production.
- Dùng `bash ./mvnw` để tránh lỗi executable permission trên runner Linux.

CI chỉ **test/build**, chưa tự deploy. Trạng thái xanh/đỏ của một lần chạy cụ thể phải kiểm tra ở tab Actions; việc file workflow tồn tại không chứng minh mọi lần chạy đều thành công.

## 4. Cần phân biệt

- `README.md` gốc còn mô tả trạng thái bootstrap như “chưa có database/migrations”; một số nội dung đã **lỗi thời** so với hiện trạng JPN-002/003.
- `docs/implementation` ghi lại hệ thống hiện tại; không phải nguồn thay thế cho backlog.
- Branch convention hiện dùng `features/<ticket>` cho tính năng; tài liệu riêng trên `docs/implementation`.

## 5. Bổ sung sau

- Đồng bộ lại README tổng quan khi đóng PR docs.
- Bổ sung test/report chứng minh health endpoint & startup nếu cần nghiệm thu tự động chi tiết.
- Deployment Vercel/Render/Neon thuộc ticket sau, không thuộc bootstrap.
