import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { getTopicWords } from "./vocabulary-data";
import { buildQuestion } from "./vocabulary-logic";

// The Node test runner resolves neither "@/..." aliases nor CSS Modules: map the alias to the
// compiled output and every stylesheet to an empty stub whose class names echo their keys.
const ROOT = join(__dirname, "..", "..", "..");
const STUB = join(__dirname, "quiz-runner-stub.module.css");
writeFileSync(STUB, "");
const originalResolve = (Module as unknown as { _resolveFilename: (...a: unknown[]) => string })._resolveFilename;
(Module as unknown as { _resolveFilename: (...a: unknown[]) => string })._resolveFilename = function (request: unknown, ...rest: unknown[]) {
  let req = String(request);
  if (req.startsWith("@/")) req = join(ROOT, req.slice(2));
  if (req.endsWith(".css")) req = STUB;
  return originalResolve.call(this, req, ...rest);
};
const testRequire = createRequire(__filename);
testRequire.extensions[".css"] = (module) => {
  module.exports = new Proxy({}, { get: (_t, key) => (key === "__esModule" ? false : String(key)) });
};

function render(wordSurface: string) {
  const { QuizRunner } = testRequire("./quiz-runner") as typeof import("./quiz-runner");
  const word = getTopicWords("greetings").concat(getTopicWords("school")).find((w) => w.surface === wordSurface)!;
  return { word, html: renderToStaticMarkup(<QuizRunner questions={[buildQuestion(word)]} label="kiểm tra" />) };
}

/** Structure only: drop text and the single attribute that legitimately differs. */
const skeleton = (html: string) =>
  html.replace(/>[^<]+</g, "><").replace(/ aria-hidden="true"/g, "").replace(/ lang="ja"/g, "");

test("question prompt: kanji and kana-only words share one stable structure", () => {
  const kanji = render("学校");
  const kana = render("おはよう");
  assert.notEqual(kanji.word.surface, kanji.word.reading);
  assert.equal(kana.word.surface, kana.word.reading);
  assert.equal(skeleton(kanji.html), skeleton(kana.html));
  for (const { html } of [kanji, kana]) {
    assert.equal((html.match(/class="promptReading"/g) ?? []).length, 1); // reading slot always laid out
    assert.equal((html.match(/<button/g) ?? []).length, 4);
    assert.match(html, /<h3 id="[^"]+" class="promptBlock" tabindex="-1">/);
    assert.match(html, /role="group" aria-labelledby=/);
  }
});

test("question prompt: reading text only when it adds information; kana slot is hidden and empty", () => {
  const kanji = render("学校");
  const kana = render("おはよう");
  assert.match(kanji.html, /class="promptReading" lang="ja">がっこう<\/span>/);
  assert.match(kana.html, /class="promptReading" lang="ja" aria-hidden="true"><\/span>/);
  assert.doesNotMatch(kana.html, /おはよう<\/span><span class="promptReading"[^>]*>おはよう/); // no duplicated text
});

test("quiz runner: nothing is revealed before an answer and there is no confirm button", () => {
  const { html } = render("学校");
  assert.doesNotMatch(html, /Chính xác|Chưa đúng|đáp án đúng|choiceCorrect|choiceWrong/);
  assert.doesNotMatch(html, /Kiểm tra đáp án|Câu tiếp theo|Xem kết quả/);
  assert.doesNotMatch(html, /type="radio"/);
});

test("quiz runner source: timer is scheduled with cleanup, focus moves to the new question, correct answer is not colour-only", () => {
  const src = readFileSync(join(__dirname, "..", "..", "..", "..", "src", "components", "skills", "vocabulary", "quiz-runner.tsx"), "utf8");
  assert.match(src, /return scheduleAdvance\(\(\) => dispatch\(\{ type: "next" \}\), ANSWER_FEEDBACK_MS\)/);
  assert.match(src, /headingRef\.current\?\.focus\(\)/);
  assert.match(src, /\[state\.index\]/);
  assert.match(src, /aria-disabled=\{locked \|\| undefined\}/);
  assert.match(src, /\(đáp án đúng\)/);
  assert.match(src, /<Check /);
  const css = readFileSync(join(__dirname, "..", "..", "..", "..", "src", "components", "skills", "vocabulary", "vocabulary-quiz.module.css"), "utf8");
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*\.choice \{ transition: none; \}/);
  assert.match(css, /\.promptReading \{[^}]*min-height: calc/);
});
