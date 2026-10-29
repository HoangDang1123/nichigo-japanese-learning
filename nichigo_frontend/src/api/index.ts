import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";

export interface ApiErrorBody { code?: string; message?: string }
export type ApiErrorCategory = "configuration_error" | "network_error" | "http_error" | "cancelled";
export class ApiError extends Error {
  constructor(public readonly category: ApiErrorCategory, public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const baseURL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
export const apiClient: AxiosInstance = axios.create({
  ...(baseURL ? { baseURL } : {}),
  withCredentials: true,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (!baseURL) throw new ApiError("configuration_error", 0, "configuration_error", "API base URL is not configured.");
  return config;
});
apiClient.interceptors.response.use((response) => response, (error: unknown) => {
  if (error instanceof ApiError) return Promise.reject(error);
  if (axios.isCancel(error)) return Promise.reject(new ApiError("cancelled", 0, "cancelled", "Request cancelled."));
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    return Promise.reject(new ApiError(status ? "http_error" : "network_error", status,
      body?.code ?? (status ? `http_${status}` : "network_error"),
      body?.message ?? (status ? "Yêu cầu chưa thể hoàn tất. Vui lòng thử lại." : "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.")));
  }
  return Promise.reject(new ApiError("network_error", 0, "network_error", "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại."));
});

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try { return (await apiClient.request<T>(config)).data; }
  catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof AxiosError) throw error;
    throw error;
  }
}
