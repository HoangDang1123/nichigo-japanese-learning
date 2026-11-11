import * as React from "react";
import type { KanaChartCell } from "./kana-chart-data";
import {
  ENDING_LABEL,
  getCompositeGuidance,
  getStrokeGuidance,
  type CompositePart,
  type KanaStrokeGuidance,
} from "./kana-stroke-guidance";
import styles from "./kana-drawer.module.css";

interface KanaStudyGridProps {
  cell: KanaChartCell;
  /** Override for tests/previews (single characters only); defaults to the verified registry lookup. */
  guidance?: KanaStrokeGuidance | null;
  /** Override for tests/previews; defaults to the production registry. */
  registry?: Readonly<Record<string, KanaStrokeGuidance>>;
}

function describe(glyph: string, g: KanaStrokeGuidance): string {
  // Ending annotations are only described once reviewed; "pending-review" data is never presented as verified.
  const endings = g.endingAnnotation?.reviewStatus !== "reviewed" ? "" : g.strokes
    .filter((s) => s.ending)
    .map((s) => `nét ${s.order}: ${ENDING_LABEL[s.ending!]}`)
    .join(", ");
  return `Hướng dẫn viết chữ ${glyph}: ${g.strokeCount} nét, đánh số theo thứ tự viết${endings ? `; cách kết thúc nét: ${endings}` : ""}.`;
}

interface PanelProps {
  glyph: string;
  guidance: KanaStrokeGuidance | null;
  /** Multiplier for number size so numbers stay legible in the smaller composite panels. */
  numberScale?: number;
}

/** One 2×2 writing grid for ONE character: verified outlines + numbers/arrows, or the Klee One glyph. */
function StudyPanel({ glyph, guidance: g, numberScale = 1 }: PanelProps) {
  if (!g) {
    // Fallback: plain Klee One glyph, no stroke numbers or arrows.
    return (
      <div
        className={styles.studyGrid}
        role="img"
        aria-label={`Ô luyện nhìn chữ ${glyph}`}
        data-stroke-guidance="unavailable"
      >
        <span className={`${styles.studyGlyph} ${[...glyph].length > 1 ? styles.studyGlyphCompact : ""}`} lang="ja" aria-hidden="true">
          {glyph}
        </span>
      </div>
    );
  }
  const markerId = `arrow-${g.kanaId}`;
  return (
    <div className={styles.studyGrid} role="img" aria-label={describe(glyph, g)} data-stroke-guidance="verified">
      <svg className={styles.strokeSvg} viewBox={`0 0 ${g.viewBox.width} ${g.viewBox.height}`} aria-hidden="true" focusable="false">
        <defs>
          <marker id={markerId} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" className={styles.strokeArrowHead} />
          </marker>
        </defs>
        {/* Filled AnimCJK outlines: the natural tapered shapes are drawn untouched. */}
        {g.strokes.map((s) => (
          <g key={s.id} data-stroke-id={s.id}>
            {s.outline.map((d, i) => (
              <path key={i} d={d} className={styles.strokePath} />
            ))}
          </g>
        ))}
        {/* Instruction overlay: separate from the AnimCJK stroke outlines above. */}
        <g className={styles.strokeOverlay}>
          {g.strokes.map((s) => (
            <g key={`${s.id}-guide`} data-stroke-guide={s.id}>
              {s.arrow && (
                <line
                  x1={s.arrow.from.x}
                  y1={s.arrow.from.y}
                  x2={s.arrow.to.x}
                  y2={s.arrow.to.y}
                  className={styles.strokeArrow}
                  strokeWidth={g.arrowWidth}
                  markerEnd={`url(#${markerId})`}
                />
              )}
              <text x={s.numberAt.x} y={s.numberAt.y} fontSize={g.numberSize * numberScale} className={styles.strokeNumber}>
                {s.order}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

function partCaption(part: CompositePart, index: number, total: number): string {
  const label = `Chữ ${index + 1}/${total}: ${part.glyph}${part.small ? " (chữ nhỏ)" : ""}`;
  return part.guidance ? `${label} · ${part.guidance.strokeCount} nét` : `${label} · chưa có hướng dẫn nét`;
}

/**
 * Contracted sound (きゃ, シュ …): the constituent characters are drawn in their own grids, each with
 * its own stroke order restarting at 1. This never implies one combined stroke sequence.
 */
function CompositeStudy({ cell, parts }: { cell: KanaChartCell; parts: CompositePart[] }) {
  return (
    <div
      className={styles.studyPair}
      role="group"
      aria-label={`Âm ghép ${cell.glyph}: viết lần lượt từng chữ, mỗi chữ có thứ tự nét riêng`}
      data-stroke-composite=""
    >
      {parts.map((part, i) => (
        <div className={styles.studyPanel} key={`${part.glyph}-${i}`}>
          <StudyPanel glyph={part.glyph} guidance={part.guidance} numberScale={1.1} />
          <p className={styles.studyNote} data-stroke-part={i + 1}>
            {partCaption(part, i, parts.length)}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Study area for the selected cell: one grid for a single kana, one grid per character for a contracted sound. */
export function KanaStudyGrid({ cell, guidance, registry }: KanaStudyGridProps) {
  const parts = getCompositeGuidance(cell, registry);
  if (parts) return <CompositeStudy cell={cell} parts={parts} />;

  const g = guidance === undefined ? getStrokeGuidance(cell, registry) : guidance;
  return (
    <>
      <StudyPanel glyph={cell.glyph} guidance={g} />
      {g ? (
        <p className={styles.studyNote}>{g.strokeCount} nét</p>
      ) : (
        <p className={styles.studyNote} data-stroke-guidance="unavailable">
          Chưa có hướng dẫn thứ tự nét đã xác minh cho chữ này.
        </p>
      )}
    </>
  );
}
