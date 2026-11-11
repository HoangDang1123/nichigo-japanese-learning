/**
 * kana-stroke-guidance.ts — typed contract for static stroke-order guidance.
 *
 * Stroke data must come from independently verified, appropriately licensed sources. Nothing
 * here is derived from font glyphs, and the Happylilac reference PDFs are NOT a data source.
 * The renderer depends only on these types, not on AnimCJK's raw SVG markup; the AnimCJK-derived
 * generated JSON (AnimCJK-derived) is adapted in ./kana-stroke-data.ts. Characters without an entry fall back to the
 * plain Klee One glyph.
 */
import type { KanaChartCell, KanaScript } from "./kana-chart-data";
import { KANA_STROKE_DATA, KANA_STROKE_ASSET } from "./kana-stroke-data";

/** とめる stop / はねる flick / はらう sweep. Only set when the source verifies it. */
export type StrokeEnding = "tome" | "hane" | "harai";

export interface StrokePoint {
  x: number;
  y: number;
}

export interface KanaStroke {
  /** Stable id, `<kanaId>-s<order>`. */
  id: string;
  /** 1-based writing order. */
  order: number;
  /**
   * Filled outline path data in the guidance's own viewBox coordinates (never rescaled). One
   * entry per outline part; a self-overlapping stroke may have several parts but is still ONE
   * logical stroke. These are the shapes that are drawn.
   */
  outline: string[];
  /**
   * Centreline of the stroke. Used ONLY to derive direction/placement at conversion time;
   * never drawn.
   */
  median: string;
  /** Centre of the order number, in viewBox coordinates. */
  numberAt: StrokePoint;
  /** Path start (derived from the path geometry). */
  start?: StrokePoint;
  /**
   * Instruction overlay: short guide arrow beside the stroke start, parallel to its initial
   * direction. Separate from the stroke body; omitted when no clear placement exists.
   */
  arrow?: { from: StrokePoint; to: StrokePoint };
  /** Path end point and unit tangent (derived from geometry); anchors the ending overlay. */
  end?: StrokePoint & { dx: number; dy: number };
  /**
   * NichiGo-owned pedagogical annotation (NOT source-dataset data). null/absent = plain ending.
   * Requires `end` and the guidance-level `endingAnnotation` record.
   */
  ending?: StrokeEnding | null;
}

export interface StrokeDataSource {
  name: string;
  copyright: string;
  /** e.g. "CC BY-SA 3.0". */
  license: string;
  licenseUrl: string;
  url: string;
  repository?: string;
  revision?: string;
  commit?: string;
}

export interface KanaStrokeGuidance {
  /** Must equal KanaChartCell.id. */
  kanaId: string;
  script: KanaScript;
  /** Exact glyph the data was verified for (no reuse of base-kana data for voiced kana). */
  glyph: string;
  /** e.g. "U+3042"; must match the glyph. */
  codepoint: string;
  strokeCount: number;
  /** Native coordinate system of the stroke data; preserved to keep proportions. */
  viewBox: { width: number; height: number };
  /** Font size of order numbers, in viewBox units. */
  numberSize: number;
  /** Stroke width of the start-direction arrows, in viewBox units. */
  arrowWidth: number;
  strokes: KanaStroke[];
  /** Provenance of the `ending` annotations; required when any stroke has one. */
  endingAnnotation?: { source: string; reviewStatus: "pending-review" | "reviewed" };
  source: StrokeDataSource;
  assetVersion: number;
  /** Only "verified" data is ever rendered. */
  reviewStatus: "verified" | "pending";
}

export const ENDING_LABEL: Record<StrokeEnding, string> = {
  tome: "とめる",
  hane: "はねる",
  harai: "はらう",
};

/** Guidance keyed by KanaChartCell.id, built from the reviewed AnimCJK-derived JSON asset. */
export const KANA_STROKE_GUIDANCE: Readonly<Record<string, KanaStrokeGuidance>> = KANA_STROKE_DATA;

/** What an entry is validated against: a chart cell, or a constituent character (e.g. small ゃ). */
export interface KanaRef {
  id: string;
  script: KanaScript;
  glyph: string;
}

/** Returns a list of problems; empty means the entry is structurally valid for this reference. */
export function validateStrokeGuidanceFor(g: KanaStrokeGuidance, ref: KanaRef): string[] {
  const errors: string[] = [];
  const { width, height } = g.viewBox;
  const inGrid = (p: StrokePoint) => p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height;
  if (g.kanaId !== ref.id) errors.push("kanaId does not match cell");
  if (g.script !== ref.script) errors.push("script does not match cell");
  if (g.glyph !== ref.glyph) errors.push("glyph does not match cell");
  // Contracted sounds (きゃ, シャ …) are several characters and are never given one combined sequence.
  if ([...ref.glyph].length !== 1) errors.push("multi-character kana are not supported");
  else if (g.codepoint !== `U+${ref.glyph.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`) {
    errors.push("codepoint does not match glyph");
  }
  if (!g.source.name || !g.source.license || !g.source.licenseUrl) errors.push("missing source or licence");
  if (g.reviewStatus !== "verified") errors.push("not verified");
  if (!(width > 0 && height > 0)) errors.push("invalid viewBox");
  if (g.strokeCount !== g.strokes.length || g.strokeCount < 1) errors.push("strokeCount mismatch");
  g.strokes.forEach((s, i) => {
    if (s.order !== i + 1) errors.push(`stroke ${i + 1} out of order`);
    if (s.id !== `${g.kanaId}-s${s.order}`) errors.push(`stroke ${i + 1} has invalid id`);
    if (s.outline.length === 0 || s.outline.some((o) => !o.trim())) errors.push(`stroke ${i + 1} has empty outline`);
    if (!s.median.trim()) errors.push(`stroke ${i + 1} has empty median`);
    const pts = [s.numberAt, ...(s.start ? [s.start] : []), ...(s.end ? [s.end] : []), ...(s.arrow ? [s.arrow.from, s.arrow.to] : [])];
    if (s.ending != null) {
      if (!["tome", "hane", "harai"].includes(s.ending)) errors.push(`stroke ${i + 1} has unknown ending`);
      if (!s.end) errors.push(`stroke ${i + 1} ending needs an end anchor`);
      if (!g.endingAnnotation) errors.push("ending annotations need endingAnnotation provenance");
    }
    if (!pts.every(inGrid)) errors.push(`stroke ${i + 1} outside grid`);
  });
  if (new Set(g.strokes.map((s) => s.id)).size !== g.strokes.length) errors.push("duplicate stroke ids");
  return errors;
}

export function validateStrokeGuidance(g: KanaStrokeGuidance, cell: KanaChartCell): string[] {
  return validateStrokeGuidanceFor(g, cell);
}

/** Guidance for a cell, or null when none is verified (caller shows the plain glyph). */
export function getStrokeGuidance(
  cell: KanaChartCell,
  registry: Readonly<Record<string, KanaStrokeGuidance>> = KANA_STROKE_GUIDANCE,
): KanaStrokeGuidance | null {
  const g = registry[cell.id];
  if (!g) return null;
  return validateStrokeGuidance(g, cell).length === 0 ? g : null;
}

export { KANA_STROKE_ASSET };

type Registry = Readonly<Record<string, KanaStrokeGuidance>>;

/**
 * Guidance for ONE character of a script (used for constituents of contracted sounds, including
 * the small ゃ/ゅ/ょ that are not chart cells). Null when absent or invalid.
 */
export function getCharGuidance(script: KanaScript, ch: string, registry: Registry = KANA_STROKE_GUIDANCE): KanaStrokeGuidance | null {
  if ([...ch].length !== 1) return null;
  for (const g of Object.values(registry)) {
    if (g.script === script && g.glyph === ch) {
      return validateStrokeGuidanceFor(g, { id: g.kanaId, script, glyph: ch }).length === 0 ? g : null;
    }
  }
  return null;
}

export interface CompositePart {
  glyph: string;
  /** True for the contracted small kana (ゃ ゅ ょ ャ ュ ョ). */
  small: boolean;
  /** Verified guidance for this character alone, or null → clearly labelled fallback. */
  guidance: KanaStrokeGuidance | null;
}

const SMALL_KANA = /^[ゃゅょャュョ]$/;

/**
 * Contracted sounds (きゃ, シュ, ぎょ …) are presented as their constituent characters, each with
 * its OWN stroke order. Never one combined sequence. Null for single characters.
 */
export function getCompositeGuidance(cell: KanaChartCell, registry: Registry = KANA_STROKE_GUIDANCE): CompositePart[] | null {
  const chars = [...cell.glyph];
  if (chars.length < 2) return null;
  return chars.map((glyph) => ({ glyph, small: SMALL_KANA.test(glyph), guidance: getCharGuidance(cell.script, glyph, registry) }));
}
