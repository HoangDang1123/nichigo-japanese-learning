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
  const [{ apiClient, ApiError }, { authApi, authErrorMessage, bootstrapCsrf, clearCsrfCache }, { makeStore }, { checkSession, login, logout }] = await Promise.all([
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

    clearCsrfCache();
    let releaseSharedCsrf!: () => void;
    let markCsrfStarted!: () => void;
    const csrfStarted = new Promise<void>((resolve) => { markCsrfStarted = resolve; });
    let concurrentMutationCount = 0;
    adapter = async (config) => {
      if (config.url?.endsWith("/csrf")) {
        assert.equal(config.signal, undefined, "shared bootstrap is not owned by an individual caller signal");
        markCsrfStarted();
        return new Promise((resolve) => { releaseSharedCsrf = () => resolve(reply(200, { headerName: "X-CSRF-TOKEN", token: "shared-token" }, config)); });
      }
      concurrentMutationCount += 1;
      return reply(201, user, config);
    };
    const abortOne = new AbortController();
    const abortedMutation = authApi.register(user.email, "password-123", abortOne.signal);
    const independentMutation = authApi.register(user.email, "password-456");
    await csrfStarted;
    abortOne.abort();
    await assert.rejects(abortedMutation, (error: unknown) => error instanceof ApiError && error.category === "cancelled");
    releaseSharedCsrf();
    await independentMutation;
    assert.equal(concurrentMutationCount, 1, "one aborted caller does not cancel its concurrent mutation");

    clearCsrfCache();
    let csrfAttempts = 0;
    let recoveredMutationCount = 0;
    adapter = async (config) => {
      if (config.url?.endsWith("/csrf")) {
        csrfAttempts += 1;
        if (csrfAttempts === 1) return fail(503, { code: "temporary" }, config);
        return reply(200, { headerName: "X-CSRF-TOKEN", token: "recovered-token" }, config);
      }
      recoveredMutationCount += 1;
      return reply(201, user, config);
    };
    await assert.rejects(authApi.register(user.email, "password-123"));
    await authApi.register(user.email, "password-456");
    assert.equal(csrfAttempts, 2, "failed CSRF bootstrap is cleared so a later user action can retry it");
    assert.equal(recoveredMutationCount, 1, "failed mutation is never replayed");

    clearCsrfCache();
    let releaseOldBootstrap!: () => void;
    let markOldBootstrapStarted!: () => void;
    const oldBootstrapStarted = new Promise<void>((resolve) => { markOldBootstrapStarted = resolve; });
    let bootstrapCount = 0;
    adapter = async (config) => {
      if (!config.url?.endsWith("/csrf")) return reply(200, user, config);
      bootstrapCount += 1;
      if (bootstrapCount === 1) return new Promise((resolve) => { markOldBootstrapStarted(); releaseOldBootstrap = () => resolve(reply(200, { headerName: "X-CSRF-TOKEN", token: "old-session-token" }, config)); });
      return reply(200, { headerName: "X-CSRF-TOKEN", token: "new-session-token" }, config);
    };
    const oldSessionBootstrap = bootstrapCsrf();
    await oldBootstrapStarted;
    clearCsrfCache(); // Session rotation at successful login/logout fences the in-flight old response.
    assert.equal((await bootstrapCsrf()).token, "new-session-token");
    releaseOldBootstrap();
    await oldSessionBootstrap;
    assert.equal((await bootstrapCsrf()).token, "new-session-token", "stale bootstrap cannot overwrite the rotated session token");

    adapter = async (config) => fail(401, { code: "unauthorized" }, config);
    assert.equal(await authApi.currentUser(), null, "me 401 is expected guest");
    adapter = async (config) => { throw new AxiosError("offline", "ERR_NETWORK", config); };
    await assert.rejects(authApi.currentUser(), (error: unknown) => error instanceof ApiError && error.category === "network_error");

    adapter = async (config) => reply(200, user, config);
    const store = makeStore();
    assert.equal(store.getState().auth.status, "checking", "fresh store starts checking");
    await store.dispatch(checkSession());
    assert.equal(store.getState().auth.status, "authenticated");

    adapter = async (config) => fail(401, { code: "invalid_credentials" }, config);
    const authenticatedFailure = await store.dispatch(login({ email: user.email, password: "wrong-password" }));
    const authenticatedLoginError = login.rejected.match(authenticatedFailure) ? authenticatedFailure.error : {};
    assert.equal(store.getState().auth.status, "authenticated", "invalid credentials do not replace an existing authenticated session");
    assert.equal(store.getState().auth.user?.id, user.id);
    assert.match(authErrorMessage(authenticatedLoginError, "login"), /mật khẩu/i, "401 remains a form-level invalid-credentials error");

    const guestStore = makeStore();
    adapter = async (config) => fail(401, { code: "unauthorized" }, config);
    await guestStore.dispatch(checkSession());
    assert.equal(guestStore.getState().auth.status, "guest");
    adapter = async (config) => config.url?.endsWith("/login")
      ? fail(401, { code: "invalid_credentials" }, config)
      : reply(200, { headerName: "X-CSRF-TOKEN", token: "login-csrf" }, config);
    const invalidLogin = guestStore.dispatch(login({ email: user.email, password: "wrong-password" }));
    assert.equal(guestStore.getState().auth.status, "guest", "login pending does not replace global auth status with checking");
    const invalidLoginAction = await invalidLogin;
    const invalidLoginError = login.rejected.match(invalidLoginAction) ? invalidLoginAction.error : {};
    assert.equal(guestStore.getState().auth.status, "guest", "invalid credentials leave an unauthenticated user Guest");
    assert.match(authErrorMessage(invalidLoginError, "login"), /mật khẩu/i);

    adapter = async (config) => { throw new AxiosError("offline", "ERR_NETWORK", config); };
    await guestStore.dispatch(checkSession());
    assert.equal(guestStore.getState().auth.status, "unavailable", "network failure is unavailable");
    adapter = async (config) => fail(401, { code: "invalid_credentials" }, config);
    await guestStore.dispatch(login({ email: user.email, password: "wrong-password" }));
    assert.equal(guestStore.getState().auth.status, "guest", "a confirmed invalid-credentials response clears an earlier unavailable state");
    assert.equal(guestStore.getState().auth.errorCategory, null);

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
