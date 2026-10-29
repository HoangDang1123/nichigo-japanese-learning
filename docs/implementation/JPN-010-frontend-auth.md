# JPN-010B — Xác thực frontend

## 1. Mục tiêu và phạm vi

Tích hợp giao diện đăng ký, đăng nhập và đăng xuất với API session của JPN-010A. Frontend dùng cookie `SESSION` do backend quản lý; không tạo JWT, không đọc hay lưu session ID, không thêm OAuth, khôi phục mật khẩu, xác minh email hoặc dữ liệu tiến độ học.

Trang `/`, `/learn`, `/skills` và `/progress` vẫn truy cập công khai. `/login` và `/register` chuyển người dùng đã xác thực về trang chủ sau khi kiểm tra session.

## 2. Kiến trúc và file chính

- `nichigo_frontend/src/api/index.ts` và `src/api/auth.ts`: Axios client dùng chung và API auth theo domain, credentials, lỗi HTTP/mạng và cache CSRF trong bộ nhớ.
- `nichigo_frontend/src/store/slices/auth-slice.ts`: Redux Toolkit phân biệt guest (`/me` 401) với lỗi mạng/server (`unavailable`).
- `nichigo_frontend/src/lib/auth/auth-validation.ts`: kiểm tra email, giới hạn mật khẩu theo backend và đường dẫn `next` an toàn.
- `nichigo_frontend/src/store/` và `src/components/providers/redux-provider.tsx`: store auth typed và khôi phục session ban đầu từ `/me`.
- `nichigo_frontend/src/components/auth/auth-form.tsx` và `auth-form.module.css`: form tiếng Việt, xác thực đầu vào, trạng thái gửi, lỗi và thông báo đăng ký thành công.
- `nichigo_frontend/src/components/auth/auth-layout.tsx` và `auth-layout.module.css`: layout xác thực độc lập, nền toàn viewport, overlay và vùng căn giữa; không render AppShell.
- `nichigo_frontend/src/components/branding/brand-logo.tsx` và `brand-logo.module.css`: logo raster dùng lại được, đổi biến thể theo `data-theme` và giữ nguyên tỉ lệ ảnh.
- `nichigo_frontend/src/app/login/page.tsx`, `src/app/register/page.tsx`: hai route xác thực dùng chung AuthLayout độc lập, không render AppShell học tập.
- `nichigo_frontend/src/components/layout/app-shell.tsx` và `app-shell.module.css`: logo NichiGo gọn ở sidebar; điểm vào tài khoản ở header, email và đăng xuất khi đã xác thực.
- `nichigo_frontend/src/app/layout.tsx`: đặt ReduxProvider bên trong ThemeProvider hiện có.
- `nichigo_frontend/src/lib/auth/auth-api.test.ts`, `tsconfig.test.json` và script `test`: kiểm thử bằng Node Test Runner có sẵn, không thêm dependency.

Giao diện dùng component Input/Button, semantic color tokens và ThemeSwitcher hiện tại; CSS Module hỗ trợ màn hình nhỏ và Light/Dark/System.

## 3. Branding và bố cục xác thực

Asset nằm trong `nichigo_frontend/public/branding/`. `logo-card-light-transparent.png` và `logo-card-dark-transparent.png` đều là PNG RGBA 1189×368, có alpha trong suốt tại nền (alpha góc ảnh bằng 0), vùng artwork alpha từ `(4, 5)` đến `(1187, 368)`, gồm biểu tượng, wordmark NichiGo và tagline. Đã kiểm tra trực quan trên nền sáng/tối; không thấy nền hình chữ nhật. `BrandLogo` chọn logo chữ tối cho Light, logo chữ sáng cho Dark; khi theme là System, `next-themes` phân giải `data-theme` theo effective theme trước khi CSS chọn ảnh. Ảnh giữ intrinsic ratio, `width: 100%`, `height: auto` và `object-fit: contain`, không crop hay kéo méo. Logo ngang auth tối đa 17rem, sidebar tối đa 12.5rem và căn giữa; mobile dùng icon có sẵn.

README đi kèm branding ghi chú rằng các PNG là crop từ identity sheet và một số asset có thể còn compositing artifacts; đã kiểm tra trực quan các biến thể được chọn. Nếu thay bằng bản export sạch từ file thiết kế, chỉ cần thay source trong `BrandLogo` và cập nhật kích thước nội tại tương ứng.

`/login` và `/register` render `AuthLayout` thay vì AppShell. Layout có lớp nền riêng, lớp phủ riêng và form panel duy nhất ở giữa màn hình. Nền placeholder được khai báo bằng `--auth-background-image` trong `auth-layout.module.css`; khi có ảnh nền mới, thay giá trị gradient tại khai báo đó bằng `url("/branding/auth-background.jpg")`. Giữ `background-size: cover`, `background-position: center` và lớp overlay riêng. Không dùng asset logo làm ảnh nền.

Panel giới hạn rộng 27rem, dùng surface/border/radius/shadow theo semantic token. Ở màn hình nhỏ panel chiếm bề rộng khả dụng sau padding an toàn; viewport cuộn dọc, và ở chiều cao ngắn panel căn từ đầu để không bị cắt bởi viewport/bàn phím. Màu nền, surface và logo theo Light/Dark/System; không đổi palette Sakura Pink.

## 4. Backend contract đã xác minh

Đối chiếu source JPN-010A trong `nichigo_backend/src/main/java/com/nichigo/api/auth` và `common/web/ApiExceptionHandler.java`:

| Method | Endpoint | Hợp đồng frontend |
| --- | --- | --- |
| GET | `/api/v1/auth/csrf` | `200 { "headerName": "X-CSRF-TOKEN", "token": "…" }` |
| POST | `/api/v1/auth/register` | JSON `{ email, password }`; `201 UserResponse`; không tự đăng nhập |
| POST | `/api/v1/auth/login` | JSON `{ email, password }`; `200 UserResponse`; sai thông tin `401` |
| GET | `/api/v1/auth/me` | `200 UserResponse`; guest/session hết hạn `401` |
| POST | `/api/v1/auth/logout` | `204`; cần session và CSRF |

`UserResponse` gồm `id`, `email`, `createdAt`, `updatedAt`. Email tối đa 320 ký tự. Đăng ký yêu cầu mật khẩu dài ít nhất 8 ký tự và không quá 72; controller giới hạn thêm độ dài UTF-8 tối đa 72 byte, được kiểm tra phía client. Email trùng là `409 email_already_registered`; dữ liệu sai `400 invalid_request`; CSRF/forbidden `403`.

## 5. Cookie session và CSRF

Mọi request API dùng `credentials: "include"` và `cache: "no-store"`. Trình duyệt tự gửi cookie HttpOnly `SESSION`; JavaScript không đọc cookie. Client không lưu session ID, token xác thực, user flag hoặc mật khẩu vào localStorage/sessionStorage. User hiện tại và state nằm trong React Context; CSRF token chỉ nằm trong bộ nhớ của API client.

Trước mutation, client gọi `/csrf` nếu chưa có token hợp lệ, rồi gửi token bằng header name backend trả về. Các thao tác đồng thời dùng chung lần bootstrap đang chạy. Token được cache trong bộ nhớ để tránh bootstrap dư thừa.

Sau login thành công, API client xóa token anonymous và bootstrap token mới trước mutation tiếp theo. Nếu bootstrap sau login tạm thất bại, login vẫn được xác nhận theo response backend; mutation sau sẽ thử bootstrap lại. Sau logout thành công, token bị xóa và được lấy mới lazily cho mutation kế tiếp. Response `401` hoặc `403` làm mất cache CSRF; request mutation hiện tại không được tự gửi lại. Người dùng có thể thử lại thao tác để client lấy token mới.

## 6. Luồng giao diện và trạng thái

- Khi ứng dụng tải, provider gọi `/me`. `401` thành guest; lỗi mạng hoặc server thành `unavailable`, tách biệt với guest. Trong lúc kiểm tra, header không hiển thị thông tin tài khoản và form auth hiện trạng thái chờ.
- Đăng ký kiểm tra email/mật khẩu/xác nhận, gửi request có CSRF và hiển thị thành công cùng CTA đăng nhập. User không được đánh dấu là đã đăng nhập.
- Đăng nhập cập nhật user từ response, refresh CSRF và chuyển tới `next` nếu đó là đường dẫn tương đối nội bộ an toàn; trường hợp khác về `/`.
- `/login` và `/register` chuyển user đã xác thực về `/` sau khi `/me` trả thành công.
- Đăng xuất chỉ xóa user khỏi state sau khi API thành công hoặc trả `401` do session đã hết hạn. Lỗi mạng/CSRF được thông báo và cho phép thử lại.

## 7. Cấu hình chạy local

`nichigo_frontend/.env.example` đã khai báo:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Sao chép thành `nichigo_frontend/.env.local` nếu cần cấu hình local khác (file env đã được ignore). Chạy backend tại URL đã cấu hình và đảm bảo `ALLOWED_ORIGINS` cho phép `http://localhost:3000`; mặc định backend JPN-010A đã cho phép origin này. Từ `nichigo_frontend`, chạy `npm run dev` rồi mở `http://localhost:3000`.

## 8. Kiểm thử

Đã chạy trong `nichigo_frontend`:

| Lệnh | Kết quả |
| --- | --- |
| `npm run lint` | Pass |
| `npm run type-check` | Pass |
| `npm test` | Pass, 11 test |
| `npm run build` | Pass; Next.js tạo route `/login` và `/register` |

Test Node dùng Axios adapter để kiểm tra endpoint, credentials + header CSRF, token refresh sau login, guest `/me` 401, lỗi mạng, trạng thái Redux, login/logout và ngăn request cũ ghi đè trạng thái mới. Validation mật khẩu/email và safe redirect vẫn có trong unit tests.

Test `theme-switcher-icons.test.tsx` render server markup và xác nhận Sun/Moon cùng tồn tại để CSS chọn theme mà không đổi cây SVG giữa server và hydration.

### Hướng dẫn kiểm tra thủ công

1. Khởi động PostgreSQL, backend và frontend; mở `/register` ở giao diện Light.
2. Thử email sai định dạng, mật khẩu ngắn, mật khẩu trên giới hạn byte và hai mật khẩu không khớp; xác nhận lỗi hiện cạnh trường tương ứng và không gửi request.
3. Đăng ký tài khoản mới; xác nhận thông báo thành công và CTA sang `/login`, không có trạng thái đăng nhập.
4. Đăng ký lại cùng email; xác nhận thông báo email đã tồn tại.
5. Đăng nhập bằng mật khẩu sai; xác nhận lỗi xác thực tổng quát. Sau đó đăng nhập đúng.
6. Xác nhận header hiển thị email; tải lại trang và xác nhận session còn hiệu lực qua `/me`.
7. Mở `/login` hoặc `/register` khi đã đăng nhập; xác nhận chuyển về `/`.
8. Đăng xuất, tải lại trang và xác nhận trạng thái guest. Đăng nhập lại, để session backend hết hạn rồi tải lại; xác nhận guest thay vì lỗi ứng dụng.
9. Trong Network panel, xác nhận `credentials` gửi cookie, mutation có `X-CSRF-TOKEN`, login bootstrap CSRF mới, và lỗi `403` không làm POST tự lặp.
10. Dừng backend hoặc làm API không truy cập được; xác nhận giao diện hiển thị trạng thái không kết nối riêng với guest.
11. Lặp lại trên màn hình điện thoại, chỉ dùng bàn phím, và thử cả Light, Dark, System; xác nhận focus, nhãn, thông báo và không tràn ngang.
12. Trên desktop xác nhận panel căn giữa, cả hai route không có learning sidebar/header/navigation, logo đầy đủ hiển thị đúng biến thể và không bị kéo méo/cắt.
13. Thu nhỏ viewport tới 320px để xác nhận không tràn ngang, sau đó mở một trang học công khai để xác nhận sidebar/navigation AppShell vẫn hoạt động.

## 9. Giới hạn và triển khai production

- API hiện được gọi trực tiếp từ browser cross-origin. Production cần cấu hình CORS allowlist chính xác và HTTPS.
- Cấu hình backend hiện mặc định SameSite=Lax. Frontend/backend trên hai domain khác site có thể bị chính sách cookie bên thứ ba chặn; cần triển khai hai host cùng site hoặc đánh giá BFF trong ticket triển khai. Không tự đổi chính sách cookie tại JPN-010B.
- Chưa có suite E2E lâu dài cho đăng nhập thành công, cookie/session PostgreSQL, logout, CORS production hoặc theme/mobile.
- Chưa có rate limiting/MFA/password reset/email verification; các giới hạn này thuộc phạm vi backend hoặc ticket tương lai.

## 10. Cập nhật giao diện cuối JPN-010B

- UI icons use named imports from `lucide-react` with consistent sizing and stroke weight. Password visibility in `src/components/auth/auth-form.tsx` uses `Eye`/`EyeOff` buttons for both password and confirmation fields, with accessible Vietnamese labels and a 40px target; input type toggling does not change validation or request behavior. Mobile navigation, shared dialogs, theme options, account actions, auth success, and directional links also use Lucide icons. Brand marks, Japanese editorial characters, and CSS hero artwork remain intentional non-interface visuals.
- `src/components/theme-switcher.tsx` is an independent 40px icon button and dropdown for Sáng/Tối/Hệ thống, using `next-themes` and its existing persistence. Both Lucide Sun and Moon icons remain in the server and first client markup; CSS selects visibility from the root effective `data-theme` attribute (with a system media-query fallback). This keeps SVG structure stable while theme state is unavailable during SSR. The selected preference has a `Check` indicator in the menu. `usePopover` closes on outside click and Escape and restores focus to the trigger. The same component appears in AppShell and AuthLayout; it does not create theme state of its own.
- `patches/next-themes+0.4.6.patch` applies the minimal upstream-proposed fix: the no-flash ThemeScript is rendered into server HTML only and omitted from client rendering. This preserves the pre-hydration theme bootstrap while preventing React 19 / Next 16.2 from encountering the script during a client render. `patch-package` is run from `postinstall` so fresh installs receive the patch. The upstream issue and PR were open when checked; no theme library migration or app-owned script was added.
- Hydration/script investigation was source-based because this environment does not expose browser automation. Theme-dependent app markup is now stable by construction; confirm the browser console on `/`, `/login`, and `/register` during manual QA.
- `src/components/account/account-menu.tsx` is a separate welcome pill. Guest sees “Xin chào! / Khách”, a neutral avatar and links for Đăng nhập/Tạo tài khoản. Authenticated users see “Chào mừng trở lại”, the email local part as a temporary display identifier, the full email in the dropdown, and Đăng xuất. Long identifiers truncate in the trigger. Backend unavailable and checking states remain distinct from Guest; unavailable shows a connection message without guest actions, and checking never flashes “Khách”.
- AccountMenu accepts optional future `profile.displayName` and `profile.avatarUrl` presentation values so a later profile source can provide them without replacing the trigger/avatar layout. The current `AuthUser` contract has no such fields; the UI does not infer a verified name or invent profile data.
- `src/components/branding/brand-logo.tsx` có biến thể auth, sidebar, mobile. Auth/sidebar chọn asset theo effective `data-theme`; mobile dùng icon có sẵn. Hai logo ngang transparent variants có nền thật sự trong suốt và đầy đủ biểu tượng, wordmark, tagline. Không thay đổi asset branding gốc.
- Header AppShell đặt ThemeSwitcher và AccountMenu thành hai điều khiển tách biệt; account pill có độ nhấn mạnh cao hơn. Màn hình nhỏ thu gọn lời chào/nhãn, dưới 360px giữ avatar button có aria-label để tránh tràn ngang. Dropdown không bị cắt bởi header. AuthLayout tái sử dụng ThemeSwitcher độc lập ở góc trên phải.
- AuthLayout giữ trang fullscreen độc lập, một nền liên tục và form panel căn giữa; `--auth-background-image` là điểm mở rộng để thay gradient bằng ảnh nền trong tương lai. Không đổi luồng auth, session cookie, CSRF, API client hoặc state provider trong đợt chỉnh UI này.
- Homepage `/` được chỉnh tại `src/app/page.tsx` và `home.module.css`: headline “Tiếng Nhật, từng bước một.”, hai CTA, artwork CSS gợi hoa anh đào/cổng torii/mặt trời/đồi, hai lối vào dạng hàng biên mảnh và lời nhắn editorial không đóng thành card. Không thêm số liệu hoặc nội dung học giả tạo. Chi tiết AppShell/homepage được ghi tiếp trong JPN-003.

Sau lượt local auth diagnosis, `npm run lint`, `npm run type-check`, `npm test` (10 test) và `npm run build` đều pass. `ThemeSwitcherIcons` có SSR markup regression test xác nhận markup chứa cả Sun và Moon. `/`, `/login` và `/register` trả HTTP 200 từ listener local hiện có; không có browser automation để kiểm tra console, hydration hoặc tương tác trực tiếp. Password toggle, dropdown, responsive 320px và Light/Dark/System vẫn cần browser QA thủ công.

## 11. Chẩn đoán kết nối auth local

Lần chẩn đoán local xác nhận auth bootstrap chạy ở phía browser. Nếu `NEXT_PUBLIC_API_BASE_URL` rỗng, Axios client ném `configuration_error` trước khi gửi request; trạng thái giữ `unavailable`, không chuyển nhầm thành guest. `.env.example` chỉ là mẫu, Next.js không tự nạp file này. Tạo `nichigo_frontend/.env.local` với `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`, sau đó khởi động lại frontend để giá trị public được nhúng vào client bundle. Không commit file local này.

Trong lượt chẩn đoán, backend health trả HTTP 200; gọi `/api/v1/auth/me` với Origin `http://localhost:3000` trả 401 cùng `Access-Control-Allow-Origin` khớp origin và `Access-Control-Allow-Credentials: true`, đúng cho guest không có session. Do base URL frontend đang thiếu, trình duyệt của checkout này không thể phát request `/me`; CORS không phải nguyên nhân đã quan sát được. Đã thêm regression test xác nhận base URL thiếu ngăn `fetch` và giữ `unavailable`. Browser DevTools chưa được truy cập trực tiếp.

Follow-up chẩn đoán: `nichigo_frontend/.env` hiện có `NEXT_PUBLIC_API_BASE_URL` với origin `http://localhost:8080`; không có `.env.local`, `.env.development.local` hoặc `.env.development`, và shell hiện tại không override biến này. `.env.example` không có trong frontend root ở lần kiểm tra này. Các script bundle hiện được serve tại `http://localhost:3000` chứa origin `http://localhost:8080` và path `/api/v1/auth/me`; URL builder bỏ slash cuối nên tạo đúng endpoint một lần. Vì vậy config trong server hiện đang phục vụ đã cập nhật; không xác nhận được liệu tab Chrome có dùng bundle này hay có lỗi hydration/fetch vì không có quyền truy cập browser/Console. Khi vẫn thấy unavailable, dừng rồi khởi động lại Next.js từ `nichigo_frontend`, mở `http://localhost:3000` và hard reload với DevTools Disable cache. Nếu request xuất hiện nhưng bị CORS chặn, đối chiếu Origin trên thanh địa chỉ với `ALLOWED_ORIGINS`; không thay đổi backend cho đến khi có lỗi cụ thể.

## 8. Kiến trúc frontend Redux Toolkit và Axios

Redux Toolkit quản lý trạng thái xác thực chung vì trạng thái này được dùng ở form đăng nhập/đăng ký và menu tài khoản. Redux chỉ giữ `checking`, `guest`, `authenticated` hoặc `unavailable`, user hiện tại và nhóm lỗi an toàn; store không persist. Mỗi lần tải lại bắt đầu từ `checking` và provider client dispatch `checkSession` để khôi phục từ cookie HttpOnly qua `/me`. Cookie Spring Session là nguồn sự thật.

`src/api/index.ts` tạo Axios client dùng `NEXT_PUBLIC_API_BASE_URL`, `withCredentials: true` và interceptor chuẩn hóa lỗi HTTP, mạng, hủy request và thiếu cấu hình. `src/api/auth.ts` chứa hợp đồng auth: CSRF, register, login, logout và `/me`. CSRF được cache trong bộ nhớ của module API, gửi bằng header do backend trả về, xóa sau logout và bootstrap lại sau login. API mutation không tự retry. `/me` 401 trả về guest; lỗi khác chuyển auth state sang unavailable. CSRF token và cookie không vào Redux.

`src/store/index.ts`, `src/store/hooks.ts` và `src/store/slices/auth-slice.ts` định nghĩa store, typed hooks và async thunks. `activeRequestId` đảm bảo kết quả của request cũ không ghi đè thao tác auth mới hơn; hủy request có chủ đích không bị biến thành lỗi dịch vụ. `src/components/providers/redux-provider.tsx` tạo một store theo vòng đời provider bằng ref ở client, không dùng singleton mutable trên server. Provider vẫn nằm bên trong ThemeProvider hiện hữu; đây là client boundary nhỏ cần cho Redux và bootstrap.

API module mới nên đặt trong `src/api/<domain>.ts` và dùng client chung từ `src/api/index.ts`; không đặt logic nghiệp vụ domain vào interceptor. Feature state mới nên có slice riêng trong `src/store/slices/`, dùng typed hooks và giữ dữ liệu nhạy cảm hoặc thông tin lỗi thô ngoài Redux. Không thêm persistence cho session auth.

Kiểm thử auth dùng Axios adapter giả để xác minh endpoint, credentials, CSRF, phản hồi `/me`, lỗi mạng, chuyển trạng thái Redux, logout và request cũ. `npm run lint`, `npm run type-check`, `npm test` và `npm run build` cần được chạy để xác minh bản triển khai này.

## 12. Browser auth initialization fix

Playwright/Chrome reproduced the failure on `/`: `AuthApi` stored the unbound browser `fetch` function, then invoked it as `this.fetcher(...)`, binding `this` to the `AuthApi` object. Chrome threw `TypeError: Illegal invocation` before sending any request. The direct console call succeeded because a global `fetch(...)` call uses the `Window` receiver. API client now binds the supplied fetch implementation to `globalThis`; this also keeps injected fetchers testable. No URL, credentials, CORS, CSRF or session behavior changed.

The automated browser smoke test then observed the automatic `GET http://localhost:8080/api/v1/auth/me`, HTTP 401 with matching CORS headers, provider transition to Guest, and both account menu links. Direct console fetches with and without explicit `Accept` both returned 401, confirming headers/cache were not the cause. The receiver-binding regression test covers the exact defect. In the reproduced run, one initial effect attempt ran; the effect's existing cleanup guard still ignores results after cleanup. Temporary diagnostic logs and the one-off Playwright installation were removed after verification.

## 13. Final review corrections

Login submission is form-local: `login.pending` does not replace global auth status with `checking`. A 401 remains a safe serialized error for `AuthForm` to render as invalid credentials. It leaves Guest unchanged and preserves an already known authenticated session because failed credentials do not prove that the existing Spring session is invalid. Network/configuration/server errors can mark an unauthenticated state unavailable; a known authenticated user is retained when a separate login attempt fails. Session check request IDs plus a session revision prevent a check started before successful login/logout from replacing the newer state.

CSRF bootstrap is shared by concurrent mutations but no caller's AbortSignal owns the underlying GET. A cancelled caller stops waiting and does not send its mutation; other callers can still use the same-session response. Bootstrap failures clear the in-flight promise so a later explicit user action can request a fresh token. Session changes increment a local cache generation: a delayed pre-login/pre-logout response cannot repopulate the cache after invalidation. Mutations are never replayed, and no failure bypasses the server's CSRF check.

The lockfile pins `next-themes` 0.4.6. Its `ThemeScript` renders an inline `<script>` both in server markup and during a client render; React 19 warns when a client render encounters script elements. The small patch-package change preserves the server-rendered pre-hydration script, which applies the stored/system theme before paint, and returns `null` when that component renders in a browser. This matches the reported compatibility bug and fix in [next-themes issue #385](https://github.com/pacocoursey/next-themes/issues/385) and [PR #386](https://github.com/pacocoursey/next-themes/pull/386). The PR remains open upstream as checked on 2026-10-29. The patch is version-specific and applies to both CommonJS and ESM distributions of 0.4.6. `npm ci` plus `patch-package` postinstall is the clean-install check. Remove this patch once a pinned upstream release includes the server-only ThemeScript guard; then remove `patch-package` if no other patch uses it and repeat clean install, hydration, and theme-switch checks. This patch does not change the app's theme provider, storage preference, or Light/Dark/System UI.

The upstream issue reports and pull request discussion contain reproductions for React 19 / Next.js 16.2. This environment has no browser automation session, so this review did not independently exercise hydration, theme switching, or the auth flows in a browser. A local `npm ci` attempt was blocked because Windows could not unlink the in-use Next SWC binary; clean-install and script verification are being run in an isolated review copy to avoid stopping other workspace processes.

