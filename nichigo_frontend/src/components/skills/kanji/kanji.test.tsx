import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ApiError } from "../../../api";
import type { KanjiDetailDto, SkillContentDto, SkillContentPageDto } from "../../../api/skills";
import {
  DETAIL_LOADING,
  INITIAL_LIST_STATE,
  KANJI_PAGE_SIZE,
  kanjiListReducer,
  kanjiQuery,
  loadKanjiDetail,
  mergeEntries,
  toKanjiDetailEntry,
  toKanjiEntry,
  type KanjiDetailState,
  type KanjiListState,
} from "./kanji-data";
import { DEMO_KANJI, demoFallbackEnabled, withDemoFallback } from "./kanji-demo";

// The Node test runner resolves neither "@/..." aliases nor CSS Modules (same approach as grammar.test.tsx).
const ROOT = join(__dirname, "..", "..", "..");
type ModuleInternals = { _resolveFilename: (...a: unknown[]) => string; _load: (...a: unknown[]) => unknown };
const internals = Module as unknown as ModuleInternals;
const originalResolve = internals._resolveFilename;
const originalLoad = internals._load;
const classNameProxy = new Proxy({}, { get: (_t, key) => (key === "__esModule" ? false : String(key)) });
internals._resolveFilename = function (request: unknown, ...rest: unknown[]) {
  const req = String(request);
  return originalResolve.call(this, req.startsWith("@/") ? join(ROOT, req.slice(2)) : req, ...rest);
};
internals._load = function (request: unknown, ...rest: unknown[]) {
  if (String(request).endsWith(".css")) return classNameProxy;
  return originalLoad.call(this, request, ...rest);
};
const testRequire = createRequire(__filename);

// ---- Controlled FIXTURES. Test data only: not backend data and not published content. ----
const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const ID_C = "33333333-3333-4333-8333-333333333333";
const kanji = (id: string, payload: Record<string, unknown>, extra: Partial<SkillContentDto> = {}): SkillContentDto =>
  ({ id, key: `kj-${id.slice(0, 2)}`, revision: 1, kind: "kanji", displayTextJa: "", displayTextVi: "", payload, ...extra }) as SkillContentDto;
const full = kanji(ID_A, { glyph: "日", meaningVi: "ngày, mặt trời", onReadings: ["ニチ", "ジツ"], kunReadings: ["ひ", "か"] });
const partial = kanji(ID_B, { glyph: "月", meaningVi: "tháng, mặt trăng" });
const page = (items: SkillContentDto[], nextCursor: string | null = null): SkillContentPageDto => ({ items, nextCursor });

const METADATA_ONLY = { status: "metadata_only", mediaId: "m", revision: 1, mimeType: "application/json", altTextVi: null } as const;
const detailDto = (over: Partial<KanjiDetailDto> = {}): KanjiDetailDto => ({
  id: ID_A, key: "kj-11", revision: 1, glyph: "日", meaningVi: "ngày, mặt trời", onReadings: ["ニチ", "ジツ"], kunReadings: ["ひ", "か"],
  relatedVocabulary: [], strokeOrder: { status: "unavailable", mediaId: null, revision: null, mimeType: null, altTextVi: null }, ...over,
});
const detailOf = (over: Partial<KanjiDetailDto> = {}) => toKanjiDetailEntry(detailDto(over))!;
const withWords = detailDto({
  relatedVocabulary: [{
    id: "w1", key: "w-1", revision: 1, surface: "日本", reading: "にほん", glossVi: "Nhật Bản",
    examples: [{ id: "e1", key: "e-1", revision: 1, textJa: "日本へ行きます。", translationVi: "Tôi đi Nhật.", segments: [{ text: "日本", reading: "にほん" }, { text: "へ行きます。" }] }],
  }, { id: "w2", key: "w-2", revision: 1, surface: "", reading: "", glossVi: "", examples: [] }],
});

const startSearch = (seq: number, query = ""): KanjiListState => kanjiListReducer(INITIAL_LIST_STATE, { type: "search", seq, query });

function renderOverview(state: KanjiListState, searchValue = "", demo = false) {
  const { KanjiOverviewView } = testRequire("./kanji-overview") as typeof import("./kanji-overview");
  return renderToStaticMarkup(<KanjiOverviewView state={state} demo={demo} searchValue={searchValue} onSearchChange={() => {}} onRetry={() => {}} onLoadMore={() => {}} />);
}
function renderDetail(state: KanjiDetailState) {
  const { KanjiDetailView } = testRequire("./kanji-detail") as typeof import("./kanji-detail");
  return renderToStaticMarkup(<KanjiDetailView state={state} onRetry={() => {}} />);
}

test("mapping: glyph, meaning and readings come from the API payload; optional fields may be missing", () => {
  assert.deepEqual(toKanjiEntry(full), { id: ID_A, glyph: "日", meaningVi: "ngày, mặt trời", onReadings: ["ニチ", "ジツ"], kunReadings: ["ひ", "か"] });
  assert.deepEqual(toKanjiEntry(partial), { id: ID_B, glyph: "月", meaningVi: "tháng, mặt trăng", onReadings: [], kunReadings: [] });
  // Blank entries and non-strings are dropped, never invented or coerced.
  const messy = toKanjiEntry(kanji(ID_C, { glyph: "火", onReadings: ["カ", "", "  ", 7], kunReadings: "ひ" }));
  assert.deepEqual(messy?.onReadings, ["カ"]);
  assert.deepEqual(messy?.kunReadings, []);
  assert.equal(messy?.meaningVi, null);
  // Canonical display text is only a fallback for glyph and meaning.
  assert.deepEqual(toKanjiEntry(kanji(ID_C, {}, { displayTextJa: "水", displayTextVi: "nước" })), { id: ID_C, glyph: "水", meaningVi: "nước", onReadings: [], kunReadings: [] });
  assert.equal(toKanjiEntry(kanji(ID_C, {})), null, "no glyph: not rendered");
});

test("wrong kind is never mapped", () => {
  const vocab = { id: ID_A, key: "v", revision: 1, kind: "vocabulary", displayTextJa: "日", displayTextVi: "ngày", payload: { surface: "日" } } as SkillContentDto;
  assert.equal(toKanjiEntry(vocab), null);
});

test("search resets list and cursor", () => {
  let s = startSearch(1);
  s = kanjiListReducer(s, { type: "loaded", seq: 1, append: false, page: page([full], "cur-1") });
  assert.equal(s.items.length, 1);
  assert.equal(s.nextCursor, "cur-1");
  s = kanjiListReducer(s, { type: "search", seq: 2, query: "ngày" });
  assert.equal(s.status, "loading");
  assert.deepEqual(s.items, []);
  assert.equal(s.nextCursor, null);
  assert.equal(s.query, "ngày");
  assert.equal(s.seq, 2);
});

test("out-of-order and cancelled results are ignored", () => {
  let s = startSearch(1, "a");
  s = kanjiListReducer(s, { type: "search", seq: 2, query: "ab" });
  const stale = kanjiListReducer(s, { type: "loaded", seq: 1, append: false, page: page([full]) });
  assert.equal(stale, s, "a late response from the superseded search changes nothing");
  assert.equal(kanjiListReducer(s, { type: "failed", seq: 1, append: false, message: "x" }), s);
  assert.equal(kanjiListReducer(s, { type: "more", seq: 1 }), s);
  const fresh = kanjiListReducer(s, { type: "loaded", seq: 2, append: false, page: page([partial]) });
  assert.deepEqual(fresh.items.map((e) => e.id), [ID_B]);
});

test("load more appends in order, deduplicates, keeps the opaque cursor and ends with null", () => {
  let s = startSearch(1);
  s = kanjiListReducer(s, { type: "loaded", seq: 1, append: false, page: page([full, partial], "opaque/cursor==") });
  assert.equal(s.nextCursor, "opaque/cursor==");
  s = kanjiListReducer(s, { type: "more", seq: 1 });
  assert.equal(s.loadingMore, true);
  assert.equal(kanjiListReducer(s, { type: "more", seq: 1 }), s, "a second load-more while loading is a no-op");
  s = kanjiListReducer(s, { type: "loaded", seq: 1, append: true, page: page([partial, kanji(ID_C, { glyph: "火", meaningVi: "lửa" })], null) });
  assert.deepEqual(s.items.map((e) => e.id), [ID_A, ID_B, ID_C], "no duplicate of the boundary item");
  assert.equal(s.nextCursor, null);
  assert.equal(s.loadingMore, false);
  assert.equal(kanjiListReducer(s, { type: "more", seq: 1 }), s, "no cursor: nothing to load");
  assert.deepEqual(mergeEntries([], [toKanjiEntry(full)!, toKanjiEntry(full)!]).length, 1);
});

test("a failed page append keeps loaded Kanji and offers retry; a failed first page is an error", () => {
  let s = startSearch(1);
  s = kanjiListReducer(s, { type: "loaded", seq: 1, append: false, page: page([full], "c") });
  s = kanjiListReducer(s, { type: "more", seq: 1 });
  s = kanjiListReducer(s, { type: "failed", seq: 1, append: true, message: "Mất kết nối." });
  assert.equal(s.status, "ready");
  assert.equal(s.items.length, 1);
  assert.equal(s.moreError, "Mất kết nối.");
  assert.equal(s.nextCursor, "c", "cursor kept so the same page can be retried");
  const failed = kanjiListReducer(startSearch(2), { type: "failed", seq: 2, append: false, message: "Lỗi máy chủ." });
  assert.equal(failed.status, "error");
  assert.equal(failed.error, "Lỗi máy chủ.");
});

test("query: blank search is omitted, text is trimmed once, limit and cursor pass through", () => {
  assert.deepEqual(kanjiQuery("", null), { type: "kanji", limit: KANJI_PAGE_SIZE });
  assert.deepEqual(kanjiQuery("   ", null), { type: "kanji", limit: KANJI_PAGE_SIZE });
  assert.deepEqual(kanjiQuery(" 日 ", "k:1/2=="), { type: "kanji", q: "日", limit: KANJI_PAGE_SIZE, after: "k:1/2==" });
  assert.ok(KANJI_PAGE_SIZE >= 1 && KANJI_PAGE_SIZE <= 50);
});

test("direct detail: fetches the Kanji Detail by id alone; 404 and 400 are not-found; others are errors", async () => {
  const seen: string[] = [];
  const ok = await loadKanjiDetail(async (id) => { seen.push(id); return detailDto(); }, ID_A);
  assert.deepEqual(seen, [ID_A], "no list state is required");
  assert.equal(ok.status === "success" && ok.entry.glyph, "日");
  assert.equal(ok.status === "success" && ok.demo, undefined, "real data is never marked demo");

  assert.deepEqual(await loadKanjiDetail(async () => detailDto({ glyph: "" }), ID_A), { status: "not-found" });
  for (const status of [404, 400]) {
    assert.deepEqual(await loadKanjiDetail(async () => { throw new ApiError("http_error", status, "content_not_found", "x"); }, ID_A), { status: "not-found" });
  }
  assert.deepEqual(await loadKanjiDetail(async () => { throw new ApiError("http_error", 503, "http_503", "Dịch vụ gián đoạn."); }, ID_A), { status: "error", message: "Dịch vụ gián đoạn." });
  assert.equal((await loadKanjiDetail(async () => { throw new ApiError("network_error", 0, "network_error", "Mất kết nối."); }, ID_A)).status, "error");
  assert.match((await loadKanjiDetail(async () => { throw new ApiError("configuration_error", 0, "configuration_error", "x"); }, ID_A) as { message: string }).message, /Chưa cấu hình/);

  // Retry after error succeeds.
  let calls = 0;
  const flaky = async () => { calls += 1; if (calls === 1) throw new ApiError("network_error", 0, "network_error", "Mất kết nối."); return detailDto(); };
  assert.equal((await loadKanjiDetail(flaky, ID_A)).status, "error");
  assert.equal((await loadKanjiDetail(flaky, ID_A)).status, "success");

  await assert.rejects(loadKanjiDetail(async () => { throw new ApiError("cancelled", 0, "cancelled", "c"); }, ID_A), (e: unknown) => e instanceof ApiError && e.category === "cancelled");
});

test("detail mapping: related vocabulary and examples keep reading segments; empty strings are dropped, not invented", () => {
  const entry = detailOf({ ...withWords, meaningVi: "" });
  assert.equal(entry.meaningVi, null);
  assert.equal(entry.relatedVocabulary.length, 1, "a word without a surface is not rendered");
  const word = entry.relatedVocabulary[0];
  assert.deepEqual([word.surface, word.reading, word.glossVi], ["日本", "にほん", "Nhật Bản"]);
  assert.deepEqual(word.examples[0].segments, [{ text: "日本", reading: "にほん" }, { text: "へ行きます。", reading: null }]);
  assert.equal(detailOf({ onReadings: undefined, kunReadings: undefined }).onReadings.length, 0);
  assert.equal(detailOf({ strokeOrder: METADATA_ONLY }).strokeOrderStatus, "metadata_only");
});

test("loading -> content, loading -> empty and loading -> error -> retry -> content on the list state machine", () => {
  const loading = startSearch(1);
  assert.equal(loading.status, "loading");
  assert.equal(kanjiListReducer(loading, { type: "loaded", seq: 1, append: false, page: page([full]) }).status, "ready");
  const empty = kanjiListReducer(loading, { type: "loaded", seq: 1, append: false, page: page([]) });
  assert.deepEqual([empty.status, empty.items.length], ["ready", 0]);
  const failed = kanjiListReducer(loading, { type: "failed", seq: 1, append: false, message: "Lỗi máy chủ." });
  assert.equal(failed.status, "error");
  const retry = kanjiListReducer(failed, { type: "search", seq: 2, query: "" });
  assert.equal(retry.status, "loading", "Retry goes back to the skeleton with a new request id");
  assert.equal(kanjiListReducer(retry, { type: "loaded", seq: 1, append: false, page: page([partial]) }), retry, "the superseded response is ignored");
  assert.deepEqual(kanjiListReducer(retry, { type: "loaded", seq: 2, append: false, page: page([full]) }).items.map((e) => e.id), [ID_A]);
});

test("demo flag: off by default, on only for the exact string true", () => {
  assert.equal(demoFallbackEnabled(undefined), false);
  for (const v of ["", "false", "1", "TRUE", "yes"]) assert.equal(demoFallbackEnabled(v), false);
  assert.equal(demoFallbackEnabled("true"), true);
});

test("demo flag off: an empty API result stays the honest empty state with no demo content or label", () => {
  const empty = kanjiListReducer(startSearch(1), { type: "loaded", seq: 1, append: false, page: page([]) });
  const off = withDemoFallback(empty, false);
  assert.equal(off.demo, false);
  assert.equal(off.state, empty);
  const html = renderOverview(off.state);
  assert.match(html, /Chưa có Kanji nào được xuất bản/);
  assert.doesNotMatch(html, /Dữ liệu minh họa|demo-kanji/);
});

test("demo flag on: demo appears only for a confirmed empty, unsearched result, always labelled; real data is never mixed with it", () => {
  const empty = kanjiListReducer(startSearch(1), { type: "loaded", seq: 1, append: false, page: page([]) });
  const on = withDemoFallback(empty, true);
  assert.equal(on.demo, true);
  const html = renderOverview(on.state, "", true);
  assert.match(html, /Dữ liệu minh họa/);
  assert.match(html, /không phải nội dung Kanji đã xuất bản/);
  assert.match(html, new RegExp(`href="/skills/kanji/${DEMO_KANJI[0].id}"`));
  assert.doesNotMatch(html, /Chưa có Kanji nào được xuất bản/);
  // Not replaced: loading, error, a search with no result, real items, or more pages pending.
  for (const state of [
    startSearch(1),
    kanjiListReducer(startSearch(1), { type: "failed", seq: 1, append: false, message: "x" }),
    kanjiListReducer(startSearch(1, "xyz"), { type: "loaded", seq: 1, append: false, page: page([]) }),
    kanjiListReducer(startSearch(1), { type: "loaded", seq: 1, append: false, page: page([full]) }),
    kanjiListReducer(startSearch(1), { type: "loaded", seq: 1, append: false, page: page([], "c") }),
  ]) assert.equal(withDemoFallback(state, true).demo, false);
  assert.doesNotMatch(renderOverview(withDemoFallback(kanjiListReducer(startSearch(1), { type: "loaded", seq: 1, append: false, page: page([full]) }), true).state), /Dữ liệu minh họa/);
});

test("demo detail: only with the flag, labelled; with the flag off a demo id is not found", () => {
  const { demoDetailState } = testRequire("./kanji-detail") as typeof import("./kanji-detail");
  const id = DEMO_KANJI[0].id;
  assert.equal(demoDetailState(id, false), null, "flag off: the id goes to the API, which answers not found");
  assert.equal(demoDetailState(ID_A, true), null, "real ids always go to the API");
  const state = demoDetailState(id, true)!;
  assert.equal(state.status, "success");
  assert.match(renderDetail(state), /Dữ liệu minh họa/);
  assert.deepEqual(demoDetailState("demo-kanji-99", true), { status: "not-found" });
  assert.doesNotMatch(renderDetail({ status: "success", entry: detailOf() }), /Dữ liệu minh họa/);
});

test("detail: strokeOrder unavailable or metadata_only shows only a neutral note and never fetches the asset", () => {
  const unavailable = renderDetail({ status: "success", entry: detailOf() });
  assert.match(unavailable, /Chưa có hướng dẫn nét viết cho chữ này/);
  const metadata = renderDetail({ status: "success", entry: detailOf({ strokeOrder: METADATA_ONLY }) });
  assert.match(metadata, /Hướng dẫn nét viết chưa hiển thị được ở phiên bản này/);
  assert.doesNotMatch(metadata.replace(/<svg[\s\S]*?<\/svg>/g, ""), /<svg|<canvas|<img/i, "no stroke figure is rendered");
  const source = readFileSync(join(resolve(process.cwd(), "src/components/skills/kanji"), "kanji-detail.tsx"), "utf8");
  assert.doesNotMatch(source, /kanjiStrokeAsset/, "the stroke asset route is not called in this slice");
});

test("detail: related vocabulary renders with ruby reading segments only when the API provides it", () => {
  const html = renderDetail({ status: "success", entry: detailOf(withWords) });
  assert.match(html, /Từ vựng có chứa chữ này/);
  assert.match(html, /Nhật Bản/);
  assert.match(html, /<ruby>日本<rp>\(<\/rp><rt>にほん<\/rt><rp>\)<\/rp><\/ruby>/);
  assert.match(html, /へ行きます。/);
  assert.match(html, /Tôi đi Nhật\./);
  assert.doesNotMatch(renderDetail({ status: "success", entry: detailOf() }), /Từ vựng có chứa chữ này/, "no empty vocabulary section");
});

test("overview: loading, error, empty and no-results are four distinct states", () => {
  const loading = renderOverview(INITIAL_LIST_STATE);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Đang tải danh sách Kanji/);
  assert.doesNotMatch(loading, /role="alert"/);

  const error = renderOverview(kanjiListReducer(startSearch(1), { type: "failed", seq: 1, append: false, message: "Dịch vụ tạm thời gián đoạn." }));
  assert.match(error, /role="alert"/);
  assert.match(error, /Dịch vụ tạm thời gián đoạn\./);
  assert.match(error, /Thử lại/);

  const empty = renderOverview(kanjiListReducer(startSearch(1), { type: "loaded", seq: 1, append: false, page: page([]) }));
  assert.match(empty, /Chưa có Kanji nào được xuất bản/);
  assert.doesNotMatch(empty, /Không tìm thấy chữ Kanji nào/);
  assert.doesNotMatch(empty, /aria-busy/);

  const none = renderOverview(kanjiListReducer(startSearch(1, "xyz"), { type: "loaded", seq: 1, append: false, page: page([]) }), "xyz");
  assert.match(none, /Không tìm thấy chữ Kanji nào/);
  assert.match(none, /xyz/);
  assert.match(none, /Xóa tìm kiếm/);
  assert.doesNotMatch(none, /Chưa có Kanji nào được xuất bản/);
});

test("overview: cards link to the canonical UUID, show only glyph and meaning", () => {
  const ready = kanjiListReducer(startSearch(1), { type: "loaded", seq: 1, append: false, page: page([full, partial], "next") });
  const html = renderOverview(ready);
  assert.match(html, new RegExp(`href="/skills/kanji/${ID_A}"`));
  assert.match(html, new RegExp(`href="/skills/kanji/${ID_B}"`));
  assert.match(html, /ngày, mặt trời/);
  assert.doesNotMatch(html, /On: |Kun: |ニチ|ジツ/, "readings are not shown on the list");
  const cards = html.slice(html.indexOf('aria-label="Danh sách Kanji"'));
  assert.doesNotMatch(cards, /On|Kun|Hán Việt|JLPT|minh họa/, "no technical terms or invented fields on cards");
  assert.match(cards, /<span class="glyph" lang="ja" aria-hidden="true">日<\/span>/);
  assert.match(html, /Đã tải 2 chữ Kanji · còn nội dung khác/, "a loaded count, not a total");
  assert.match(html, /Tải thêm/);
  assert.doesNotMatch(html, /tổng/i);
});

test("overview: no Load more at the end of the dataset; a failed append keeps items and offers retry", () => {
  const end = renderOverview(kanjiListReducer(startSearch(1), { type: "loaded", seq: 1, append: false, page: page([full], null) }));
  assert.doesNotMatch(end, /Tải thêm/);
  assert.doesNotMatch(end, /còn nội dung khác/);

  let s = kanjiListReducer(startSearch(1), { type: "loaded", seq: 1, append: false, page: page([full], "c") });
  s = kanjiListReducer(s, { type: "more", seq: 1 });
  assert.match(renderOverview(s), /disabled=""[^>]*aria-busy="true"|aria-busy="true"[^>]*disabled=""/);
  s = kanjiListReducer(s, { type: "failed", seq: 1, append: true, message: "Mất kết nối." });
  const html = renderOverview(s);
  assert.match(html, /role="alert"[^>]*>Mất kết nối\./);
  assert.match(html, /Thử tải lại/);
  assert.match(html, new RegExp(ID_A));
});

test("keyboard and semantics: native links and buttons, labelled search, breadcrumb landmark", () => {
  const html = renderOverview(kanjiListReducer(startSearch(1), { type: "loaded", seq: 1, append: false, page: page([full], "c") }), "x");
  assert.match(html, /<nav aria-label="Breadcrumb"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /<h1[^>]*>Kanji<\/h1>/);
  assert.match(html, /<input type="search"[^>]*aria-label="Tìm kiếm Kanji"/);
  assert.match(html, /<ul[^>]*aria-label="Danh sách Kanji"/);
  assert.match(html, /<a [^>]*href="\/skills\/kanji\//, "cards are real links, reachable and activatable from the keyboard");
  assert.match(html, /<button type="button"[^>]*aria-label="Xóa tìm kiếm"/);
  assert.doesNotMatch(html, /tabindex|tabIndex|onClick=/i, "no custom focus management or click-only handlers");
});

test("detail: success shows glyph, meaning and both readings; missing groups show an honest note", () => {
  const html = renderDetail({ status: "success", entry: detailOf() });
  assert.match(html, /<h1[^>]*lang="ja"[^>]*>日<\/h1>/);
  assert.match(html, /ngày, mặt trời/);
  assert.match(html, /Cách đọc theo âm Hán/);
  assert.match(html, /Cách đọc theo tiếng Nhật/);
  assert.match(html, /<li>ニチ<\/li><li>ジツ<\/li>/);
  assert.match(html, /<li>ひ<\/li><li>か<\/li>/);
  assert.match(html, /href="\/skills\/kanji"/, "back to the overview");
  assert.doesNotMatch(html, /Chưa có dữ liệu/);

  const sparse = renderDetail({ status: "success", entry: detailOf({ id: ID_C, glyph: "火", meaningVi: "", onReadings: undefined, kunReadings: undefined }) });
  assert.match(sparse, /火/);
  assert.match(sparse, /Chưa có dữ liệu cách đọc cho chữ này/);
  assert.doesNotMatch(sparse, /Cách đọc theo âm Hán/, "no empty reading cards when the API sent none");
  const onlyOn = renderDetail({ status: "success", entry: detailOf({ id: ID_C, glyph: "火", meaningVi: "lửa", onReadings: ["カ"], kunReadings: undefined }) });
  assert.match(onlyOn, /<li>カ<\/li>/);
  assert.equal((onlyOn.match(/Chưa có dữ liệu cho cách đọc này/g) ?? []).length, 1, "the missing group is stated honestly, nothing is invented");
  assert.match(sparse, /Chưa có nghĩa tiếng Việt/);
  assert.doesNotMatch(sparse.replace(/<svg[\s\S]*?<\/svg>/g, ""), /Hán Việt|JLPT|Thứ tự nét|Từ vựng có chứa|Ví dụ trong câu|Sắp có|Đang biên soạn|Flashcards|Ôn tập/i, "no sections for data or routes that do not exist");
});

test("detail: loading, not-found and error are distinct and always offer a way back", () => {
  const loading = renderDetail(DETAIL_LOADING);
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Đang tải chữ Kanji/);

  const notFound = renderDetail({ status: "not-found" });
  assert.match(notFound, /Không tìm thấy chữ Kanji/);
  assert.doesNotMatch(notFound, /role="alert"/);
  assert.match(notFound, /Về danh sách Kanji/);

  const error = renderDetail({ status: "error", message: "Mất kết nối." });
  assert.match(error, /role="alert"/);
  assert.match(error, /Thử lại/);
  assert.match(error, /Quay lại danh sách Kanji/);
});

test("routing: Kanji has its own static routes and is no longer generated by the legacy [category] route", () => {
  const app = resolve(process.cwd(), "src/app/skills");
  assert.ok(existsSync(join(app, "kanji", "page.tsx")));
  assert.ok(existsSync(join(app, "kanji", "[itemId]", "page.tsx")));
  const category = readFileSync(join(app, "[category]", "page.tsx"), "utf8");
  assert.match(category, /c\.key !== "kanji"/);
  const { SKILL_CATEGORIES } = testRequire("../shared/skills-categories") as typeof import("../shared/skills-categories");
  const generated = SKILL_CATEGORIES.filter((c) => c.key !== "kana" && c.key !== "vocabulary" && c.key !== "grammar" && c.key !== "kanji").map((c) => c.key);
  assert.ok(!generated.includes("kanji"));
  for (const key of ["listening", "speaking", "reading", "writing", "flashcards"] as const) assert.ok(generated.includes(key), `${key} still served by [category]`);
  const detailPage = readFileSync(join(app, "kanji", "[itemId]", "page.tsx"), "utf8");
  assert.match(detailPage, /params: Promise</, "Next.js 16 async params");
});

test("overview: first-time guide explains Kanji, multiple readings and how to start, and is a keyboard-operable toggle", () => {
  const html = renderOverview(kanjiListReducer(startSearch(1), { type: "loaded", seq: 1, append: false, page: page([full]) }));
  assert.match(html, /Lần đầu học Kanji\?/);
  assert.match(html, /<button type="button"[^>]*aria-expanded="true"[^>]*aria-controls=/, "native button, open by default for newcomers");
  assert.match(html, /Kanji là gì\?/);
  assert.match(html, /Vì sao một chữ có nhiều cách đọc\?/);
  assert.match(html, /Người mới nên học thế nào\?/);
  assert.match(html, /Học từng chữ một/);
  assert.doesNotMatch(html, /tabindex|tabIndex/i);
  const { KanjiIntro } = testRequire("./kanji-intro") as typeof import("./kanji-intro");
  const closed = renderToStaticMarkup(<KanjiIntro defaultOpen={false} />);
  assert.match(closed, /aria-expanded="false"/);
  assert.doesNotMatch(closed, /Kanji là gì\?/, "collapsed content is not rendered");
  assert.match(renderOverview(INITIAL_LIST_STATE), /Lần đầu học Kanji\?/, "the guide is also there while loading");
});

test("overview: page description uses plain Vietnamese before technical terms", () => {
  const html = renderOverview(INITIAL_LIST_STATE);
  assert.match(html, /Kanji là chữ Hán trong tiếng Nhật\. Chọn một chữ/);
  const description = html.slice(html.indexOf("Kanji là chữ Hán trong tiếng Nhật."), html.indexOf("</p>", html.indexOf("Kanji là chữ Hán trong tiếng Nhật.")));
  assert.doesNotMatch(description, /On'yomi|Kun'yomi/);
});

test("detail: three steps in learning order with plain labels, terms behind LearningTerm and a way to continue", () => {
  const html = renderDetail({ status: "success", entry: detailOf() });
  const i1 = html.indexOf("Nhận biết chữ");
  const i2 = html.indexOf("Hiểu cách đọc");
  const i3 = html.indexOf("Tiếp tục học");
  assert.ok(i1 > 0 && i2 > i1 && i3 > i2, "steps appear in order");
  assert.ok(html.indexOf("Cách đọc theo âm Hán") > i2 && html.indexOf("Cách đọc theo tiếng Nhật") > i2);
  assert.match(html, /<button type="button"[^>]*aria-expanded="false"[^>]*>On&#x27;yomi<\/button>/);
  assert.match(html, /<button type="button"[^>]*aria-expanded="false"[^>]*>Kun&#x27;yomi<\/button>/);
  assert.match(html, /<button type="button"[^>]*aria-expanded="false"[^>]*>Furigana<\/button>/);
  assert.match(html, /xu hướng thường gặp, không phải quy tắc tuyệt đối/);
  assert.match(html, /<a [^>]*href="\/skills\/kanji"[^>]*>Học chữ Kanji khác<\/a>/);
  assert.doesNotMatch(html, /<button[^>]*disabled/, "no disabled placeholder buttons");
});

test("overview: a Kanji without a Vietnamese meaning never shows an empty meaning area (QA fixture 火 regression)", () => {
  // Cause: the fixture sent no meaningVi (and no displayTextVi); the adapter correctly maps that to null and the card
  // used to render nothing in the meaning area. The card now states the absence in plain words; nothing is invented.
  const noMeaning = kanji(ID_C, { glyph: "火", onReadings: ["カ"] });
  assert.equal(toKanjiEntry(noMeaning)?.meaningVi, null);
  const html = renderOverview(kanjiListReducer(startSearch(1), { type: "loaded", seq: 1, append: false, page: page([noMeaning, full]) }));
  const card = html.slice(html.indexOf(ID_C));
  assert.match(card.slice(0, card.indexOf("</li>")), /<span class="meaningMissing">Chưa có nghĩa tiếng Việt<\/span>/);
  assert.doesNotMatch(card.slice(0, card.indexOf("</li>")), /class="meaning"/);
  const withMeaning = html.slice(html.indexOf(ID_A));
  assert.doesNotMatch(withMeaning.slice(0, withMeaning.indexOf("</li>")), /meaningMissing/, "a card with a meaning is unchanged");
});

test("overview guide: clear 富士山 and 山 examples, tendency wording, still collapsible", () => {
  const html = renderOverview(INITIAL_LIST_STATE);
  assert.match(html, /富士山（ふじさん）<\/span>— núi Phú Sĩ/);
  assert.match(html, /山（やま）<\/span>— núi/);
  assert.match(html, /xu hướng thường gặp, không phải quy tắc tuyệt đối/);
  assert.match(html, /có thể mang một hoặc nhiều ý nghĩa, tùy vào cách sử dụng/);
  assert.match(html, /aria-expanded="true"/);
});
