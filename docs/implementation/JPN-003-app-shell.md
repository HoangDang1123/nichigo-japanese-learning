# JPN-003 — Responsive Application Shell

**Trạng thái (2026-11-04):** Shared shell và sidebar refinement ở commit `e2c8c08` đã có trong `origin/main` tại `c1b254c` qua PR #13. Source bên dưới được đối chiếu trực tiếp với mốc main này. Owner đã duyệt **hình thức sidebar**; merge và review này chưa phải nghiệm thu toàn bộ JPN-003 hoặc bằng chứng release.
**Phạm vi:** Frontend navigation, layout desktop/mobile, placeholder routes, reusable UI states.  
**Không bao gồm:** Auth, bài học thực tế, API progress, user profile.

## 1. Kiến trúc hiển thị

Root `nichigo_frontend/src/app/layout.tsx` bọc ứng dụng bằng `ThemeProvider` của `next-themes`, `attribute="data-theme"`, `defaultTheme="system"`, `enableSystem`, rồi `ReduxProvider` cho auth state hiện có. `<html lang="vi" suppressHydrationWarning>` giúp xử lý class/attribute theme thay đổi lúc hydration.

`AppShell` tại `src/components/layout/app-shell.tsx` là client component vì dùng `usePathname()` xác định navigation active và chứa mobile menu tương tác.

```text
RootLayout (ThemeProvider → ReduxProvider)
  └── Page
       └── AppShell
            ├── Skip-to-content link
            ├── DesktopSidebar (brand, collapsible navigation, bottom account destinations)
            └── Workspace
                 ├── AppHeader (page title, MobileNav, ThemeSwitcher, AccountMenu)
                 └── Main #main-content
                      └── Route content
```

**Lưu ý:** AppShell hiện được gọi bởi các page; chưa phải App Router route-group layout chia sẻ state tự động.

## 2. Routes & navigation

`src/components/layout/navigation.ts` là danh sách link tập trung và `isActivePath(pathname, href)` phân biệt `/` với subroutes.

The shared navigation on `origin/main` includes the eight approved labels. Existing destinations remain active: Trang chủ `/`, Lộ trình học `/learn`, Kỹ năng `/skills`, Tiến độ `/progress`. Proposed destinations without routes are shown as unavailable items and are not links: Khóa học `/courses`, Mini game `/games`, Hồ sơ `/profile`, Cài đặt `/settings`. These mappings reserve suggested paths only; no pages, APIs, or profile/settings behavior are implied.

The shared client shell is composed from `AppShell`, `DesktopSidebar`, `AppHeader`, and `MobileNav`. Desktop collapse preference is stored under `nichigo-sidebar-collapsed` in browser local storage and restored after mount. `AppShell` accepts `hideSidebar` to omit the desktop sidebar and use one content column while retaining the shared header, including its mobile drawer. Existing routes keep the sidebar by default; this layout option does not implement a focused lesson screen.

| URL | Trạng thái |
| --- | --- |
| `/` | Tại mốc main `c1b254c`: homepage có hero editorial. Sau mốc này, JPN-041 thay nội dung Home bằng Study Desk presentation; xem [JPN-041-home-study-desk.md](JPN-041-home-study-desk.md). AppShell giữ nguyên. |
| `/learn` | Placeholder / EmptyState |
| `/skills` | Placeholder / EmptyState |
| `/progress` | Placeholder / EmptyState |
| `/dev/ui` | Showcase component, chỉ development |
| `/dev/states` | Showcase Empty/Loading/Error, chỉ development |

`/dev/ui` và `/dev/states` dùng `dynamic = "force-dynamic"` và `notFound()` khi `NODE_ENV === "production"`. Đừng hiểu sự tồn tại của URL placeholder là backend feature đã hoàn tất.

## 3. Layout CSS đã chốt

`src/components/layout/app-shell.module.css`:

- Outer shell trên `origin/main`: CSS grid `16rem minmax(0, 1fr)` khi mở rộng, `5rem minmax(0, 1fr)` khi thu gọn; gap + padding `var(--space-4)`.
- Desktop sidebar: sticky, bordered, rounded surface; `PanelLeftClose`/`PanelLeftOpen` có nhãn truy cập. Logo, toggle và icon dùng cùng trục căn giữa ở trạng thái gọn. Sáu mục chính nằm phía trên; Hồ sơ/Cài đặt ở nhóm dưới cùng. Sidebar cuộn theo chiều dọc khi màn hình thấp.
- Toggle và nav items ở trạng thái gọn có kích thước `2.75rem` (44px). Nhóm dưới dùng `margin-top: auto`; footer editorial nằm sau nhóm này khi mở rộng. Nav dùng `aria-current`, outline theo focus token và native `title` tooltip khi thu gọn. ArrowUp/ArrowDown/Home/End chuyển focus giữa các link có sẵn; mục chưa có route không phải link.
- Header: panel riêng, có border 1px/radius; ThemeSwitcher và AccountMenu bên phải, tái sử dụng auth behavior đã có trên `main`.
- **Main full width của phần workspace còn lại**: `width: 100%`, `padding: 0`, `background: transparent`, **không có border/radius bọc ngoài**.
- Các khối trên homepage (`home.module.css`) tự quản lý border/radius/padding. Cách này tạo “floating panels” thay vì một panel lớn lồng các panel khác.
- CSS dùng semantic vars từ `src/styles/tokens.css` và `src/styles/themes.css`; thay palette tại theme tokens, không hardcode màu từng component.

### Breakpoints

- Dưới **1024px**: ẩn sidebar desktop, hiện mobile brand + menu.
- Dưới **481px**: thu padding/gaps shell và header.
- Homepage: hero chuyển từ 2 cột sang 1 tại `620px`, entry links thành 1 cột tại `620px`.

Đây là breakpoint có trong CSS tại thời điểm viết, không phải cam kết không bao giờ thay đổi.

## 4. Mobile navigation và accessibility

`src/components/layout/mobile-nav.tsx` sử dụng native `<dialog>` với `showModal()` / `close()`:

1. Nhấn nút menu để mở dialog.
2. Dialog native cung cấp modal focus behavior; code chuyển focus tới link đầu.
3. Nút đóng, click backdrop, Escape đều đóng dialog; callback `onClose` đưa focus về nút mở.
4. Click link đóng menu và điều hướng.
5. Active link sử dụng `aria-current="page"`; vùng navigation có `aria-label`. Có skip link đến `#main-content`.

Nếu thay dialog bằng drawer thư viện, phải bảo toàn Escape/focus handling, keyboard navigation và focus restoration; test trên mobile và với keyboard/screen reader.

## 5. UI states

Các component nằm tại `src/components/states/`:

- `EmptyState`: title + description và action tùy chọn.
- `LoadingState`: trạng thái `role="status"`, `aria-live="polite"`, spinner có reduced-motion fallback.
- `ErrorState`: `role="alert"`, nút thử lại chỉ render khi có `onRetry`.

Các thành phần này chỉ là **UI presentation states**; không hàm ý đã có API error loading pipeline.

## 6. Visual và product constraints

Homepage hiện có hướng Japanese editorial: nhãn tiếng Nhật hỗ trợ, minh họa hoa anh đào/cổng torii/mặt trời/đồi **vẽ bằng CSS** trong hero, entry links có viền mảnh. Đây chưa phải Study Desk cá nhân hóa. Chưa có anime illustration asset thực tế trong phần hero được kiểm tra.

Không tạo số liệu ảo (XP, streak, tỉ lệ hoàn thành); progress là placeholder. Light/Dark/System tồn tại qua ThemeProvider. Shared shell đã refinement có trong `origin/main` tại `c1b254c`; các màn hình học và tiến độ vẫn cần feature riêng.

## 7. Cách kiểm tra

```bash
cd nichigo_frontend
npm ci
npm run lint
npm run type-check
npm run build
npm run dev
```

Checklist thủ công: xem `/`, `/learn`, `/skills`, `/progress`; kiểm tra active item, viewport 1440/768/375/320px, dark/light/system, keyboard Tab/Escape, mobile menu focus, không có horizontal overflow. Sau `npm run build && npm run start`, hai route `/dev/...` cần 404. Branch `003` đã chạy `npm run lint`, `npm run type-check`, `npm run test` (hai test files đều pass) và `git diff --check` trước khi push. Owner đã duyệt hình thức sidebar; chưa có bằng chứng browser QA đầy đủ cho mọi viewport, route, keyboard và theme trên branch này.

Các lệnh trên là hướng dẫn verification. Kết quả trước merge là bằng chứng lịch sử; lượt sync docs này chỉ kiểm tra Git ancestry, source main và diff tài liệu, không chạy lại frontend tests hoặc browser QA.

## 8. Về sau

- JPN-030: lộ trình học và skill directory thực tế.
- JPN-034: spotlight onboarding.
- JPN-041: progress/dashboard lấy dữ liệu thực tế.

## 9. Cập nhật UI JPN-010B

Homepage hiện tại được làm lại tại `nichigo_frontend/src/app/page.tsx` và `home.module.css`: hero editorial dùng headline “Tiếng Nhật, từng bước một.”, CTA lộ trình/kỹ năng, artwork CSS gợi hoa anh đào/cổng torii/mặt trời/đồi, entry points là hai hàng liên kết có đường viền đầu thay cho các card riêng biệt, và lời nhắn cuối không có khung card. Breakpoint hiện tại chuyển hero về một cột tại 620px, thu hẹp phân cấp chữ và xếp entry points một cột; khoảng trắng và kích thước scene cũng giảm trên mobile. Không có số liệu học tập hoặc nội dung bài học mới.

Sidebar AppShell dùng BrandLogo transparent variants; mobile header dùng icon brand gọn. Header đặt ThemeSwitcher dạng icon vuông và AccountMenu dạng welcome pill riêng biệt; account pill thu gọn ở viewport hẹp. Login/register không dùng AppShell; chi tiết auth UI/CSRF ở JPN-010B.

Các lượt JPN-010B trước đây đã ghi lint, type-check, test và build pass trong note auth. Điều đó không thay thế browser QA của toàn bộ JPN-003 đã merge; dùng checklist ở trên khi review đầy đủ.
