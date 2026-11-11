import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { KANA_CELLS, findCell, type KanaChartCell, type KanaScript } from "./kana-chart-data";
import {
  KANA_STROKE_ASSET,
  KANA_STROKE_GUIDANCE,
  getCharGuidance,
  getCompositeGuidance,
  getStrokeGuidance,
  validateStrokeGuidance,
  validateStrokeGuidanceFor,
  type KanaStrokeGuidance,
} from "./kana-stroke-guidance";

const testRequire = createRequire(__filename);
testRequire.extensions[".css"] = (module) => {
  module.exports = new Proxy({}, { get: (_target, key) => (key === "__esModule" ? false : String(key)) });
};
writeFileSync(join(__dirname, "kana-drawer.module.css"), "");

const SCRIPTS: KanaScript[] = ["hiragana", "katakana"];
const SOURCE_DIR = join(process.cwd(), "src/data/kana-strokes/source/animcjk-c63765b");
const MANIFEST = JSON.parse(readFileSync(join(process.cwd(), "scripts/kana-strokes/kana-manifest.json"), "utf8")) as {
  commit: string;
  glyphs: { kanaId: string; script: KanaScript; glyph: string; kind: "cell" | "small"; expectedStrokes: number }[];
};
const SMALL = /^[ゃゅょャュョ]$/;
const allEntries = () => Object.values(KANA_STROKE_GUIDANCE);

/** Every unique character the CURRENT chart needs, per script (single cells + yōon constituents). */
function requiredChars(script: KanaScript): string[] {
  const set = new Set<string>();
  for (const c of KANA_CELLS[script]) for (const ch of [...c.glyph]) set.add(ch);
  return [...set];
}

/**
 * TEST-ONLY structural fixture for the validator/renderer. Coordinates are placeholders; this is
 * NOT stroke data and is never registered in production.
 */
function fixtureFor(kanaId: string, script: KanaScript, glyph: string): KanaStrokeGuidance {
  const p = { x: 50, y: 50 };
  return {
    kanaId,
    script,
    glyph,
    codepoint: `U+${glyph.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`,
    viewBox: { width: 100, height: 100 },
    numberSize: 8,
    arrowWidth: 1,
    assetVersion: 0,
    strokeCount: 2,
    strokes: [1, 2].map((order) => ({
      id: `${kanaId}-s${order}`,
      order,
      outline: ["M20 20L80 80L20 80Z"],
      median: "M20 20L80 80",
      numberAt: p,
      arrow: { from: p, to: { x: 60, y: 60 } },
      end: { x: 60, y: 60, dx: 1, dy: 0 },
      ending: order === 2 ? ("harai" as const) : undefined,
    })),
    endingAnnotation: { source: "TEST", reviewStatus: "reviewed" },
    source: { name: "TEST FIXTURE", copyright: "none", license: "none", licenseUrl: "https://example.invalid", url: "https://example.invalid" },
    reviewStatus: "verified",
  };
}

const allCells = () => [...KANA_CELLS.hiragana, ...KANA_CELLS.katakana];
const singleCells = () => allCells().filter((c) => [...c.glyph].length === 1);
const yoonCells = () => allCells().filter((c) => [...c.glyph].length > 1);

/* ---------------------------------------------------------------- inventory & coverage */

test("COVERAGE: manifest equals the live chart's unique-character inventory (148 = 74 per script)", () => {
  for (const script of SCRIPTS) {
    const required = requiredChars(script).sort();
    const manifest = MANIFEST.glyphs.filter((g) => g.script === script).map((g) => g.glyph).sort();
    assert.deepEqual(manifest, required, `${script} manifest matches the chart`);
    assert.equal(required.length, 74);
  }
  assert.equal(MANIFEST.glyphs.length, 148);
  assert.equal(MANIFEST.commit, "c63765b150cbd567c71d05cf4a4f8d00b57045c9");
});

test("COVERAGE: every required character has verified guidance (no missing, no extras)", () => {
  for (const script of SCRIPTS) {
    for (const ch of requiredChars(script)) {
      const g = getCharGuidance(script, ch);
      assert.ok(g, `${script} ${ch} has valid guidance`);
      assert.equal(g!.script, script);
    }
  }
  assert.equal(allEntries().length, 148);
  const report = JSON.parse(readFileSync(join(process.cwd(), "src/data/kana-strokes/coverage-report.json"), "utf8"));
  assert.deepEqual(report.summary, { required: 148, imported: 148, missing: 0, unsupported: 0 });
});

test("COVERAGE: every single-character chart cell resolves to its own guidance and validates", () => {
  for (const cell of singleCells()) {
    const g = getStrokeGuidance(cell);
    assert.ok(g, `${cell.id} (${cell.glyph})`);
    assert.equal(g!.kanaId, cell.id);
    assert.deepEqual(validateStrokeGuidance(g!, cell), []);
  }
});

test("COVERAGE: stroke counts match independent standard counts; marks count as real strokes", () => {
  for (const m of MANIFEST.glyphs) {
    const g = KANA_STROKE_GUIDANCE[m.kanaId];
    assert.ok(g, m.kanaId);
    assert.equal(g.glyph, m.glyph);
    assert.equal(g.strokeCount, m.expectedStrokes, `${m.glyph} logical strokes`);
    assert.equal(g.strokes.length, m.expectedStrokes);
  }
  for (const script of SCRIPTS) {
    for (const cell of KANA_CELLS[script].filter((c) => [...c.glyph].length === 1)) {
      const nfd = [...cell.glyph.normalize("NFD")];
      if (nfd.length < 2) continue; // not a voiced / semi-voiced kana
      const base = getCharGuidance(script, nfd[0].normalize("NFC"))!;
      const own = getCharGuidance(script, cell.glyph)!;
      // dakuten = 2 strokes, handakuten = 1 stroke, ON TOP of the base character's own strokes
      assert.equal(own.strokeCount, base.strokeCount + (nfd[1] === "゙" ? 2 : 1), `${cell.glyph} vs ${base.glyph}`);
      assert.notEqual(own.kanaId, base.kanaId, "voiced kana never reuse the base character's data");
    }
  }
});

test("COVERAGE: Unicode mapping — filename, svg id, codepoint and script all agree", () => {
  for (const g of allEntries()) {
    const cp = g.glyph.codePointAt(0)!;
    assert.equal(g.codepoint, `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`);
    const svg = readFileSync(join(SOURCE_DIR, `${cp}.svg`), "utf8");
    assert.match(svg, new RegExp(`<svg id="z${cp}" class="acjk" viewBox="0 0 1024 1024"`));
    assert.equal(g.script, /[぀-ゟ]/.test(g.glyph) ? "hiragana" : "katakana");
    assert.deepEqual(g.viewBox, { width: 1024, height: 1024 });
  }
});

test("COVERAGE: outlines, order and medians equal the vendored, unmodified AnimCJK SVGs (all 148)", () => {
  for (const g of allEntries()) {
    const cp = g.glyph.codePointAt(0)!;
    const svg = readFileSync(join(SOURCE_DIR, `${cp}.svg`), "utf8");
    assert.match(svg, /GNU\s+Lesser General Public License/);
    const outlines = [...svg.matchAll(new RegExp(`<path id="z${cp}d([0-9]+)([a-z]?)" d="([^"]+)"/>`, "g"))];
    const medians = [...svg.matchAll(new RegExp(`--d:([0-9]+)s;" pathLength="[0-9]+" clip-path="url[(]#z${cp}c([0-9]+)([a-z]?)[)]" d="([^"]+)"`, "g"))];
    assert.equal(outlines.length, medians.length, g.glyph);
    const logical = new Set(outlines.map((m) => Number(m[1])));
    assert.equal(logical.size, g.strokeCount, `${g.glyph}: split parts do not add logical strokes`);
    g.strokes.forEach((st) => {
      assert.deepEqual(st.outline, outlines.filter((m) => Number(m[1]) === st.order).map((m) => m[3]), `${g.glyph} s${st.order} outlines`);
      const firstMedian = medians.find((m) => Number(m[2]) === st.order)!;
      assert.equal(st.median, firstMedian[4], `${g.glyph} s${st.order} median`);
      assert.equal(Number(firstMedian[1]), st.order, "animation delay equals stroke order");
    });
  }
  assert.ok(KANA_STROKE_ASSET.modifications.length > 0);
  assert.doesNotMatch(JSON.stringify(KANA_STROKE_ASSET), /KanjiVG|kvg:|CC BY-SA/i);
  assert.ok(allEntries().every((g) => g.source.name === "AnimCJK" && g.source.commit === MANIFEST.commit));
});

test("COVERAGE: split outline parts stay ONE logical stroke (あ 3, の 1, and every split in the data)", () => {
  const a = KANA_STROKE_GUIDANCE["hiragana-basic-v-a"];
  assert.equal(a.strokeCount, 3);
  assert.equal(a.strokes[2].outline.length, 2);
  const no = KANA_STROKE_GUIDANCE["hiragana-basic-n-o"];
  assert.equal(no.strokeCount, 1);
  assert.equal(no.strokes[0].outline.length, 2);
  const split = allEntries().flatMap((g) => g.strokes.filter((s) => s.outline.length > 1));
  assert.ok(split.length >= 2);
});

test("COVERAGE: small kana have their own verified guidance and are not chart cells", () => {
  for (const script of SCRIPTS) {
    const small = requiredChars(script).filter((c) => SMALL.test(c));
    assert.equal(small.length, 3);
    for (const ch of small) {
      const g = getCharGuidance(script, ch)!;
      assert.match(g.kanaId, new RegExp(`^${script}-small-(ya|yu|yo)$`));
      assert.ok(!singleCells().some((c) => c.glyph === ch), "small kana are only used inside contracted sounds");
    }
  }
});

/* ---------------------------------------------------------------- single-character rendering */

test("RENDER: verified glyph draws filled outlines only — native viewBox, count, no median/dots/ticks/source text", async () => {
  const { KanaStudyGrid } = await import("./kana-study-grid");
  const cell = findCell("hiragana", "basic:v:a")!;
  const g = KANA_STROKE_GUIDANCE[cell.id];
  const html = renderToStaticMarkup(<KanaStudyGrid cell={cell} />);
  assert.match(html, /data-stroke-guidance="verified"/);
  assert.match(html, /viewBox="0 0 1024 1024"/);
  assert.match(html, />3 nét</);
  assert.doesNotMatch(html, /AnimCJK|LGPL|Dữ liệu nét viết|<a /);
  for (const st of g.strokes) {
    for (const d of st.outline) assert.ok(html.includes(`d="${d}"`), "outline drawn verbatim");
    assert.ok(!html.includes(st.median), "median path is never drawn");
  }
  assert.equal((html.match(/class="strokePath"/g) ?? []).length, 4); // 4 outline parts, 3 logical strokes
  assert.doesNotMatch(html, /<circle|stroke-dasharray|data-ending|<polyline|はらう|とめる|はねる/);
  assert.ok(html.indexOf("-s1\"") < html.indexOf("-s2\"") && html.indexOf("-s2\"") < html.indexOf("-s3\""));
});

test("RENDER: voiced kana render their own strokes including dakuten/handakuten", async () => {
  const { KanaStudyGrid } = await import("./kana-study-grid");
  const ji = KANA_CELLS.hiragana.find((c) => c.glyph === "じ")!;
  const pa = KANA_CELLS.katakana.find((c) => c.glyph === "パ")!;
  assert.match(renderToStaticMarkup(<KanaStudyGrid cell={ji} />), />3 nét</); // し 1 + ゛ 2
  assert.match(renderToStaticMarkup(<KanaStudyGrid cell={pa} />), />3 nét</); // ハ 2 + ゜ 1
  assert.equal(getStrokeGuidance(ji)!.glyph, "じ");
});

test("RENDER: numbers stay on every stroke; arrows are short and omitted (not faked) when unplaceable", () => {
  let omitted = 0, strokes = 0;
  for (const g of allEntries()) {
    for (const s of g.strokes) {
      strokes++;
      assert.ok(s.numberAt && s.start, `${g.glyph} s${s.order} keeps its number`);
      if (!s.arrow) { omitted++; continue; }
      const len = Math.hypot(s.arrow.to.x - s.arrow.from.x, s.arrow.to.y - s.arrow.from.y);
      assert.ok(len >= 47 && len <= 63, `${g.glyph} s${s.order} short arrow`);
      const mid = { x: (s.arrow.from.x + s.arrow.to.x) / 2, y: (s.arrow.from.y + s.arrow.to.y) / 2 };
      assert.ok(Math.hypot(mid.x - s.start!.x, mid.y - s.start!.y) >= 45, `${g.glyph} s${s.order} arrow beside the start`);
      assert.ok([s.arrow.from, s.arrow.to].every((p) => p.x >= 0 && p.x <= 1024 && p.y >= 0 && p.y <= 1024));
    }
  }
  assert.equal(strokes, 433);
  assert.ok(omitted < strokes * 0.1, `only a minority of arrows omitted (${omitted})`);
});

/* ---------------------------------------------------------------- contracted sounds (yōon) */

test("YOON: all 66 contracted cells decompose into verified constituent characters", () => {
  assert.equal(yoonCells().length, 66);
  for (const cell of yoonCells()) {
    const parts = getCompositeGuidance(cell)!;
    assert.equal(parts.length, 2, cell.glyph);
    assert.ok(parts.every((p) => p.guidance), `${cell.glyph} constituents verified`);
    assert.equal(parts[0].small, false);
    assert.equal(parts[1].small, true);
    assert.equal(parts.map((p) => p.glyph).join(""), cell.glyph);
  }
  assert.equal(getCompositeGuidance(findCell("hiragana", "basic:v:a")!), null);
});

test("YOON: each constituent keeps its OWN stroke order — no combined sequence", async () => {
  const { KanaStudyGrid } = await import("./kana-study-grid");
  const kya = findCell("hiragana", "yoon:k:ya")!;
  assert.equal(kya.glyph, "きゃ");
  const html = renderToStaticMarkup(<KanaStudyGrid cell={kya} />);
  assert.match(html, /data-stroke-composite/);
  assert.equal((html.match(/data-stroke-guidance="verified"/g) ?? []).length, 2);
  assert.match(html, /Chữ 1\/2: き · 4 nét/);
  assert.match(html, /Chữ 2\/2: ゃ \(chữ nhỏ\) · 3 nét/);
  // ids prove two independent sequences: き s1–s4 then ゃ s1–s3 (not s1–s7)
  assert.match(html, /data-stroke-id="hiragana-basic-k-i-s4"/);
  assert.match(html, /data-stroke-id="hiragana-small-ya-s3"/);
  assert.doesNotMatch(html, /-s[5-9]"/);
  // each panel's numbering restarts at 1
  assert.equal((html.match(/class="strokeNumber">1</g) ?? []).length, 2);
  assert.doesNotMatch(html, /AnimCJK|LGPL/);
  // the small kana is natively smaller than its full-size counterpart (preserved, not enlarged)
  const height = (d: string[]) => {
    const n = d.join(" ").match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const ys = n.filter((_, i) => i % 2 === 1);
    return Math.max(...ys) - Math.min(...ys);
  };
  const h = (id: string) => height(KANA_STROKE_GUIDANCE[id].strokes.flatMap((s) => s.outline));
  assert.ok(h("hiragana-small-ya") < h("hiragana-basic-y-a") * 0.9);
  assert.ok(h("katakana-small-yo") < h("katakana-basic-y-o") * 0.9);
});

test("YOON: voiced contracted sounds and katakana render both constituents", async () => {
  const { KanaStudyGrid } = await import("./kana-study-grid");
  const gya = KANA_CELLS.hiragana.find((c) => c.glyph === "ぎゃ")!;
  const html = renderToStaticMarkup(<KanaStudyGrid cell={gya} />);
  assert.match(html, /Chữ 1\/2: ぎ · 6 nét/); // き 4 + ゛ 2
  const shu = KANA_CELLS.katakana.find((c) => c.glyph === "シュ")!;
  const html2 = renderToStaticMarkup(<KanaStudyGrid cell={shu} />);
  assert.match(html2, /Chữ 1\/2: シ · 3 nét/);
  assert.match(html2, /Chữ 2\/2: ュ \(chữ nhỏ\) · 2 nét/);
});

/* ---------------------------------------------------------------- fallbacks */

test("FALLBACK: a character without data renders the plain Klee One glyph, no numbers/arrows", async () => {
  const { KanaStudyGrid } = await import("./kana-study-grid");
  const cell = findCell("hiragana", "basic:v:u")!;
  assert.equal(getStrokeGuidance(cell, {}), null);
  const html = renderToStaticMarkup(<KanaStudyGrid cell={cell} registry={{}} />);
  assert.match(html, /data-stroke-guidance="unavailable"/);
  assert.match(html, /Chưa có hướng dẫn thứ tự nét đã xác minh/);
  assert.match(html, /aria-label="Ô luyện nhìn chữ う"/);
  assert.doesNotMatch(html, /<svg|<marker|strokeNumber|strokePath/);
});

test("FALLBACK: invalid or tampered data is rejected and falls back", async () => {
  const { KanaStudyGrid } = await import("./kana-study-grid");
  const cell = findCell("hiragana", "basic:v:u")!;
  const good = KANA_STROKE_GUIDANCE[cell.id];
  for (const bad of [
    { ...good, strokeCount: good.strokeCount + 1 },
    { ...good, glyph: "え" },
    { ...good, script: "katakana" as const },
    { ...good, reviewStatus: "pending" as const },
    { ...good, strokes: [] },
  ]) {
    assert.equal(getStrokeGuidance(cell, { [cell.id]: bad }), null);
    assert.match(renderToStaticMarkup(<KanaStudyGrid cell={cell} registry={{ [cell.id]: bad }} />), /data-stroke-guidance="unavailable"/);
  }
});

test("FALLBACK: a yōon with a missing/invalid constituent labels that part and keeps the other verified", async () => {
  const { KanaStudyGrid } = await import("./kana-study-grid");
  const kya = findCell("hiragana", "yoon:k:ya")!;
  const registry = { ...KANA_STROKE_GUIDANCE };
  delete registry["hiragana-small-ya"];
  const html = renderToStaticMarkup(<KanaStudyGrid cell={kya} registry={registry} />);
  assert.equal((html.match(/data-stroke-guidance="verified"/g) ?? []).length, 1);
  assert.equal((html.match(/data-stroke-guidance="unavailable"/g) ?? []).length, 1);
  assert.match(html, /Chữ 2\/2: ゃ \(chữ nhỏ\) · chưa có hướng dẫn nét/);
  assert.match(html, /Ô luyện nhìn chữ ゃ/);
  // invalid (tampered) small kana behaves the same way
  const broken = { ...KANA_STROKE_GUIDANCE, "hiragana-small-ya": { ...KANA_STROKE_GUIDANCE["hiragana-small-ya"], strokeCount: 9 } };
  assert.equal(getCharGuidance("hiragana", "ゃ", broken), null);
});

/* ---------------------------------------------------------------- validator & script safety */

test("VALIDATE: rejects bad ids, order, count, grid, review status; multi-char glyph never valid", () => {
  const cell = findCell("hiragana", "basic:s:i")!;
  const good = fixtureFor(cell.id, cell.script, cell.glyph);
  assert.deepEqual(validateStrokeGuidance(good, cell), []);
  assert.ok(validateStrokeGuidance({ ...good, strokeCount: 3 }, cell).length > 0);
  assert.ok(validateStrokeGuidance({ ...good, strokes: [good.strokes[1], good.strokes[0]] }, cell).some((e) => /out of order/.test(e)));
  assert.ok(validateStrokeGuidance({ ...good, strokes: [{ ...good.strokes[0], id: "x" }, good.strokes[1]] }, cell).some((e) => /invalid id/.test(e)));
  assert.ok(validateStrokeGuidance({ ...good, strokes: [{ ...good.strokes[0], numberAt: { x: 120, y: 5 } }, good.strokes[1]] }, cell).some((e) => /outside grid/.test(e)));
  assert.ok(validateStrokeGuidance({ ...good, reviewStatus: "pending" }, cell).length > 0);
  const yoon = KANA_CELLS.hiragana.find((c) => c.section === "yoon")!;
  assert.ok(validateStrokeGuidance(fixtureFor(yoon.id, "hiragana", yoon.glyph), yoon).some((e) => /multi-character/.test(e)));
  assert.equal(getStrokeGuidance(yoon), null);
});

test("VALIDATE: hiragana and katakana data never apply to the other script or to voiced kana", () => {
  const hi = findCell("hiragana", "basic:s:i")!;
  const ka = findCell("katakana", "basic:s:i")!;
  const hiG = KANA_STROKE_GUIDANCE[hi.id];
  assert.ok(validateStrokeGuidance(hiG, ka).length > 0);
  const voiced = KANA_CELLS.hiragana.find((c) => c.glyph === "じ")!;
  assert.ok(validateStrokeGuidance(hiG, voiced).length > 0);
  assert.equal(getStrokeGuidance(voiced, { [hi.id]: hiG }), null);
  assert.ok(validateStrokeGuidanceFor(hiG, { id: hiG.kanaId, script: "katakana", glyph: hiG.glyph }).length > 0);
});

/* ---------------------------------------------------------------- annotations metadata */

const ANNOTATED: Record<string, Record<number, string>> = {
  "hiragana-basic-v-i": { 1: "hane" },
  "hiragana-basic-s-i": { 1: "harai" },
  "hiragana-basic-n-o": { 1: "harai" },
  "katakana-basic-v-a": { 2: "harai" },
  "katakana-basic-k-i": { 3: "tome" },
};

test("ANNOTATION: endings are NichiGo metadata limited to the explicit set, pending-review, never rendered", async () => {
  const { KanaStudyGrid } = await import("./kana-study-grid");
  for (const g of allEntries()) {
    for (const s of g.strokes) {
      assert.equal(s.ending ?? undefined, ANNOTATED[g.kanaId]?.[s.order], `${g.kanaId} s${s.order}`);
      if (s.ending) assert.ok(s.end, "annotated stroke has an end anchor");
    }
  }
  for (const id of Object.keys(ANNOTATED)) {
    assert.equal(KANA_STROKE_GUIDANCE[id].endingAnnotation?.reviewStatus, "pending-review");
    const cell = allCells().find((c) => c.id === id)!;
    const html = renderToStaticMarkup(<KanaStudyGrid cell={cell} />);
    assert.doesNotMatch(html, /data-ending=|endingTome|endingHane|endingHarai|cách kết thúc nét|はらう|とめる|はねる/);
  }
});

/* ---------------------------------------------------------------- attribution */

test("ATTRIBUTION: exactly once per chart page (both scripts, drawer open or closed), with working links", async () => {
  const { KanaChart } = await import("./kana-chart");
  for (const script of SCRIPTS) {
    for (const selectedKey of [null, "basic:v:a", "yoon:k:ya"]) {
      const html = renderToStaticMarkup(
        <KanaChart script={script} selectedKey={selectedKey} drawerId="d" onSelect={() => {}} registerCell={() => {}} />,
      );
      assert.equal((html.match(/data-kana-stroke-attribution/g) ?? []).length, 1);
      assert.match(html, /href="https:\/\/github\.com\/parsimonhi\/animCJK"/);
      assert.match(html, /href="https:\/\/www\.gnu\.org\/licenses\/lgpl-3\.0\.html"/);
      assert.match(html, /LGPL-3\.0-or-later/);
      assert.match(html, /chưa có hướng dẫn nét cho mọi chữ Kana/);
      assert.ok(html.lastIndexOf("data-kana-stroke-attribution") > html.lastIndexOf("Quy luật biến đổi âm"));
    }
  }
});

test("ATTRIBUTION: the drawer (single and contracted) never repeats source or licence text", async () => {
  const { KanaDrawer } = await import("./kana-drawer");
  for (const [script, key, expected] of [["hiragana", "basic:k:i", />4 nét</], ["hiragana", "yoon:k:ya", /Chữ 1\/2/]] as const) {
    const cell = findCell(script, key) as KanaChartCell;
    const html = renderToStaticMarkup(<KanaDrawer cell={cell} id="d" mode="docked" onClose={() => {}} />);
    assert.match(html, expected);
    assert.doesNotMatch(html, /AnimCJK|LGPL|Dữ liệu nét viết/);
  }
});
