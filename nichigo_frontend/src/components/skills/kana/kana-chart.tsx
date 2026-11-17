import * as React from "react";
import {
  KANA_CELLS,
  KANA_CONNECTORS,
  KANA_SECTIONS,
  cellPositionKey,
  type KanaChartCell,
  type KanaConnector,
  type KanaScript,
  type KanaSectionDef,
} from "./kana-chart-data";
import { KANA_STROKE_ASSET } from "./kana-stroke-guidance";
import styles from "./kana-chart.module.css";

interface KanaChartProps {
  script: KanaScript;
  selectedKey: string | null;
  drawerId: string;
  onSelect: (cell: KanaChartCell, trigger: HTMLButtonElement) => void;
  registerCell: (key: string, el: HTMLButtonElement | null) => void;
}

const RELATIONS = {
  upper: [
    "Thêm dấu đục ゛ (dakuten): hàng K → G, S → Z, T → D, H → B.",
    "Thêm dấu bán đục ゜ (handakuten): hàng H → P.",
  ],
  lower: [
    "Âm ghép là chữ ở cột i cộng ゃ / ゅ / ょ cỡ nhỏ (hoặc ャ / ュ / ョ trong Katakana).",
    "Thêm ゛ vào chữ đầu: KY → GY, SH → J, HY → BY; thêm ゜: HY → PY.",
  ],
};

function SectionGrid({
  section,
  script,
  selectedKey,
  drawerId,
  onSelect,
  registerCell,
}: KanaChartProps & { section: KanaSectionDef }) {
  const cells = KANA_CELLS[script].filter((c) => c.section === section.key);
  const headingId = `kana-chart-${section.key}`;
  return (
    <section className={styles.chart} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.chartTitle}>{section.title}</h3>
      <div
        className={styles.grid}
        role="group"
        aria-labelledby={headingId}
        style={{ gridTemplateColumns: `var(--head-w) repeat(${section.cols.length}, var(--tile))` }}
      >
        {section.cols.map((col, i) => (
          <span key={col} className={styles.colHead} style={{ gridColumn: i + 2, gridRow: 1 }}>
            {col}
          </span>
        ))}
        {section.rows.map((row) => (
          <span key={row.key} className={styles.rowHead} style={{ gridColumn: 1, gridRow: row.gridRow }} lang={row.label === "ん" ? "ja" : undefined}>
            {row.label}
          </span>
        ))}
        {cells.map((cell) => {
          const key = cellPositionKey(cell);
          const selected = selectedKey === key;
          return (
            <button
              key={cell.id}
              ref={(el) => registerCell(key, el)}
              type="button"
              aria-pressed={selected}
              aria-controls={drawerId}
              aria-label={`${cell.glyph}, đọc là ${cell.romaji}`}
              className={`${styles.cell} ${selected ? styles.cellActive : ""}`}
              style={{ gridColumn: cell.gridColumn, gridRow: cell.gridRow }}
              onClick={(e) => onSelect(cell, e.currentTarget)}
            >
              <span className={styles.glyph} lang="ja">{cell.glyph}</span>
              <span className={`${styles.romaji} ${cell.special ? styles.romajiSpecial : ""}`}>{cell.romaji}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ConnectorColumn({ connectors }: { connectors: KanaConnector[] }) {
  return (
    <div className={styles.connectorCol} aria-hidden="true">
      <div className={styles.connectorSpacer} />
      <div className={styles.connectorGrid}>
        {connectors.map((c) => (
          <span
            key={c.id}
            className={c.fromRow === c.toRow ? styles.connectorStraight : styles.connectorBranch}
            style={{ gridRow: `${c.fromRow} / ${c.toRow + 1}` }}
          />
        ))}
      </div>
    </div>
  );
}

const PAIR_TITLES = {
  upper: { title: "Âm cơ bản, âm đục và bán đục", ja: "清音・濁音・半濁音" },
  lower: { title: "Âm ghép (Yōon)", ja: "拗音" },
};

function ChartPair({
  upper,
  ...props
}: KanaChartProps & { upper: boolean }) {
  const [basic, voiced] = upper ? [KANA_SECTIONS[0], KANA_SECTIONS[1]] : [KANA_SECTIONS[2], KANA_SECTIONS[3]];
  const connectors = upper ? KANA_CONNECTORS.upper : KANA_CONNECTORS.lower;
  const relations = upper ? RELATIONS.upper : RELATIONS.lower;
  return (
    <div className={styles.pairWrap}>
      <div className={styles.trayHeader}>
        <h2 className={styles.trayTitle}>{(upper ? PAIR_TITLES.upper : PAIR_TITLES.lower).title}</h2>
        <span className={styles.trayJa} lang="ja">{(upper ? PAIR_TITLES.upper : PAIR_TITLES.lower).ja}</span>
      </div>
      <div className={styles.pair}>
        <SectionGrid section={basic} {...props} />
        <ConnectorColumn connectors={connectors} />
        <SectionGrid section={voiced} {...props} />
      </div>
      <ul className={styles.relations} aria-label="Quy luật biến đổi âm">
        {relations.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </div>
  );
}

/** One shared credit for the whole chart page (not per drawer or section). */
function StrokeAttribution() {
  const { name, license, url, licenseUrl } = KANA_STROKE_ASSET.source;
  return (
    <p className={styles.attribution} data-kana-stroke-attribution>
      Hướng dẫn thứ tự nét viết dùng dữ liệu từ{" "}
      <a href={url} target="_blank" rel="noopener noreferrer">{name}</a>{" "}
      (<a href={licenseUrl} target="_blank" rel="noopener noreferrer">{license}</a>). Hiện chưa có hướng dẫn nét cho mọi chữ Kana.
    </p>
  );
}

export function KanaChart(props: KanaChartProps) {
  return (
    <div className={styles.chartArea}>
      <ChartPair upper {...props} />
      <ChartPair upper={false} {...props} />
      <StrokeAttribution />
    </div>
  );
}
