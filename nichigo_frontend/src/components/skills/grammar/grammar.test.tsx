import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GRAMMAR_CATEGORIES,
  GRAMMAR_PATTERNS,
  getGrammarPattern,
  getRelatedPatterns,
} from "./grammar-data";
import { ALL_CATEGORIES, categoriesWithData, filterPatterns } from "./grammar-logic";
import type { GrammarPattern } from "./grammar-types";

// The Node test runner resolves neither "@/..." aliases nor CSS Modules. Map the alias to the
// compiled output and answer every stylesheet request in memory with a proxy whose class names
// echo their keys, so no stub file is ever written to disk.
const ROOT = join(__dirname, "..", "..", "..");
type ModuleInternals = {
  _resolveFilename: (...a: unknown[]) => string;
  _load: (...a: unknown[]) => unknown;
};
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

const find = (id: string) => getGrammarPattern(id) as GrammarPattern;

function renderDetail(pattern: GrammarPattern) {
  const { GrammarDetail } = testRequire("./grammar-detail") as typeof import("./grammar-detail");
  return renderToStaticMarkup(<GrammarDetail pattern={pattern} />);
}

function renderOverview(props: import("./grammar-overview").GrammarOverviewProps = {}) {
  const { GrammarOverview } = testRequire("./grammar-overview") as typeof import("./grammar-overview");
  return renderToStaticMarkup(<GrammarOverview {...props} />);
}

test("demo data integrity: ids, categories, examples and relations", () => {
  const categoryIds = new Set(GRAMMAR_CATEGORIES.map((c) => c.id));
  assert.ok(GRAMMAR_CATEGORIES.length >= 3);
  assert.equal(new Set(GRAMMAR_PATTERNS.map((p) => p.id)).size, GRAMMAR_PATTERNS.length);
  const exampleIds = GRAMMAR_PATTERNS.flatMap((p) => p.examples.map((e) => e.id));
  assert.equal(new Set(exampleIds).size, exampleIds.length);
  for (const p of GRAMMAR_PATTERNS) {
    assert.ok(categoryIds.has(p.categoryId), p.id);
    assert.ok(p.examples.length >= 1, p.id);
    for (const rel of p.relatedIds ?? []) assert.ok(getGrammarPattern(rel), `${p.id} -> ${rel}`);
    for (const e of p.examples) assert.ok(!e.romaji || !/[\/\[\]]/.test(e.romaji), e.id);
  }
  assert.ok(GRAMMAR_PATTERNS.some((p) => p.examples.length > 1));
  assert.ok(GRAMMAR_PATTERNS.some((p) => !p.usageNotes?.length));
  assert.ok(GRAMMAR_PATTERNS.some((p) => p.usageNotes?.length));
  assert.ok(GRAMMAR_PATTERNS.some((p) => p.examples.every((e) => !e.romaji)));
  assert.ok(GRAMMAR_PATTERNS.some((p) => p.examples.some((e) => e.romaji)));
});

test("category filtering narrows the list", () => {
  const particles = filterPatterns(GRAMMAR_PATTERNS, GRAMMAR_CATEGORIES, "particles", "");
  assert.ok(particles.length > 0);
  assert.ok(particles.every((p) => p.categoryId === "particles"));
  assert.equal(particles.length, GRAMMAR_PATTERNS.filter((p) => p.categoryId === "particles").length);
  assert.equal(filterPatterns(GRAMMAR_PATTERNS, GRAMMAR_CATEGORIES, ALL_CATEGORIES, "").length, GRAMMAR_PATTERNS.length);
});

test("search matches Japanese pattern, Vietnamese meaning (with or without diacritics) and category name", () => {
  const ids = (q: string, cat = ALL_CATEGORIES) => filterPatterns(GRAMMAR_PATTERNS, GRAMMAR_CATEGORIES, cat, q).map((p) => p.id);
  assert.ok(ids("まで").includes("kara-made"));
  assert.ok(ids("tân ngữ").includes("o-object"));
  assert.ok(ids("tan ngu").includes("o-object"));
  assert.ok(ids("trợ từ").includes("de-place"));
  assert.ok(ids("tro tu").includes("de-place"));
  assert.deepEqual(ids("zzzz-no-match"), []);
  // Search and category combine on the same dataset.
  assert.deepEqual(ids("ます", "verbs").sort(), ["masu-form"]);
  assert.deepEqual(ids("ます", "adjectives"), []);
});

test("only categories with data are offered", () => {
  const sparse = GRAMMAR_PATTERNS.filter((p) => p.categoryId === "basic");
  assert.deepEqual(categoriesWithData(GRAMMAR_CATEGORIES, sparse).map((c) => c.id), ["basic"]);
});

test("unknown grammarId resolves to nothing; relations resolve only when declared", () => {
  assert.equal(getGrammarPattern("does-not-exist"), undefined);
  assert.deepEqual(getRelatedPatterns(find("te-kudasai")), []);
  assert.ok(getRelatedPatterns(find("o-object")).some((p) => p.id === "de-place"));
});

test("overview renders heading, categories, rows linking to detail, and the demo label", () => {
  const html = renderOverview();
  assert.match(html, /<h1[^>]*>Ngữ pháp<\/h1>/);
  assert.match(html, /文法/);
  assert.match(html, /Dữ liệu minh họa, chưa được duyệt để xuất bản/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /href="\/skills"/);
  for (const p of GRAMMAR_PATTERNS) assert.ok(html.includes(`href="/skills/grammar/${p.id}"`), p.id);
  assert.doesNotMatch(html, /aria-busy/);
  assert.doesNotMatch(html, /quiz|streak|mastered/i);
});

test("overview states: empty dataset, loading, error", () => {
  const empty = renderOverview({ patterns: [] });
  assert.match(empty, /Chưa có mẫu ngữ pháp/);
  assert.doesNotMatch(empty, /type="search"/);

  const loading = renderOverview({ status: "loading" });
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Đang tải danh sách ngữ pháp/);
  assert.doesNotMatch(loading, /Chưa có mẫu ngữ pháp/);

  const error = renderOverview({ status: "error" });
  assert.match(error, /role="alert"/);
  assert.match(error, /Không thể tải ngữ pháp/);
  assert.doesNotMatch(error, /aria-busy/);
});

test("detail: full pattern shows every section in order, romaji hidden by default", () => {
  const html = renderDetail(find("n1-wa-n2-desu"));
  const order = ["Cấu trúc", "Giải thích và cách dùng", "Câu ví dụ", "Lưu ý", "Mẫu ngữ pháp liên quan"].map((t) => html.indexOf(t));
  assert.ok(order.every((i) => i >= 0), String(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(html, /Hiện cách đọc/);
  assert.doesNotMatch(html, /Watashi wa gakusei desu/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /href="\/skills\/grammar"/);
});

test("detail: no romaji means no toggle and no reading; missing notes/related sections are omitted", () => {
  const pattern = find("te-kudasai");
  assert.ok(pattern.examples.every((e) => !e.romaji));
  const html = renderDetail({ ...pattern, usageNotes: undefined, relatedIds: undefined });
  assert.doesNotMatch(html, /Hiện cách đọc/);
  assert.doesNotMatch(html, /Lưu ý/);
  assert.doesNotMatch(html, /Mẫu ngữ pháp liên quan/);
  assert.match(html, /Câu ví dụ/);
});

test("detail: optional illustration renders when present and is absent otherwise", () => {
  const base = find("o-object");
  assert.doesNotMatch(renderDetail(base), /<img/);
  const withArt: GrammarPattern = {
    ...base,
    examples: [{ ...base.examples[0], illustration: { src: "/x.png", alt: "Minh họa", caption: "Chú thích" } }],
  };
  const html = renderDetail(withArt);
  assert.match(html, /<img[^>]+alt="Minh họa"/);
  assert.match(html, /Chú thích/);
});

test("overview cards: chips without counts, card shows category, pattern, meaning and the entry's own first example", () => {
  const html = renderOverview();
  assert.equal((html.match(/aria-pressed=/g) ?? []).length, GRAMMAR_CATEGORIES.length + 1);
  assert.doesNotMatch(html, /\d+ mẫu<\/button>/);
  const first = find("n1-wa-n2-desu");
  assert.ok(html.includes(first.examples[0].ja));
  assert.ok(html.includes(first.examples[0].vi));
  assert.doesNotMatch(html, /Watashi wa gakusei/); // no romaji on cards
  assert.equal((html.match(/class="cardExample"/g) ?? []).length, GRAMMAR_PATTERNS.length);
});

test("overview card without examples renders no example area", () => {
  const bare: GrammarPattern = { ...find("o-object"), examples: [] };
  const html = renderOverview({ patterns: [bare] });
  assert.match(html, /class="cardPattern"/);
  assert.doesNotMatch(html, /cardExample/);
});
