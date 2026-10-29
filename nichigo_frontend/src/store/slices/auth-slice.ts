import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ApiError } from "../../api";
import { authApi, type AuthUser } from "../../api/auth";

export type AuthStatus = "checking" | "guest" | "authenticated" | "unavailable";
export type AuthErrorCategory = "network" | "configuration" | "server" | "request" | null;
export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  errorCategory: AuthErrorCategory;
  activeRequestId: string | null;
  sessionRevision: number;
  checkRevision: number;
  loginRequestId: string | null;
  logoutRequestId: string | null;
}
const initialState: AuthState = {
  status: "checking", user: null, errorCategory: null, activeRequestId: null,
  sessionRevision: 0, checkRevision: 0, loginRequestId: null, logoutRequestId: null,
};

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
function isInvalidCredentials(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "status" in error && error.status === 401);
}
function isAborted(error: unknown, aborted: boolean): boolean {
  return aborted || (error instanceof ApiError && error.category === "cancelled");
}
export const checkSession = createAsyncThunk("auth/checkSession", async (_, { signal }) => authApi.currentUser(signal), { serializeError: serializedFailure });
export const login = createAsyncThunk("auth/login", async ({ email, password }: { email: string; password: string }, { signal }) => authApi.login(email, password, signal), { serializeError: serializedFailure });
export const logout = createAsyncThunk("auth/logout", async (_, { signal }) => { await authApi.logout(signal); }, { serializeError: serializedFailure });
export const register = createAsyncThunk("auth/register", async ({ email, password }: { email: string; password: string }, { signal }) => authApi.register(email, password, signal), { serializeError: serializedFailure });

const authSlice = createSlice({
  name: "auth", initialState, reducers: {},
  extraReducers(builder) {
    builder
      .addCase(checkSession.pending, (state, action) => {
        state.activeRequestId = action.meta.requestId;
        state.checkRevision = state.sessionRevision;
        if (!state.user) state.status = "checking";
        state.errorCategory = null;
      })
      .addCase(checkSession.fulfilled, (state, action) => {
        if (state.activeRequestId !== action.meta.requestId || state.checkRevision !== state.sessionRevision) return;
        state.activeRequestId = null;
        state.user = action.payload;
        state.status = action.payload ? "authenticated" : "guest";
        state.errorCategory = null;
      })
      .addCase(checkSession.rejected, (state, action) => {
        if (state.activeRequestId !== action.meta.requestId || state.checkRevision !== state.sessionRevision) return;
        state.activeRequestId = null;
        if (isAborted(action.error, action.meta.aborted)) return;
        if (!state.user) {
          state.status = "unavailable";
          state.errorCategory = category(action.error);
        }
      })
      // Login is an operation on the form. Its local submitting state owns the spinner;
      // a rejected attempt does not change the currently known session.
      .addCase(login.pending, (state, action) => { state.loginRequestId = action.meta.requestId; })
      .addCase(login.fulfilled, (state, action) => {
        if (state.loginRequestId !== action.meta.requestId) return;
        state.loginRequestId = null;
        state.sessionRevision += 1;
        state.activeRequestId = null;
        state.user = action.payload;
        state.status = "authenticated";
        state.errorCategory = null;
      })
      .addCase(login.rejected, (state, action) => {
        if (state.loginRequestId !== action.meta.requestId) return;
        state.loginRequestId = null;
        if (isAborted(action.error, action.meta.aborted)) return;
        if (isInvalidCredentials(action.error)) {
          if (!state.user && state.status !== "checking") {
            state.status = "guest";
            state.errorCategory = null;
          }
          return;
        }
        if (state.user) return;
        if (state.status !== "checking") {
          state.status = "unavailable";
          state.errorCategory = category(action.error);
        }
      })
      .addCase(logout.pending, (state, action) => { state.logoutRequestId = action.meta.requestId; })
      .addCase(logout.fulfilled, (state, action) => {
        if (state.logoutRequestId !== action.meta.requestId) return;
        state.logoutRequestId = null;
        state.sessionRevision += 1;
        state.activeRequestId = null;
        state.user = null;
        state.status = "guest";
        state.errorCategory = null;
      })
      .addCase(logout.rejected, (state, action) => {
        if (state.logoutRequestId !== action.meta.requestId) return;
        state.logoutRequestId = null;
        if (isAborted(action.error, action.meta.aborted) || state.user || state.status === "checking") return;
        state.status = "unavailable";
        state.errorCategory = category(action.error);
      });
  },
});
export default authSlice.reducer;
