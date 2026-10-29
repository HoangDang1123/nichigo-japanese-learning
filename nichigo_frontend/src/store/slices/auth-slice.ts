import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ApiError } from "../../api";
import { authApi, type AuthUser } from "../../api/auth";

export type AuthStatus = "checking" | "guest" | "authenticated" | "unavailable";
export type AuthErrorCategory = "network" | "configuration" | "server" | "request" | null;
export interface AuthState { status: AuthStatus; user: AuthUser | null; errorCategory: AuthErrorCategory; activeRequestId: string | null }
const initialState: AuthState = { status: "checking", user: null, errorCategory: null, activeRequestId: null };

function category(error: unknown): Exclude<AuthErrorCategory, null> {
  if (error instanceof ApiError) {
    if (error.category === "configuration_error") return "configuration";
    if (error.category === "network_error") return "network";
    if (error.status >= 500) return "server";
  }
  if (error && typeof error === "object" && "message" in error) {
    if (error.message === "configuration") return "configuration";
    if (error.message === "network") return "network";
    if (error.message === "server") return "server";
  }
  return "request";
}
function serializedFailure(error: unknown) {
  return { message: category(error), ...(error instanceof ApiError ? { status: error.status, code: error.code } : {}) };
}
export const checkSession = createAsyncThunk("auth/checkSession", async (_, { signal }) => authApi.currentUser(signal));
export const login = createAsyncThunk("auth/login", async ({ email, password }: { email: string; password: string }, { signal }) => authApi.login(email, password, signal), { serializeError: serializedFailure });
export const logout = createAsyncThunk("auth/logout", async (_, { signal }) => { await authApi.logout(signal); });
export const register = createAsyncThunk("auth/register", async ({ email, password }: { email: string; password: string }, { signal }) => authApi.register(email, password, signal), { serializeError: serializedFailure });

const authSlice = createSlice({
  name: "auth", initialState, reducers: {},
  extraReducers(builder) {
    const pending = (state: AuthState, requestId: string) => { state.status = "checking"; state.errorCategory = null; state.activeRequestId = requestId; };
    const fulfilled = (state: AuthState, requestId: string, user: AuthUser | null) => {
      if (state.activeRequestId !== requestId) return;
      state.activeRequestId = null; state.user = user; state.status = user ? "authenticated" : "guest"; state.errorCategory = null;
    };
    const rejected = (state: AuthState, requestId: string, error: unknown, aborted = false) => {
      if (state.activeRequestId !== requestId) return;
      state.activeRequestId = null;
      if (aborted || (error instanceof ApiError && error.category === "cancelled")) return;
      state.status = "unavailable"; state.user = null; state.errorCategory = category(error);
    };
    builder
      .addCase(checkSession.pending, (s, a) => pending(s, a.meta.requestId))
      .addCase(checkSession.fulfilled, (s, a) => fulfilled(s, a.meta.requestId, a.payload))
      .addCase(checkSession.rejected, (s, a) => rejected(s, a.meta.requestId, a.error, a.meta.aborted))
      .addCase(login.pending, (s, a) => pending(s, a.meta.requestId))
      .addCase(login.fulfilled, (s, a) => fulfilled(s, a.meta.requestId, a.payload))
      .addCase(login.rejected, (s, a) => rejected(s, a.meta.requestId, a.error, a.meta.aborted))
      .addCase(logout.pending, (s, a) => pending(s, a.meta.requestId))
      .addCase(logout.fulfilled, (s, a) => fulfilled(s, a.meta.requestId, null))
      .addCase(logout.rejected, (s, a) => rejected(s, a.meta.requestId, a.error, a.meta.aborted));
  },
});
export default authSlice.reducer;
