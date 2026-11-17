/**
 * kana-stroke-types.ts — types of the static stroke-order guidance contract.
 *
 * Kept apart from kana-stroke-guidance.ts so the data adapter (kana-stroke-data.ts) and the
 * guidance logic can both depend on these types without importing each other (JPN-ARCH-004).
 * kana-stroke-guidance.ts re-exports them, so existing imports keep working.
 */
import type { KanaScript } from "./kana-chart-data";

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
