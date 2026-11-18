import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";

function reply<T>(status: number, data: T, config: InternalAxiosRequestConfig) {
  return { status, statusText: "OK", data, headers: {}, config };
}

const directory = {
  groups: [
    { id: "foundation-knowledge", skills: [
      { type: "kana", availability: "available", itemCount: 2 },
      { type: "vocabulary", availability: "no_published_content", itemCount: 0 },
      { type: "grammar", availability: "no_published_content", itemCount: 0 },
      { type: "kanji", availability: "available", itemCount: 1 },
    ] },
    { id: "language-skills", skills: [
      { type: "listening", availability: "feature_unavailable", itemCount: null },
      { type: "speaking", availability: "feature_unavailable", itemCount: null },
      { type: "reading", availability: "feature_unavailable", itemCount: null },
      { type: "writing", availability: "feature_unavailable", itemCount: null },
    ] },
  ],
};

test("Skills API client uses the shared Axios configuration and sends query values verbatim", async () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  const [{ apiClient, ApiError }, { skillsApi, parseDirectory }] = await Promise.all([import("./index"), import("./skills")]);
  const original = apiClient.defaults.adapter;
  const seen: InternalAxiosRequestConfig[] = [];
  let respond: (config: InternalAxiosRequestConfig) => ReturnType<typeof reply> = (config) => reply(200, directory, config);
  const adapter: AxiosAdapter = async (config) => { seen.push(config); return respond(config); };
  apiClient.defaults.adapter = adapter;
  try {
    const result = await skillsApi.directory();
    assert.equal(result.groups.length, 2);
    assert.equal(seen.length, 1, "reading the Directory is a single request: no Guest session, CSRF or other bootstrap");
    assert.equal(seen[0].url, "/api/v1/skills");
    assert.equal(seen[0].method, "get");
    assert.equal(seen[0].baseURL, "http://api.test");
    assert.equal(seen[0].withCredentials, true);
    assert.ok(!seen.some((c) => /guest|csrf/.test(c.url ?? "")));

    // Items and flashcards: cursor and filters pass through untouched; undefined values are omitted.
    seen.length = 0;
    respond = (config) => reply(200, { items: [], nextCursor: null }, config);
    await skillsApi.items({ type: "kanji", q: " 日 ", limit: 50, after: "k:0001/next=" });
    assert.deepEqual(seen[0].params, { type: "kanji", q: " 日 ", limit: 50, after: "k:0001/next=" });
    await skillsApi.items();
    assert.deepEqual(seen[1].params, {});
    await skillsApi.items({ type: undefined, after: "x" });
    assert.deepEqual(seen[2].params, { after: "x" });
    respond = (config) => reply(200, { cards: [], nextCursor: null }, config);
    await skillsApi.flashcards({ type: "vocabulary", limit: 20 });
    assert.equal(seen[3].url, "/api/v1/skills/flashcards");
    assert.deepEqual(seen[3].params, { type: "vocabulary", limit: 20 });

    // Detail: the id is path-encoded, never interpreted.
    respond = (config) => reply(200, { id: "x" }, config);
    await skillsApi.item("a/b c");
    assert.equal(seen[4].url, "/api/v1/skills/items/a%2Fb%20c");

    // Backend error shape is preserved as ApiError.
    respond = (config) => { throw new AxiosError("nf", "ERR_BAD_REQUEST", config, undefined, reply(404, { code: "content_not_found", message: "Không tìm thấy." }, config)); };
    await assert.rejects(skillsApi.item("missing"), (error: unknown) => error instanceof ApiError && error.status === 404 && error.code === "content_not_found");

    // Network failure.
    respond = (config) => { throw new AxiosError("down", "ERR_NETWORK", config); };
    await assert.rejects(skillsApi.directory(), (error: unknown) => error instanceof ApiError && error.category === "network_error");

    // A malformed Directory is rejected rather than rendered.
    respond = (config) => reply(200, { groups: [{ id: "x", skills: [{ type: "kana", availability: "weird", itemCount: 1 }] }] }, config);
    await assert.rejects(skillsApi.directory(), (error: unknown) => error instanceof ApiError && error.code === "invalid_response");
  } finally {
    apiClient.defaults.adapter = original;
  }

  assert.equal(parseDirectory(directory).groups[1].skills[0].itemCount, null, "null count stays null");
  assert.equal(parseDirectory(directory).groups[0].skills[1].itemCount, 0, "zero stays zero");
  assert.throws(() => parseDirectory(null));
  assert.throws(() => parseDirectory({ groups: [{ id: "g", skills: [{ type: "kana", availability: "available", itemCount: -1 }] }] }));
  assert.throws(() => parseDirectory({ groups: [{ id: "g", skills: [{ type: "kana", availability: "available" }] }] }));
});
