import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GLOSSARY, TERM_IDS, getTerm } from "./glossary";
import { POPOVER_MARGIN, POPOVER_MAX_WIDTH, placePopover } from "./popover-position";

// CSS Modules are not resolvable by the Node test runner; classes are mapped to their own names (same approach as kanji.test.tsx).
type ModuleInternals = { _load: (...a: unknown[]) => unknown };
const internals = Module as unknown as ModuleInternals;
const originalLoad = internals._load;
const classNameProxy = new Proxy({}, { get: (_t, key) => (key === "__esModule" ? false : String(key)) });
internals._load = function (request: unknown, ...rest: unknown[]) {
  if (String(request).endsWith(".css")) return classNameProxy;
  return originalLoad.call(this, request, ...rest);
};
const testRequire = createRequire(__filename);
const { LearningTerm } = testRequire("./learning-term") as typeof import("./learning-term");

test("glossary: the six required terms exist and every entry is complete", () => {
  assert.deepEqual([...TERM_IDS].sort(), ["dakuten", "furigana", "handakuten", "kanji", "kunyomi", "onyomi"]);
  for (const id of TERM_IDS) {
    const t = GLOSSARY[id];
    assert.equal(t.id, id, "key matches id");
    for (const field of [t.labelVi, t.ja, t.jaReading, t.explanationVi, t.example.ja, t.example.noteVi]) assert.ok(field.trim().length > 0, `${id} has no empty field`);
    assert.ok(t.explanationVi.length <= 220, `${id}: explanation stays short`);
    assert.ok(/[぀-ヿ一-鿿]/.test(t.ja), `${id}: Japanese term is Japanese`);
    assert.ok(/^[぀-ゟ]+$/.test(t.jaReading), `${id}: reading is hiragana`);
    assert.equal(getTerm(id), t);
  }
  assert.equal(new Set(TERM_IDS.map((id) => GLOSSARY[id].explanationVi)).size, TERM_IDS.length, "no duplicated explanations");
});

test("glossary: review metadata is complete for every reviewed entry and the Kanji wording is the approved one", () => {
  for (const id of TERM_IDS) {
    const r = GLOSSARY[id].review;
    if (r.status === "reviewed") {
      assert.ok(r.reviewedBy.trim(), `${id}: reviewer named`);
      assert.match(r.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${id}: ISO date`);
      assert.ok(!Number.isNaN(Date.parse(r.reviewedAt)), `${id}: real date`);
    }
  }
  assert.deepEqual(TERM_IDS.filter((id) => GLOSSARY[id].review.status !== "reviewed"), [], "all six entries were approved by the Product Owner on 2026-11-18");
  assert.equal(
    GLOSSARY.kanji.explanationVi,
    "Kanji là chữ Hán được dùng trong tiếng Nhật. Mỗi chữ Kanji có thể mang một hoặc nhiều ý nghĩa, tùy vào cách sử dụng.",
  );
});

test("glossary: examples are the ones verified in the design (readings and sound changes)", () => {
  assert.match(GLOSSARY.onyomi.example.noteVi, /富士山.*ふじさん.*山.*さん/);
  assert.match(GLOSSARY.kunyomi.example.noteVi, /山.*やま/);
  assert.deepEqual(GLOSSARY.furigana.example.ruby, { base: "山", reading: "やま" });
  assert.match(GLOSSARY.dakuten.example.noteVi, /か.*゛.*が/);
  assert.match(GLOSSARY.handakuten.example.noteVi, /は.*゜.*ぱ/);
  assert.match(GLOSSARY.dakuten.explanationVi, /tenten/i);
  assert.match(GLOSSARY.handakuten.explanationVi, /maru/i);
});

test("LearningTerm: closed by default, a native button that exposes its state and never relies on hover", () => {
  const html = renderToStaticMarkup(<LearningTerm term="onyomi">On&apos;yomi</LearningTerm>);
  assert.match(html, /<button type="button"[^>]*aria-expanded="false"[^>]*aria-controls="[^"]+"[^>]*>On&#x27;yomi<\/button>|<button type="button"[^>]*aria-controls="[^"]+"[^>]*aria-expanded="false"[^>]*>/);
  assert.doesNotMatch(html, /role="group"/, "explanation is not rendered until opened");
  assert.doesNotMatch(html, /onMouse|onmouse|tabindex/i, "no hover handlers or custom tab stops");
  assert.match(renderToStaticMarkup(<LearningTerm term="furigana" />), />Furigana<\/button>/, "default label comes from the glossary");
});

test("LearningTerm: the open panel shows the Vietnamese explanation, Japanese term and example, and has a close button", () => {
  for (const id of TERM_IDS) {
    const t = GLOSSARY[id];
    const html = renderToStaticMarkup(<LearningTerm term={id} initialOpen />);
    assert.match(html, /aria-expanded="true"/);
    assert.match(html, /role="group"/);
    const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");
    assert.ok(html.includes(`aria-label="Giải thích: ${esc(t.labelVi)}"`), `${id}: labelled region`);
    assert.ok(html.includes(esc(t.explanationVi)), `${id}: explanation shown`);
    assert.match(html, new RegExp(`lang="ja">${t.ja}（${t.jaReading}）`));
    assert.match(html, /<button type="button"[^>]*aria-label="Đóng giải thích"/);
    assert.match(html, /Ví dụ/);
  }
  assert.match(renderToStaticMarkup(<LearningTerm term="furigana" initialOpen />), /<ruby>山<rp>\(<\/rp><rt>やま<\/rt><rp>\)<\/rp><\/ruby>/);
});

test("popover placement: stays inside the viewport at 320, 390 and 1440 px, flips above near the bottom", () => {
  for (const [w, h] of [[320, 568], [390, 844], [1440, 900]] as const) {
    for (const left of [0, 40, w / 2, w - 30, w + 40]) {
      for (const top of [20, h / 2, h - 30]) {
        const p = placePopover({ left, top, right: left + 60, bottom: top + 20 }, { width: w, height: h }, 200);
        assert.ok(p.left >= POPOVER_MARGIN, `left ${p.left} at ${w}`);
        assert.ok(p.left + p.width <= w - POPOVER_MARGIN + 0.001, `right edge at ${w}`);
        assert.ok(p.width <= POPOVER_MAX_WIDTH && p.width <= w - 2 * POPOVER_MARGIN);
        assert.ok(p.top >= POPOVER_MARGIN && p.top + 200 <= h - POPOVER_MARGIN + 0.001, `vertical at ${w}x${h}`);
      }
    }
  }
  const below = placePopover({ left: 50, top: 100, right: 100, bottom: 120 }, { width: 1440, height: 900 }, 200);
  assert.equal(below.top, 128, "below the trigger when there is room");
  const flipped = placePopover({ left: 50, top: 800, right: 100, bottom: 820 }, { width: 1440, height: 900 }, 200);
  assert.equal(flipped.top, 592, "above the trigger when it would run off the bottom");
});
