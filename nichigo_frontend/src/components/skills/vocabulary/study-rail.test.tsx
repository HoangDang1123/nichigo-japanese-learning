import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VOCABULARY_WORDS, getTopicWords } from "./vocabulary-data";
import { createSession, sessionReducer } from "./vocabulary-logic";

// Same Node-runner shims as quiz-runner.test.tsx: "@/..." alias and CSS Modules (class names echo their keys).
const ROOT = join(__dirname, "..", "..", "..");
const STUB = join(__dirname, "study-rail-stub.module.css");
writeFileSync(STUB, "");
type Resolver = { _resolveFilename: (...a: unknown[]) => string };
const originalResolve = (Module as unknown as Resolver)._resolveFilename;
(Module as unknown as Resolver)._resolveFilename = function (request: unknown, ...rest: unknown[]) {
  let req = String(request);
  if (req.startsWith("@/")) req = join(ROOT, req.slice(2));
  if (req.endsWith(".css")) req = STUB;
  return originalResolve.call(this, req, ...rest);
};
const testRequire = createRequire(__filename);
testRequire.extensions[".css"] = (module) => {
  module.exports = new Proxy({}, { get: (_t, key) => (key === "__esModule" ? false : String(key)) });
};

const SRC = join(__dirname, "..", "..", "..", "..", "src", "components", "skills", "vocabulary");
const read = (f: string) => readFileSync(join(SRC, f), "utf8");

function renderStudy(steps: number) {
  const { VocabularyProvider } = testRequire("./vocabulary-provider") as typeof import("./vocabulary-provider");
  const { StudySessionView } = testRequire("./study-session") as typeof import("./study-session");
  let session = createSession("school", getTopicWords("school").map((w) => w.id), "not-required");
  for (let i = 0; i < steps; i++) session = sessionReducer(session, { type: "next" });
  const back = sessionReducer(sessionReducer(session, { type: "prev" }), { type: "prev" }); // current < furthest
  return renderToStaticMarkup(
    <VocabularyProvider>
      <StudySessionView session={steps > 2 ? back : session} onExit={() => {}} />
    </VocabularyProvider>
  );
}

function railRows(html: string) {
  const aside = html.slice(html.indexOf("<aside"), html.indexOf("</aside>"));
  return [...aside.matchAll(/<li [^>]*>(.*?)<\/li>/g)].map((m) => m[1]);
}

test("study sidebar: every row has the same three columns (word, meaning, status) in order", () => {
  const rows = railRows(renderStudy(0));
  assert.equal(rows.length, 10);
  for (const row of rows) {
    const cols = [...row.matchAll(/data-col="(word|meaning|status)"/g)].map((m) => m[1]);
    assert.deepEqual(cols, ["word", "meaning", "status"]);
  }
});

test("study sidebar: upcoming rows show only 'Từ N' and 'Chưa mở' - no Japanese, meaning or labels", () => {
  const words = getTopicWords("school");
  const rows = railRows(renderStudy(0));
  assert.match(rows[0], /学校/); // current
  assert.match(rows[0], /Đang xem/);
  rows.slice(1).forEach((row, i) => {
    assert.match(row, new RegExp(`Từ ${i + 2}<`));
    assert.match(row, /Chưa mở/);
    assert.doesNotMatch(row, /lang="ja"|aria-label|title=/);
    const text = row.replace(/<[^>]+>/g, "");
    assert.equal(text.replace(/\s+/g, " ").trim(), `Từ ${i + 2} Chưa mở`);
    assert.ok(!text.includes(words[i + 1].surface) && !text.includes(words[i + 1].meaningVi));
  });
  // Nothing from the hidden words appears anywhere in the sidebar markup.
  const aside = renderStudy(0);
  const sidebar = aside.slice(aside.indexOf("<aside"), aside.indexOf("</aside>"));
  for (const w of words.slice(1, 10)) assert.ok(!sidebar.includes(w.meaningVi) && !sidebar.includes(w.surface), w.surface);
});

test("study sidebar: visited words keep Japanese, meaning and status; current is highlighted", () => {
  const html = renderStudy(3); // furthest = 3, current = 1 after two 'prev'
  const rows = railRows(html);
  const words = getTopicWords("school");
  assert.match(rows[0], /学校/);
  assert.match(rows[0], new RegExp(words[0].meaningVi));
  assert.match(rows[0], /stateBadge/);
  assert.match(html, /class="railItem railItemCurrent" aria-current="step"/);
  assert.match(rows[1], /Đang xem/); // current word: no meaning in the sidebar
  assert.match(rows[3], new RegExp(words[3].meaningVi)); // visited ahead of the current word stays visible
  assert.match(rows[4], /Chưa mở/);
});

test("study sidebar CSS: explicit grid columns with subgrid rows, wrapping meaning, stable status", () => {
  const css = read("vocabulary.module.css");
  assert.match(css, /\.railList \{[^}]*grid-template-columns: fit-content\([^)]*\) minmax\(0, 1fr\) 4\.75rem/);
  assert.match(css, /\.railItem \{[^}]*grid-template-columns: subgrid; grid-column: 1 \/ -1/);
  assert.doesNotMatch(css, /\.railVi \{[^}]*(text-overflow|white-space: nowrap)/);
  assert.match(css, /\.railVi \{[^}]*overflow-wrap: anywhere/);
});

test("example reading: toggle is collapsed by default for words with curated romaji", () => {
  const { ExampleBlock } = testRequire("./vocabulary-parts") as typeof import("./vocabulary-parts");
  const word = VOCABULARY_WORDS.find((w) => w.id === "greetings-03")!;
  assert.equal(word.exampleRomaji, "Minasan, konbanwa.");
  const html = renderToStaticMarkup(<ExampleBlock word={word} />);
  assert.match(html, /<button type="button" class="readingToggle" aria-expanded="false">/);
  assert.match(html, /Hiện cách đọc/);
  assert.doesNotMatch(html, /Minasan|exampleRomaji/); // not rendered while hidden
  assert.match(html, /皆さん、こんばんは。/);
  assert.match(html, /Chào buổi tối mọi người\./);
  // order when shown is enforced in markup: Japanese, rōmaji, Vietnamese
  const src = read("vocabulary-parts.tsx");
  assert.ok(src.indexOf("exampleJa}") < src.indexOf("exampleRomaji}</p>"));
  assert.ok(src.indexOf("exampleRomaji}</p>") < src.indexOf("exampleVi}"));
});

test("example reading: no curated data -> no toggle and no romaji line", () => {
  const { ExampleBlock } = testRequire("./vocabulary-parts") as typeof import("./vocabulary-parts");
  const word = VOCABULARY_WORDS.find((w) => w.id === "greetings-01")!; // kanji name in the sentence: not curated
  assert.equal(word.exampleRomaji, undefined);
  const html = renderToStaticMarkup(<ExampleBlock word={word} />);
  assert.doesNotMatch(html, /<button|Hiện cách đọc|aria-expanded|exampleRomaji/);
});

test("example reading: state resets when the word changes (callers key by word id)", () => {
  assert.match(read("study-session.tsx"), /<ExampleBlock key=\{word\.id\} word=\{word\} \/>/);
  assert.match(read("word-browser.tsx"), /<ExampleBlock key=\{selected\.id\} word=\{selected\} \/>/);
  const parts = read("vocabulary-parts.tsx");
  assert.match(parts, /aria-expanded=\{showReading\}/);
  assert.match(parts, /useState\(false\)/);
});

test("curated example romaji: small set, Latin only, never invented for missing words", () => {
  const withReading = VOCABULARY_WORDS.filter((w) => w.exampleRomaji);
  assert.ok(withReading.length > 0 && withReading.length <= 12);
  for (const w of withReading) {
    assert.match(w.exampleRomaji!, /^[A-Za-zāīūēō ,.\-?!]+$/, w.id); // Latin letters, macrons, punctuation
    assert.doesNotMatch(w.exampleRomaji!, /\/|\[|\]/); // no phonemic slashes or phonetic brackets
    const sentences = (w.exampleJa.match(/[。？！]/g) ?? []).length;
    const latin = (w.exampleRomaji!.match(/[.?!]/g) ?? []).length;
    assert.equal(latin, sentences, `${w.id}: sentence count differs`);
  }
  assert.ok(VOCABULARY_WORDS.some((w) => !w.exampleRomaji)); // not bulk-generated
});

test("romaji styling convention: italic secondary text in Vocabulary, no slashes or brackets", () => {
  const css = read("vocabulary.module.css");
  for (const cls of ["romaji", "resultRomaji", "exampleRomaji"]) {
    const rule = css.match(new RegExp(`\\.${cls} \\{[^}]*\\}`))?.[0] ?? "";
    assert.match(rule, /font-style: italic/, cls);
    assert.match(rule, /color: var\(--color-text-(muted|subtle)\)/, cls);
    assert.doesNotMatch(rule, /font-family: var\(--font-japanese/, cls);
  }
  for (const f of ["vocabulary-parts.tsx", "word-browser.tsx", "study-session.tsx"]) {
    assert.doesNotMatch(read(f), /\/\{[^}]*romaji[^}]*\}\/|\[\{[^}]*romaji[^}]*\}\]/i, f);
  }
});
