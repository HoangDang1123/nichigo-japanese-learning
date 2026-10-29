import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosError, type AxiosAdapter } from "axios";
import type { AuthUser } from "./auth";

const user: AuthUser = { id: "user-1", email: "learner@example.com", createdAt: "2026-10-28T00:00:00Z", updatedAt: "2026-10-28T00:00:00Z" };
function reply<T>(status: number, data: T, config: Parameters<AxiosAdapter>[0]) {
  return { status, statusText: "OK", data, headers: {}, config };
}
function fail<T>(status: number, data: T, config: Parameters<AxiosAdapter>[0]): never {
  throw new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, reply(status, data, config));
}
test("Axios auth contracts, CSRF lifecycle and Redux auth transitions", async () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  const [{ apiClient, ApiError }, { authApi, clearCsrfCache }, { makeStore }, { checkSession, login, logout }] = await Promise.all([
    import("./index"), import("./auth"), import("../store"), import("../store/slices/auth-slice"),
  ]);
  const originalAdapter = apiClient.defaults.adapter;
  let adapter: AxiosAdapter = async (config) => reply(200, user, config);
  apiClient.defaults.adapter = (config) => adapter(config);
  try {
    clearCsrfCache();
    const seen: Array<{ url?: string; method?: string; baseURL?: string; credentials?: boolean; csrf?: string }> = [];
    adapter = async (config) => {
      seen.push({ url: config.url, method: config.method, baseURL: config.baseURL, credentials: config.withCredentials, csrf: config.headers.get("X-CSRF-TOKEN") as string | undefined });
      if (config.url?.endsWith("/csrf")) return reply(200, { headerName: "X-CSRF-TOKEN", token: "secret-csrf" }, config);
      if (config.url?.endsWith("/register")) return reply(201, user, config);
      if (config.url?.endsWith("/login")) return reply(200, user, config);
      if (config.url?.endsWith("/logout")) return reply(204, "", config);
      return reply(200, user, config);
    };
    await authApi.register(user.email, "password-123");
    await authApi.register(user.email, "password-456");
    assert.equal(seen[0].url, "/api/v1/auth/csrf");
    assert.equal(seen[0].baseURL, "http://api.test");
    assert.equal(seen[1].credentials, true);
    assert.equal(seen.filter((x) => x.url?.endsWith("/csrf")).length, 1);
    assert.deepEqual(seen.filter((x) => x.url?.endsWith("/register")).map((x) => x.csrf), ["secret-csrf", "secret-csrf"]);

    clearCsrfCache(); seen.length = 0;
    await authApi.login(user.email, "password-123");
    await authApi.register(user.email, "password-789");
    assert.equal(seen.filter((x) => x.url?.endsWith("/csrf")).length, 2, "login reboots CSRF before the next mutation");

    adapter = async (config) => fail(401, { code: "unauthorized" }, config);
    assert.equal(await authApi.currentUser(), null, "me 401 is expected guest");
    adapter = async (config) => { throw new AxiosError("offline", "ERR_NETWORK", config); };
    await assert.rejects(authApi.currentUser(), (error: unknown) => error instanceof ApiError && error.category === "network_error");

    adapter = async (config) => reply(200, user, config);
    const store = makeStore();
    assert.equal(store.getState().auth.status, "checking", "fresh store starts checking");
    await store.dispatch(checkSession());
    assert.equal(store.getState().auth.status, "authenticated");

    adapter = async (config) => fail(401, { code: "unauthorized" }, config);
    await store.dispatch(login({ email: user.email, password: "wrong-password" }));
    assert.equal(store.getState().auth.status, "unavailable", "failed login does not authenticate");
    assert.equal(store.getState().auth.user, null);
    adapter = async (config) => { throw new AxiosError("offline", "ERR_NETWORK", config); };
    await store.dispatch(checkSession());
    assert.equal(store.getState().auth.status, "unavailable", "network failure is unavailable");

    adapter = async (config) => {
      if (config.url?.endsWith("/csrf")) return reply(200, { headerName: "X-CSRF-TOKEN", token: "login-csrf" }, config);
      if (config.url?.endsWith("/login")) return reply(200, user, config);
      return reply(200, user, config);
    };
    await store.dispatch(login({ email: user.email, password: "password-123" })).unwrap();
    assert.equal(store.getState().auth.status, "authenticated", "login success authenticates");

    clearCsrfCache();
    adapter = async (config) => {
      if (config.url?.endsWith("/csrf")) return reply(200, { headerName: "X-CSRF-TOKEN", token: "logout-csrf" }, config);
      if (config.url?.endsWith("/logout")) return reply(204, "", config);
      return reply(200, user, config);
    };
    await store.dispatch(logout()).unwrap();
    assert.equal(store.getState().auth.status, "guest");
    assert.equal(store.getState().auth.user, null);
    assert.equal(JSON.stringify(store.getState()).includes("password"), false);
    assert.equal(JSON.stringify(store.getState()).includes("csrf"), false);

    // A newer login completes before an older session check; the old response is ignored.
    let finishMe!: (value: ReturnType<typeof reply<AuthUser | null>>) => void;
    adapter = async (config) => {
      if (config.url?.endsWith("/me")) return new Promise((resolve) => { finishMe = (value) => resolve(value); });
      return reply(200, user, config);
    };
    clearCsrfCache();
    const staleCheck = store.dispatch(checkSession());
    await store.dispatch(login({ email: user.email, password: "password-123" })).unwrap();
    finishMe(reply(200, null, { url: "/api/v1/auth/me" } as Parameters<AxiosAdapter>[0]));
    await staleCheck;
    assert.equal(store.getState().auth.status, "authenticated", "stale check cannot overwrite newer login");
  } finally {
    apiClient.defaults.adapter = originalAdapter;
    clearCsrfCache();
  }
});
