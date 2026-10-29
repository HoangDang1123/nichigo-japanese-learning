import { AxiosHeaders } from "axios";
import { apiRequest, ApiError } from "./index";

export interface AuthUser { id: string; email: string; createdAt: string; updatedAt: string }
interface CsrfResponse { headerName: string; token: string }
let csrf: CsrfResponse | null = null;
let csrfRequest: Promise<CsrfResponse> | null = null;
let csrfGeneration = 0;
export function clearCsrfCache() {
  csrf = null;
  csrfGeneration += 1;
  csrfRequest = null;
}

function waitForCaller<T>(request: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return request;
  if (signal.aborted) return Promise.reject(new ApiError("cancelled", 0, "cancelled", "Request cancelled."));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new ApiError("cancelled", 0, "cancelled", "Request cancelled."));
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    signal.addEventListener("abort", onAbort, { once: true });
    request.then((value) => { cleanup(); resolve(value); }, (error: unknown) => { cleanup(); reject(error); });
  });
}

export async function bootstrapCsrf(signal?: AbortSignal): Promise<CsrfResponse> {
  if (csrf) return csrf;
  if (!csrfRequest) {
    const generation = csrfGeneration;
    const request = apiRequest<CsrfResponse>({ url: "/api/v1/auth/csrf", method: "GET" })
      .then((value) => {
        // A response started under the anonymous session must not repopulate the cache after login/logout.
        if (generation === csrfGeneration) csrf = value;
        return value;
      }).finally(() => {
        if (csrfRequest === request) csrfRequest = null;
      });
    csrfRequest = request;
  }
  return waitForCaller(csrfRequest, signal);
}
async function mutate<T>(url: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  const token = await bootstrapCsrf(signal);
  try {
    return await apiRequest<T>({ url, method: "POST", data, signal, headers: AxiosHeaders.from({ [token.headerName]: token.token }) });
  } catch (error) {
    // Discard a token rejected by the backend; the next user action bootstraps again, without replaying this mutation.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) clearCsrfCache();
    throw error;
  }
}
export const authApi = {
  async currentUser(signal?: AbortSignal) {
    try { return await apiRequest<AuthUser>({ url: "/api/v1/auth/me", method: "GET", signal }); }
    catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error; }
  },
  async register(email: string, password: string, signal?: AbortSignal) {
    return mutate<AuthUser>("/api/v1/auth/register", { email, password }, signal);
  },
  async login(email: string, password: string, signal?: AbortSignal) {
    const user = await mutate<AuthUser>("/api/v1/auth/login", { email, password }, signal);
    clearCsrfCache();
    try { await bootstrapCsrf(); } catch { /* next mutation will bootstrap again */ }
    return user;
  },
  async logout(signal?: AbortSignal) {
    try { await mutate<void>("/api/v1/auth/logout", undefined, signal); }
    catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
    finally { clearCsrfCache(); }
  },
};

export { ApiError } from "./index";
export function authErrorMessage(error: unknown, action: "login" | "register" | "logout"): string {
  if (error && typeof error === "object" && "status" in error && typeof error.status === "number") {
    const status = error.status;
    if (status === 401) return action === "login" ? "Email hoặc mật khẩu chưa chính xác." : "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (status === 409) return "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.";
    if (status === 400) return "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.";
  }
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    if (error.message === "network" || error.message === "configuration") return "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.";
  }
  if (!(error instanceof ApiError)) return "Đã xảy ra lỗi. Vui lòng thử lại.";
  if (error.category === "network_error" || error.category === "configuration_error") return "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.";
  if (error.status === 400) return "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.";
  if (error.status === 401) return action === "login" ? "Email hoặc mật khẩu chưa chính xác." : "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (error.status === 403) return "Phiên bảo mật đã thay đổi. Vui lòng thử lại thao tác.";
  if (error.status === 409) return "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.";
  if (error.status >= 500) return "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";
  return "Yêu cầu chưa thể hoàn tất. Vui lòng thử lại.";
}
