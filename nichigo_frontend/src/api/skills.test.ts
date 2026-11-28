import assert from "node:assert/strict";
import { test } from "node:test";
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";

function reply<T>(status: number, data: T, config: InternalAxiosRequestConfig) {
  return { status, statusText: "OK", data, headers: {}, config };
}

const item = { id: "i1", key: "k1", revision: 2, kind: "kanji", displayTextJa: "日", displayTextVi: "ngày", payload: { glyph: "日", onReadings: ["ニチ"], extra: "dropped" } };

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
    respond = (config) => reply(200, item, config);
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

type Harness = {
  ApiError: typeof import("./index").ApiError;
  skillsApi: typeof import("./skills").skillsApi;
  seen: InternalAxiosRequestConfig[];
  setRespond(fn: (config: InternalAxiosRequestConfig) => ReturnType<typeof reply>): void;
  restore(): void;
};
async function harness(): Promise<Harness> {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  const [{ apiClient, ApiError }, { skillsApi }] = await Promise.all([import("./index"), import("./skills")]);
  const original = apiClient.defaults.adapter;
  const seen: InternalAxiosRequestConfig[] = [];
  let respond: (config: InternalAxiosRequestConfig) => ReturnType<typeof reply> = (config) => reply(200, {}, config);
  apiClient.defaults.adapter = (async (config) => { seen.push(config); return respond(config); }) as AxiosAdapter;
  return { ApiError, skillsApi, seen, setRespond: (fn) => { respond = fn; }, restore: () => { apiClient.defaults.adapter = original; } };
}
const fail = (status: number, data: unknown) => (config: InternalAxiosRequestConfig): never => {
  throw new AxiosError("e", "ERR_BAD_REQUEST", config, undefined, reply(status, data, config));
};

test("Skills API validates items, item and flashcards responses", async () => {
  const h = await harness();
  try {
    h.setRespond((c) => reply(200, { items: [item], nextCursor: "k1" }, c));
    const page = await h.skillsApi.items({ type: "kanji", after: "k0" });
    assert.equal(page.nextCursor, "k1");
    assert.deepEqual(page.items[0].payload, { glyph: "日", onReadings: ["ニチ"] }, "unknown payload fields are dropped, none invented");
    h.setRespond((c) => reply(200, { items: [{ ...item, payload: {} }], nextCursor: null }, c));
    assert.deepEqual((await h.skillsApi.items()).items[0].payload, {}, "empty payload stays empty");

    const bad: unknown[] = [null, [], { nextCursor: null }, { items: "x", nextCursor: null }, { items: [{ ...item, kind: "example" }] },
      { items: [{ ...item, revision: "2" }] }, { items: [{ ...item, payload: null }] }, { items: [{ ...item, payload: { onReadings: "ニチ" } }] },
      { items: [], nextCursor: 5 }];
    for (const body of bad) {
      h.setRespond((c) => reply(200, body, c));
      await assert.rejects(h.skillsApi.items(), (e: unknown) => e instanceof h.ApiError && e.code === "invalid_response", JSON.stringify(body));
    }
    h.setRespond((c) => reply(200, { ...item, payload: { glyph: 1 } }, c));
    await assert.rejects(h.skillsApi.item("i1"), (e: unknown) => e instanceof h.ApiError && e.code === "invalid_response");

    const card = { id: "c1", key: "k", revision: 1, kind: "vocabulary", front: "猫", back: "con mèo", reading: null };
    h.setRespond((c) => reply(200, { cards: [card, { ...card, reading: "ねこ" }], nextCursor: null }, c));
    const cards = await h.skillsApi.flashcards({ type: "vocabulary" });
    assert.equal(cards.cards[0].reading, null);
    assert.equal(cards.cards[1].reading, "ねこ");
    for (const body of [{ cards: [{ ...card, back: undefined }] }, { cards: [{ ...card, kind: "x" }] }, { cards: {} }, { cards: [{ ...card, reading: 3 }] }]) {
      h.setRespond((c) => reply(200, body, c));
      await assert.rejects(h.skillsApi.flashcards(), (e: unknown) => e instanceof h.ApiError && e.code === "invalid_response");
    }
  } finally { h.restore(); }
});

const kanji = {
  id: "k1", key: "kanji-nichi", revision: 3, glyph: "日", meaningVi: "ngày",
  onReadings: ["ニチ"], kunReadings: ["ひ"],
  relatedVocabulary: [{
    id: "v1", key: "v-nichiyoubi", revision: 1, surface: "日曜日", reading: "にちようび", glossVi: "chủ nhật",
    examples: [{ id: "e1", key: "e", revision: 1, textJa: "日曜日です", translationVi: "Là chủ nhật", segments: [{ text: "日曜日", reading: "にちようび" }, { text: "です" }] }],
  }],
  strokeOrder: { status: "metadata_only", mediaId: "m1", revision: 4, mimeType: "application/json", altTextVi: "Thứ tự nét" },
};

test("Skills API parses Kanji detail, including unavailable stroke order", async () => {
  const h = await harness();
  try {
    h.setRespond((c) => reply(200, kanji, c));
    const detail = await h.skillsApi.kanjiDetail("a/b c");
    assert.equal(h.seen[0].url, "/api/v1/skills/kanji/a%2Fb%20c");
    assert.equal(detail.relatedVocabulary[0].examples[0].segments[1].reading, undefined);
    assert.equal(detail.strokeOrder.status, "metadata_only");
    assert.deepEqual(detail.onReadings, ["ニチ"]);

    h.setRespond((c) => reply(200, { ...kanji, onReadings: undefined, kunReadings: null, relatedVocabulary: [],
      strokeOrder: { status: "unavailable", mediaId: null, revision: null, mimeType: null, altTextVi: null } }, c));
    const bare = await h.skillsApi.kanjiDetail("k1");
    assert.equal(bare.strokeOrder.status, "unavailable");
    assert.equal(bare.strokeOrder.mediaId, null);
    assert.equal("onReadings" in bare, false);
    assert.deepEqual(bare.relatedVocabulary, []);

    const word = kanji.relatedVocabulary[0];
    const badBodies: unknown[] = [
      { ...kanji, strokeOrder: { status: "ready" } },
      { ...kanji, strokeOrder: { status: "unavailable", mediaId: "m1", revision: null, mimeType: null, altTextVi: null } },
      { ...kanji, strokeOrder: { status: "metadata_only", mediaId: null, revision: null, mimeType: null, altTextVi: null } },
      { ...kanji, strokeOrder: undefined },
      { ...kanji, relatedVocabulary: null },
      { ...kanji, relatedVocabulary: [{ ...word, examples: [{ id: "e" }] }] },
      { ...kanji, relatedVocabulary: [{ ...word, examples: [{ ...word.examples[0], segments: [{ reading: "x" }] }] }] },
      { ...kanji, onReadings: [1] },
    ];
    for (const body of badBodies) {
      h.setRespond((c) => reply(200, body, c));
      await assert.rejects(h.skillsApi.kanjiDetail("k1"), (e: unknown) => e instanceof h.ApiError && e.code === "invalid_response");
    }
  } finally { h.restore(); }
});

test("Skills API stroke asset: encoded path, JSON object only", async () => {
  const h = await harness();
  try {
    h.setRespond((c) => reply(200, { version: 1, strokes: [] }, c));
    assert.deepEqual(await h.skillsApi.kanjiStrokeAsset("a/b"), { version: 1, strokes: [] });
    assert.equal(h.seen[0].url, "/api/v1/skills/kanji/a%2Fb/stroke-asset");
    for (const body of ["<svg/>", null, [1]]) {
      h.setRespond((c) => reply(200, body, c));
      await assert.rejects(h.skillsApi.kanjiStrokeAsset("k1"), (e: unknown) => e instanceof h.ApiError && e.code === "invalid_response");
    }
  } finally { h.restore(); }
});

test("Skills API maps 400/404/503 to ApiError with documented codes", async () => {
  const h = await harness();
  try {
    const cases: [number, string][] = [[400, "invalid_content_query"], [404, "content_not_found"], [503, "content_unavailable"]];
    for (const [status, code] of cases) {
      h.setRespond(fail(status, { code, message: "m" }));
      await assert.rejects(h.skillsApi.items({ limit: 99 }), (e: unknown) => e instanceof h.ApiError && e.category === "http_error" && e.status === status && e.code === code && e.message === "m");
      // A gateway answer without the backend body is normalised to the same code.
      h.setRespond(fail(status, "<html>"));
      await assert.rejects(h.skillsApi.kanjiDetail("k1"), (e: unknown) => e instanceof h.ApiError && e.status === status && e.code === code);
      await assert.rejects(h.skillsApi.kanjiStrokeAsset("k1"), (e: unknown) => e instanceof h.ApiError && e.status === status && e.code === code);
    }
    h.setRespond(fail(500, "x"));
    await assert.rejects(h.skillsApi.flashcards(), (e: unknown) => e instanceof h.ApiError && e.code === "http_500");
    h.setRespond((c) => { throw new AxiosError("down", "ERR_NETWORK", c); });
    await assert.rejects(h.skillsApi.kanjiDetail("k1"), (e: unknown) => e instanceof h.ApiError && e.category === "network_error");
  } finally { h.restore(); }
});
