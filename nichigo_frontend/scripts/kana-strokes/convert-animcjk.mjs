#!/usr/bin/env node
/**
 * Repeatable AnimCJK -> NichiGo stroke-guidance conversion for every kana the chart needs
 * (scripts/kana-strokes/kana-manifest.json; NOT all 177 AnimCJK kana files).
 *
 *   node scripts/kana-strokes/convert-animcjk.mjs           # convert from vendored SVGs
 *   node scripts/kana-strokes/convert-animcjk.mjs --fetch   # (re)download the pinned SVGs first
 *
 * Input : src/data/kana-strokes/source/animcjk-<commit7>/<decimal-codepoint>.svg  (UNMODIFIED)
 * Output: src/data/kana-strokes/animcjk-kana.json                                (derived work)
 *
 * Copied verbatim from AnimCJK: filled stroke OUTLINE path data (`d`), the stroke MEDIAN path
 * data, stroke order, and the 1024x1024 coordinate system. Nothing is rescaled or altered.
 * A stroke that overlaps itself is split by AnimCJK into several outline parts with the same
 * stroke number (e.g. あ 3a/3b); they are grouped back into ONE logical stroke here.
 *
 * Derived by NichiGo (NOT AnimCJK data): stroke-number position, start-direction arrow and the
 * end anchor. Medians are used ONLY to derive direction/placement; they are never drawn.
 * Placement is checked against the real outline geometry so numbers/arrows stay off the glyph;
 * if no clear placement exists the arrow is omitted. AnimCJK provides no number positions and no
 * tome/hane/harai classification; `ending` comes only from the NichiGo-owned
 * scripts/kana-strokes/nichigo-endings.json (default null) and is metadata only.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifest = JSON.parse(readFileSync(join(root, "scripts/kana-strokes/kana-manifest.json"), "utf8"));
const srcDir = join(root, "src/data/kana-strokes/source", `animcjk-${manifest.commit.slice(0, 7)}`);
const outFile = join(root, "src/data/kana-strokes/animcjk-kana.json");
const reportFile = join(root, "src/data/kana-strokes/coverage-report.json");
const base = `https://raw.githubusercontent.com/parsimonhi/animCJK/${manifest.commit}`;
const round = (n) => Math.round(n * 10) / 10;

if (process.argv.includes("--fetch")) {
  mkdirSync(srcDir, { recursive: true });
  const files = manifest.glyphs.map(({ glyph }) => [`${base}/${manifest.folder}/${glyph.codePointAt(0)}.svg`, `${glyph.codePointAt(0)}.svg`]);
  files.push([`${base}/licenses/COPYING.txt`, "COPYING.txt"], [`${base}/licenses/LGPL.txt`, "LGPL.txt"]);
  for (const [url, name] of files) {
    const res = await fetch(url);
    if (!res.ok) { console.log("MISSING", res.status, url); continue; }
    writeFileSync(join(srcDir, name), Buffer.from(await res.arrayBuffer()));
    console.log("fetched", url);
  }
}

/* ---------- geometry helpers (AnimCJK uses absolute M/L/C/Z only) ---------- */
function parseOutline(d) {
  const t = d.match(/[MLCZ]|-?\d+(?:\.\d+)?/g);
  const pts = [];
  let i = 0, cmd = "", cur = [0, 0];
  const n = () => parseFloat(t[i++]);
  while (i < t.length) {
    if (/[MLCZ]/.test(t[i])) cmd = t[i++];
    if (cmd === "Z") continue;
    if (cmd === "M" || cmd === "L") {
      cur = [n(), n()];
      pts.push(cur);
    } else if (cmd === "C") {
      const p1 = [n(), n()], p2 = [n(), n()], p3 = [n(), n()];
      for (let k = 1; k <= 16; k++) {
        const s = k / 16, u = 1 - s;
        pts.push([0, 1].map((a) => u ** 3 * cur[a] + 3 * u * u * s * p1[a] + 3 * u * s * s * p2[a] + s ** 3 * p3[a]));
      }
      cur = p3;
    } else throw new Error(`unsupported outline command ${cmd}`);
  }
  return pts;
}
function densify(poly) {
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k], b = poly[(k + 1) % poly.length];
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
    for (let s = 0; s < steps; s++) out.push([a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps]);
  }
  return out;
}
const inPoly = (p, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (poly[i][1] > p[1] !== poly[j][1] > p[1] && p[0] < ((poly[j][0] - poly[i][0]) * (p[1] - poly[i][1])) / (poly[j][1] - poly[i][1]) + poly[i][0]) c = !c;
  }
  return c;
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function segDist(p, a, b) {
  const l2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  let t = l2 ? ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return dist(p, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
}
const unit = (a, b) => {
  const l = dist(a, b);
  return l === 0 ? null : [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
};
const parseMedian = (d) => {
  const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const pts = [];
  for (let i = 0; i < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  return pts;
};

/* ---------- placement tuning (viewBox units; 1 unit = 0.17px in the 176px drawer; numbers ~12px, arrows ~1.5px) ---------- */
const VB = 1024, EDGE = 36;
const NUMBER_SIZE = 70, NUMBER_CLEAR = 44;
// Conservative relaxation ladder for crowded glyphs (still strictly outside every outline).
const NUMBER_LEVELS = [{ clear: NUMBER_CLEAR, space: 76 }, { clear: 38, space: 64 }, { clear: 32, space: 56 }]; // number radius ~ 0.6*size
const ARROW_CLEAR = 30, ARROW_WIDTH = 8.8, ARROW_NUM_CLEAR = 58, LENGTHS = [62, 48];
const NUMBER_R0 = 56, ARROW_OFF0 = 52, STEP = 6, ARROW_BACK = 14;
const inside = (p, m = EDGE) => p[0] >= m && p[0] <= VB - m && p[1] >= m && p[1] <= VB - m;

const report = [];
const ENDINGS = JSON.parse(readFileSync(join(root, "scripts/kana-strokes/nichigo-endings.json"), "utf8"));

const coverage = { required: manifest.glyphs.length, imported: [], missing: [], unsupported: [], relaxedNumbers: [], omittedArrows: [] };
const glyphs = manifest.glyphs.map((entry) => {
  const { kanaId, script, glyph, expectedStrokes } = entry;
  const cp0 = glyph.codePointAt(0);
  if (!existsSync(join(srcDir, `${cp0}.svg`))) { coverage.missing.push({ glyph, script, codepoint: `U+${cp0.toString(16).toUpperCase()}`, reason: "no AnimCJK svgsJaKana file at the pinned commit" }); return null; }
  try {
  const cp = glyph.codePointAt(0);
  const file = join(srcDir, `${cp}.svg`);
  const svg = readFileSync(file, "utf8");
  // Unicode verification: filename (decimal), svg id and viewBox must agree.
  if (!new RegExp(`<svg id="z${cp}" class="acjk" viewBox="0 0 1024 1024"`).test(svg)) throw new Error(`${cp}: svg id/viewBox mismatch`);

  const outlineParts = [...svg.matchAll(new RegExp(`<path id="z${cp}d(\\d+)([a-z]?)" d="([^"]+)"/>`, "g"))]
    .map((m) => ({ n: Number(m[1]), part: m[2], d: m[3] }));
  const medianParts = [...svg.matchAll(new RegExp(`<path style="--d:(\\d+)s;" pathLength="\\d+" clip-path="url\\(#z${cp}c(\\d+)([a-z]?)\\)" d="([^"]+)"/>`, "g"))]
    .map((m) => ({ delay: Number(m[1]), n: Number(m[2]), part: m[3], d: m[4] }));
  if (!outlineParts.length || outlineParts.length !== medianParts.length) throw new Error(`${cp}: outline/median count mismatch`);

  // Group split parts (same stroke number) into ONE logical stroke.
  const ns = [...new Set(outlineParts.map((o) => o.n))].sort((a, b) => a - b);
  if (ns.length !== expectedStrokes || ns.some((n, i) => n !== i + 1)) throw new Error(`${cp} ${glyph}: logical strokes ${ns} != expected ${expectedStrokes}`);
  const logical = ns.map((n) => {
    const outs = outlineParts.filter((o) => o.n === n);
    const meds = medianParts.filter((m) => m.n === n);
    if (meds.some((m) => m.delay !== n)) throw new Error(`${cp}: delay/order mismatch at stroke ${n}`);
    // Split parts all follow the same writing path; the first part's median is the true start.
    const median = meds[0].d;
    const mp = parseMedian(median);
    if (!inside(mp[0], 0)) throw new Error(`${cp} s${n}: median starts off-canvas`);
    return { n, outlines: outs.map((o) => o.d), median, mp, polys: outs.map((o) => densify(parseOutline(o.d))), rawPolys: outs.map((o) => parseOutline(o.d)) };
  });

  const allBoundary = logical.flatMap((s) => s.polys.flat());
  const allRaw = logical.flatMap((s) => s.rawPolys);
  const onGlyph = (p) => allRaw.some((poly) => inPoly(p, poly));
  const clearOfGlyph = (p, r) => !onGlyph(p) && allBoundary.every((q) => dist(p, q) > r);
  const segClear = (a, b, r) => allBoundary.every((q) => segDist(q, a, b) > r) && !onGlyph([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]) && !onGlyph(b) && !onGlyph(a);

  const placed = { numbers: [] };
  const strokes = logical.map((s) => {
    const p0 = s.mp[0];
    const q = s.mp.find((p) => dist(p, p0) >= 56) ?? s.mp[s.mp.length - 1];
    const d = unit(p0, q) ?? [1, 0];
    // --- number: nearest clear spot to the stroke start, preferring "behind" the start ---
    let numberAt = null, usedLevel = 0;
    for (let li = 0; li < NUMBER_LEVELS.length && !numberAt; li++) {
      const { clear, space } = NUMBER_LEVELS[li];
      for (let r = NUMBER_R0; r <= 260 && !numberAt; r += STEP) {
        const cands = [];
        for (let a = 0; a < 360; a += 15) {
          const th = (a * Math.PI) / 180, c = Math.cos(th), sn = Math.sin(th);
          cands.push({ p: [p0[0] + c * r, p0[1] + sn * r], score: -(c * d[0] + sn * d[1]) }); // behind start first
        }
        cands.sort((x, y) => y.score - x.score);
        numberAt = cands.find((c) => inside(c.p, 50) && clearOfGlyph(c.p, clear) && placed.numbers.every((o) => dist(o, c.p) > space))?.p ?? null;
        if (numberAt) usedLevel = li;
      }
    }
    if (!numberAt) throw new Error(`${cp} s${s.n}: no number position outside the glyph`);
    if (usedLevel > 0) coverage.relaxedNumbers.push(`${glyph} stroke ${s.n} (clearance ${NUMBER_LEVELS[usedLevel].clear})`);
    placed.numbers.push(numberAt);
    return { ...s, p0, d, numberAt };
  });

  const out = strokes.map((s) => {
    // --- arrow: short, beside the start, parallel to the initial direction ---
    const left = [-s.d[1], s.d[0]];
    const away = (n) => dist([s.p0[0] + n[0] * 80, s.p0[1] + n[1] * 80], s.numberAt);
    const sides = [left, [-left[0], -left[1]]].sort((a, b) => away(b) - away(a));
    let arrow = null;
    search: for (const len of LENGTHS) for (let off = ARROW_OFF0; off <= 240; off += STEP) for (const n of sides) {
      const from = [s.p0[0] + n[0] * off - s.d[0] * ARROW_BACK, s.p0[1] + n[1] * off - s.d[1] * ARROW_BACK];
      const to = [from[0] + s.d[0] * len, from[1] + s.d[1] * len];
      if (!inside(from) || !inside(to)) continue;
      if (!segClear(from, to, ARROW_CLEAR)) continue;
      if (!placed.numbers.every((p) => segDist(p, from, to) > ARROW_NUM_CLEAR)) continue;
      arrow = { from: { x: round(from[0]), y: round(from[1]) }, to: { x: round(to[0]), y: round(to[1]) } };
      break search;
    }
    if (!arrow) { report.push(`${glyph} stroke ${s.n}: no clear start-arrow placement (omitted)`); coverage.omittedArrows.push(`${glyph} stroke ${s.n}`); }
    const pe = s.mp[s.mp.length - 1];
    const prev = [...s.mp].reverse().find((p) => dist(p, pe) >= 40) ?? s.mp[0];
    const et = unit(prev, pe) ?? [1, 0];
    const ending = ENDINGS.annotations[kanaId]?.[String(s.n)] ?? null;
    return {
      id: `${kanaId}-s${s.n}`,
      order: s.n,
      outline: s.outlines,
      median: s.median,
      numberAt: { x: round(s.numberAt[0]), y: round(s.numberAt[1]) },
      start: { x: round(s.p0[0]), y: round(s.p0[1]) },
      ...(arrow ? { arrow } : {}),
      end: { x: round(pe[0]), y: round(pe[1]), dx: Math.round(et[0] * 100) / 100, dy: Math.round(et[1] * 100) / 100 },
      ending,
    };
  });

  return {
    kanaId,
    script,
    glyph,
    codepoint: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
    strokeCount: out.length,
    viewBox: { width: VB, height: VB },
    numberSize: NUMBER_SIZE,
    arrowWidth: ARROW_WIDTH,
    strokes: out,
    reviewStatus: "verified",
    ...(out.some((s) => s.ending) ? { endingAnnotation: { source: "NichiGo", reviewStatus: ENDINGS.reviewStatus } } : {}),
  };
  } catch (e) {
    coverage.unsupported.push({ glyph, script, codepoint: `U+${cp0.toString(16).toUpperCase()}`, reason: String(e.message) });
    return null;
  }
}).filter(Boolean);

coverage.imported = glyphs.map((g) => g.glyph);
const result = {
  assetVersion: 3,
  source: {
    name: "AnimCJK",
    copyright: "AnimCJK 2016-2026 Copyright FM&SH",
    license: "LGPL-3.0-or-later",
    licenseUrl: "https://www.gnu.org/licenses/lgpl-3.0.html",
    url: "https://github.com/parsimonhi/animCJK",
    repository: "https://github.com/parsimonhi/animCJK",
    revision: manifest.commit.slice(0, 7),
    commit: manifest.commit,
  },
  modifications:
    "Filled stroke outline path data (`d`), median path data, stroke order and the 1024x1024 coordinate system are copied unchanged from AnimCJK svgsJaKana SVGs (no rescaling). " +
    "Split outline parts of one stroke are grouped into a single logical stroke. Reformatted into JSON. " +
    "Stroke-number positions, start-direction arrows and end anchors are computed by NichiGo from the median/outline geometry (not AnimCJK data); medians are never drawn. " +
    "`ending` values are NichiGo-owned metadata from scripts/kana-strokes/nichigo-endings.json, not AnimCJK data, and are not rendered.",
  glyphs,
};
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(result, null, 1) + "\n");
writeFileSync(reportFile, JSON.stringify({ commit: manifest.commit, generatedBy: "scripts/kana-strokes/convert-animcjk.mjs", ...coverage, summary: { required: coverage.required, imported: coverage.imported.length, missing: coverage.missing.length, unsupported: coverage.unsupported.length } }, null, 1) + "\n");
console.log(`wrote ${outFile}: ${glyphs.length}/${coverage.required} glyphs; missing ${coverage.missing.length}, unsupported ${coverage.unsupported.length}`);
coverage.missing.forEach((m) => console.log("MISSING", m.glyph, m.reason));
coverage.unsupported.forEach((m) => console.log("UNSUPPORTED", m.glyph, m.reason));
report.forEach((r) => console.log("note:", r));
