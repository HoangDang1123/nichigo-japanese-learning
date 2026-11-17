import assert from "node:assert/strict";
import { test } from "node:test";
import { KANA_CELLS, KANA_SECTIONS, KANA_CONNECTORS, cellPositionKey, findCell } from "./kana-chart-data";

const SCRIPTS = ["hiragana", "katakana"] as const;
const HIRAGANA = /^[ぁ-ゖ]+$/;
const KATAKANA = /^[ァ-ヺ]+$/;

test("KANA-DATA: ids are unique and positions match between scripts", () => {
  for (const script of SCRIPTS) {
    const ids = KANA_CELLS[script].map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length);
  }
  const hira = KANA_CELLS.hiragana.map(cellPositionKey).sort();
  const kata = KANA_CELLS.katakana.map(cellPositionKey).sort();
  assert.deepEqual(hira, kata);
});

test("KANA-DATA: expected cell counts per section (empty cells preserved)", () => {
  const count = (script: "hiragana" | "katakana", section: string) =>
    KANA_CELLS[script].filter((c) => c.section === section).length;
  for (const script of SCRIPTS) {
    assert.equal(count(script, "basic"), 46);
    assert.equal(count(script, "voiced"), 25);
    assert.equal(count(script, "yoon"), 21);
    assert.equal(count(script, "voiced-yoon"), 12);
  }
});

test("KANA-DATA: glyphs are real kana and contracted sounds use small ゃゅょ / ャュョ", () => {
  for (const c of KANA_CELLS.hiragana) {
    assert.match(c.glyph, HIRAGANA, c.id);
    if (c.section.endsWith("yoon")) assert.match(c.glyph, /^[ぁ-ゖ][ゃゅょ]$/, c.id);
  }
  for (const c of KANA_CELLS.katakana) {
    assert.match(c.glyph, KATAKANA, c.id);
    if (c.section.endsWith("yoon")) assert.match(c.glyph, /^[ァ-ヺ][ャュョ]$/, c.id);
  }
});

test("KANA-DATA: row/column positions and grid placement", () => {
  const basic = KANA_SECTIONS.find((s) => s.key === "basic")!;
  assert.deepEqual(basic.cols, ["a", "i", "u", "e", "o"]);
  const shi = findCell("hiragana", "basic:s:i")!;
  assert.equal(shi.glyph, "し");
  assert.equal(shi.romaji, "shi");
  assert.equal(shi.gridColumn, 3);
  const n = findCell("katakana", "basic:nn:a")!;
  assert.equal(n.glyph, "ン");
  assert.equal(findCell("hiragana", "basic:y:i"), null);
  assert.equal(findCell("hiragana", "basic:w:u"), null);
  // Voiced rows share grid rows with their basic counterparts.
  const rowOf = (script: "hiragana", key: string) => findCell(script, key)!.gridRow;
  assert.equal(rowOf("hiragana", "voiced:g:a"), rowOf("hiragana", "basic:k:a"));
  assert.equal(rowOf("hiragana", "voiced:z:a"), rowOf("hiragana", "basic:s:a"));
  assert.equal(rowOf("hiragana", "voiced:d:a"), rowOf("hiragana", "basic:t:a"));
  assert.equal(rowOf("hiragana", "voiced:b:a"), rowOf("hiragana", "basic:h:a"));
  assert.equal(rowOf("hiragana", "voiced-yoon:g:ya"), rowOf("hiragana", "yoon:k:ya"));
  assert.equal(rowOf("hiragana", "voiced-yoon:j:ya"), rowOf("hiragana", "yoon:s:ya"));
  assert.equal(rowOf("hiragana", "voiced-yoon:b:ya"), rowOf("hiragana", "yoon:h:ya"));
  for (const list of Object.values(KANA_CONNECTORS)) {
    for (const c of list) assert.ok(c.toRow >= c.fromRow);
  }
});

test("KANA-DATA: irregular Hepburn readings are highlighted explicitly", () => {
  const specials = KANA_CELLS.hiragana.filter((c) => c.special).map((c) => `${c.glyph}:${c.romaji}`);
  for (const expected of ["し:shi", "ち:chi", "つ:tsu", "ふ:fu", "じ:ji", "ぢ:ji", "ず:zu", "づ:zu", "しゃ:sha", "ちゃ:cha", "じゃ:ja"]) {
    assert.ok(specials.includes(expected), expected);
  }
  assert.equal(findCell("hiragana", "basic:k:a")!.special, false);
});

test("KANA-DATA: no fabricated examples for voiced and contracted cells", () => {
  for (const script of SCRIPTS) {
    for (const c of KANA_CELLS[script]) {
      if (c.section !== "basic") assert.equal(c.example, undefined, c.id);
    }
  }
});
