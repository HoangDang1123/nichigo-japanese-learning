# JPN-003 — Responsive Application Shell

**Trạng thái:** Đã có trên `main` và được ghi tài liệu hồi tố theo source.  
**Phạm vi:** Frontend navigation, layout desktop/mobile, placeholder routes, reusable UI states.  
**Không bao gồm:** Auth, bài học thực tế, API progress, user profile.

## 1. Kiến trúc hiển thị

Root `nichigo_frontend/src/app/layout.tsx` bọc ứng dụng bằng `ThemeProvider` của `next-themes`, `attribute="data-theme"`, `defaultTheme="system"`, `enableSystem`. `<html lang="vi" suppressHydrationWarning>` giúp xử lý class/attribute theme thay đổi lúc hydration.

`AppShell` tại `src/components/layout/app-shell.tsx` là client component vì dùng `usePathname()` xác định navigation active và chứa mobile menu tương tác.

```text
RootLayout (ThemeProvider)
  └── Page
       └── AppShell
            ├── Skip-to-content link
            ├── Desktop sidebar (brand + navigation)
            └── Workspace
                 ├── Header (page title, mobile menu, ThemeSwitcher)
                 └── Main #main-content
                      └── Route content
```

**Lưu ý:** AppShell hiện được gọi bởi các page; chưa phải App Router route-group layout chia sẻ state tự động.

## 2. Routes & navigation

`src/components/layout/navigation.ts` là danh sách link tập trung và `isActivePath(pathname, href)` phân biệt `/` với subroutes.

| URL | Trạng thái |
| --- | --- |
| `/` | Homepage có intro, entry card đến `/learn` và `/skills`, lời nhắn |
| `/learn` | Placeholder / EmptyState |
| `/skills` | Placeholder / EmptyState |
| `/progress` | Placeholder / EmptyState |
| `/dev/ui` | Showcase component, chỉ development |
| `/dev/states` | Showcase Empty/Loading/Error, chỉ development |

`/dev/ui` và `/dev/states` dùng `dynamic = "force-dynamic"` và `notFound()` khi `NODE_ENV === "production"`. Đừng hiểu sự tồn tại của URL placeholder là backend feature đã hoàn tất.

## 3. Layout CSS đã chốt

`src/components/layout/app-shell.module.css`:

- Outer shell: CSS grid `15.75rem minmax(0, 1fr)`, gap + padding `var(--space-4)`.
- Desktop sidebar: sticky, bordered, rounded surface; top được căn theo outer margin.
- Header: panel riêng, có border 1px/radius; ThemeSwitcher bên phải.
- **Main full width của phần workspace còn lại**: `width: 100%`, `padding: 0`, `background: transparent`, **không có border/radius bọc ngoài**.
- Các khối trên homepage (`home.module.css`) tự quản lý border/radius/padding. Cách này tạo “floating panels” thay vì một panel lớn lồng các panel khác.
- CSS dùng semantic vars từ `src/styles/tokens.css` và `src/styles/themes.css`; thay palette tại theme tokens, không hardcode màu từng component.

### Breakpoints

- Dưới **1024px**: ẩn sidebar desktop, hiện mobile brand + menu.
- Dưới **481px**: thu padding/gaps shell và header.
- Homepage: hero chuyển từ 2 cột sang 1 tại `720px`, entry cards thành 1 cột tại `520px`.

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

Homepage được thiết kế theo hướng Japanese editorial: nhãn tiếng Nhật hỗ trợ, minh họa mặt trời/đồi/cửa sổ **vẽ bằng CSS** trong hero, entry cards có viền mảnh. Chưa có anime illustration asset thực tế trong phần hero được kiểm tra.

Không tạo số liệu ảo (XP, streak, tỉ lệ hoàn thành); progress là placeholder. Light/Dark/System tồn tại qua ThemeProvider. Các thay đổi thử nghiệm theme trên branch riêng không được coi là đã vào `main` nếu chưa merge.

## 7. Cách kiểm tra

```bash
cd nichigo_frontend
npm ci
npm run lint
npm run type-check
npm run build
npm run dev
```

Checklist thủ công: xem `/`, `/learn`, `/skills`, `/progress`; kiểm tra active item, viewport 1440/768/375/320px, dark/light/system, keyboard Tab/Escape, mobile menu focus, không có horizontal overflow. Sau `npm run build && npm run start`, hai route `/dev/...` cần 404.

**Chưa thực hiện lại lint/build hoặc kiểm tra browser trong lượt soạn tài liệu**; các lệnh trên là hướng dẫn verification, không phải kết quả PASS đã được xác nhận.

## 8. Về sau

- JPN-010B: login/register UI (không thuộc AppShell).
- JPN-030: lộ trình học và skill directory thực tế.
- JPN-034: spotlight onboarding.
- JPN-041: progress/dashboard lấy dữ liệu thực tế.
