import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { KANA_CELLS, findCell } from "./kana-chart-data";

// CSS Modules are not bundled by the Node test runner; stub them with empty files.
const testRequire = createRequire(__filename);
testRequire.extensions[".css"] = (module) => {
  module.exports = new Proxy({}, { get: (_target, key) => (key === "__esModule" ? false : String(key)) });
};
writeFileSync(join(__dirname, "kana-drawer.module.css"), "");

test("KANA-DRAWER: compact header — glyph + romaji as the heading, no title, no metadata, no decoration", async () => {
  const { KanaDrawer } = await import("./kana-drawer");
  const cell = findCell("hiragana", "basic:s:i")!;
  const html = renderToStaticMarkup(<KanaDrawer cell={cell} id="d" mode="docked" onClose={() => {}} />);
  assert.match(html, /role="complementary"/);
  assert.match(html, /aria-labelledby="d-heading"/);
  // the heading IS the framed kana + its romaji (so the dialog/aside keeps an accessible name)
  assert.match(html, /<h2 id="d-heading"[^>]*>.*lang="ja">し<\/span>.*>shi<\/span><\/span><\/h2>/);
  // ONE frame holds the glyph with the romaji directly underneath (glyph first, romaji second, both inside)
  assert.match(html, /<span class="bigPlaque" data-kana-frame=""><span class="bigGlyph[^"]*"[^>]*>し<\/span><span class="reading[^"]*">shi<\/span><\/span><\/h2>/);
  assert.doesNotMatch(html, /Chi tiết chữ/);
  assert.doesNotMatch(html, /Nhóm âm|Hàng |Âm cơ bản|<dl|<dt/);
  assert.doesNotMatch(html, />Romaji<|exampleReading|romajiLabel|romajiValue|Từ ví dụ mẫu|Từ mượn ví dụ/); // no badge / label
  assert.doesNotMatch(html, /data-slot=|<img/); // no decorative seigaiha panel / illustration unless supplied
  assert.match(html, /aria-label="Hướng dẫn viết chữ し: 1 nét/);
  assert.match(html, />1 nét</);
  assert.match(html, /aria-label="Đóng chi tiết chữ"/);
});

test("KANA-DRAWER: example is dictionary style — word, italic romaji, meaning on three separate lines", async () => {
  const { KanaDrawer } = await import("./kana-drawer");
  const cell = findCell("hiragana", "basic:s:i")!;
  const html = renderToStaticMarkup(<KanaDrawer cell={cell} id="d" mode="docked" onClose={() => {}} />);
  assert.match(html, /<section[^>]*aria-label="Từ ví dụ"/);
  // exactly three sibling block elements, in order: word -> romaji -> meaning
  assert.match(
    html,
    /<div class="exampleWord" lang="ja">しろ<\/div><div class="exampleRomaji">shiro<\/div><div class="exampleMeaning">màu trắng<\/div>/,
  );
  // verified data only; no brackets/slashes/IPA, no badge/chip/pill, no label
  assert.doesNotMatch(html, /\[shiro\]|\/shiro\/|IPA|exampleReading|romajiValue|romajiLabel|>Romaji<|Từ ví dụ mẫu/);
  assert.doesNotMatch(html, /•/);
});

test("KANA-DRAWER: example romaji is omitted (never invented) when the verified data has none", async () => {
  const { KanaDrawer } = await import("./kana-drawer");
  const base = findCell("hiragana", "basic:s:i")!;
  const noReading = { ...base, example: { ...base.example!, reading: "" } };
  const html = renderToStaticMarkup(<KanaDrawer cell={noReading} id="d" mode="docked" onClose={() => {}} />);
  assert.match(html, /<div class="exampleWord" lang="ja">しろ<\/div><div class="exampleMeaning">màu trắng<\/div>/);
  assert.doesNotMatch(html, /exampleRomaji|shiro/);
});

test("KANA-DRAWER: every verified example with a reading renders it on its own line", async () => {
  const { KanaDrawer } = await import("./kana-drawer");
  for (const script of ["hiragana", "katakana"] as const) {
    for (const cell of KANA_CELLS[script].filter((c) => c.example)) {
      const html = renderToStaticMarkup(<KanaDrawer cell={cell} id="d" mode="docked" onClose={() => {}} />);
      const ex = cell.example!;
      assert.ok(html.includes(`<div class="exampleRomaji">${ex.reading}</div>`) === Boolean(ex.reading), cell.glyph);
      assert.ok(html.indexOf("exampleWord") < html.indexOf("exampleMeaning"));
    }
  }
});

test("KANA-DRAWER: sound button is a disabled placeholder with accessible text — no audio wiring", async () => {
  const { KanaDrawer } = await import("./kana-drawer");
  const cell = findCell("hiragana", "basic:k:o")!;
  const html = renderToStaticMarkup(<KanaDrawer cell={cell} id="d" mode="sheet" onClose={() => {}} />);
  const sound = html.match(/<button[^>]*data-feature="pronunciation-coming-soon"[^>]*>/)![0];
  assert.match(sound, /disabled=""/);
  assert.match(sound, /aria-label="Phát âm — sắp ra mắt"/);
  assert.match(sound, /type="button"/);
  assert.doesNotMatch(sound, /onClick|href/);
  assert.doesNotMatch(html, /<audio|<source|speechSynthesis/);
  // the sound button precedes the close button inside the same actions group
  assert.ok(html.indexOf("pronunciation-coming-soon") < html.indexOf('aria-label="Đóng chi tiết chữ"'));
  assert.match(html, /<h2 id="d-heading"[^>]*>.*>ko<\/span><\/span><\/h2>/);
});

test("KANA-DRAWER: contracted kana show the combined glyph + reading and keep the two-grid presentation", async () => {
  const { KanaDrawer } = await import("./kana-drawer");
  const cell = findCell("katakana", "yoon:s:ya")!;
  const html = renderToStaticMarkup(<KanaDrawer cell={cell} id="d" mode="sheet" onClose={() => {}} />);
  assert.match(html, /role="dialog"/);
  assert.match(html, /bigGlyphCompact/); // smaller glyph so two characters fit beside the buttons
  assert.match(html, /<span class="bigGlyph bigGlyphCompact" lang="ja">シャ<\/span><span class="reading[^"]*">sha<\/span><\/span><\/h2>/); // inside the same frame
  assert.match(html, /data-stroke-composite/);
  assert.equal((html.match(/data-stroke-guidance="verified"/g) ?? []).length, 2);
  // no verified example for this contracted sound: honest unavailable state
  assert.match(html, /Chưa có từ ví dụ đã được xác minh/);
});

test("KANA-DRAWER: docked drawer with no selection shows a short prompt, no decoration", async () => {
  const { KanaDrawer } = await import("./kana-drawer");
  const html = renderToStaticMarkup(<KanaDrawer cell={null} id="d" mode="docked" onClose={() => {}} />);
  assert.match(html, /Chọn một chữ/);
  assert.match(html, /aria-labelledby="d-heading"/);
  assert.doesNotMatch(html, /data-slot=|Đóng chi tiết chữ|pronunciation-coming-soon/);
});

test("KANA-DRAWER: a supplied illustration renders in the optional slot", async () => {
  const { KanaDrawer } = await import("./kana-drawer");
  const cell = findCell("hiragana", "basic:k:a")!;
  const html = renderToStaticMarkup(
    <KanaDrawer cell={cell} id="d" mode="docked" onClose={() => {}} illustration={{ src: "/x.png", alt: "Minh họa" }} />,
  );
  assert.match(html, /<img[^>]+src="\/x.png"[^>]+alt="Minh họa"/);
});
