import * as React from "react";
import { MousePointerClick, Volume2, X } from "lucide-react";
import type { KanaChartCell } from "./kana-chart-data";
import { KanaStudyGrid } from "./kana-study-grid";
import styles from "./kana-drawer.module.css";

export interface KanaIllustration {
  src: string;
  alt: string;
}

interface KanaDrawerProps {
  /** Selected cell; null shows the empty (docked-only) state. */
  cell: KanaChartCell | null;
  id: string;
  /** "sheet" = bottom sheet on narrow screens; "docked" = nonmodal side panel. */
  mode: "sheet" | "docked";
  headingRef?: React.Ref<HTMLHeadingElement>;
  onClose: () => void;
  /** Optional future illustration; rendered only when supplied. */
  illustration?: KanaIllustration;
}

/** Pronunciation is a planned feature. The button is a disabled visual placeholder: no audio, TTS or API. */
const SOUND_COMING_SOON = "Phát âm — sắp ra mắt";

export function KanaDrawer({ cell, id, mode, headingRef, onClose, illustration }: KanaDrawerProps) {
  const headingId = `${id}-heading`;
  const slot = illustration ? (
    <div className={styles.slot} data-slot="kana-illustration">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.illustration} src={illustration.src} alt={illustration.alt} />
    </div>
  ) : null;

  return (
    <div className={styles.column}>
      <aside
        id={id}
        className={styles.box}
        role={mode === "sheet" ? "dialog" : "complementary"}
        aria-labelledby={headingId}
      >
        <div className={styles.wall}>
        <div className={styles.liner}>
          {!cell ? (
            <>
              <div className={styles.empty}>
                <MousePointerClick size={28} aria-hidden="true" />
                <h2 id={headingId} className={styles.emptyTitle}>Chọn một chữ</h2>
                <p className={styles.muted}>Xem cách đọc, cách viết và từ ví dụ.</p>
              </div>
              {slot}
            </>
          ) : (
            <>
              {/* A. Character and pronunciation */}
              <div className={styles.header}>
                <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.identity}>
                  {/* One frame holds the glyph with its romaji directly underneath */}
                  <span className={styles.bigPlaque} data-kana-frame="">
                    <span
                      className={`${styles.bigGlyph} ${[...cell.glyph].length > 1 ? styles.bigGlyphCompact : ""}`}
                      lang="ja"
                    >
                      {cell.glyph}
                    </span>
                    <span className={`${styles.reading} ${cell.special ? styles.special : ""}`}>{cell.romaji}</span>
                  </span>
                </h2>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.sound}
                    disabled
                    aria-label={SOUND_COMING_SOON}
                    title={SOUND_COMING_SOON}
                    data-feature="pronunciation-coming-soon"
                  >
                    <Volume2 size={18} aria-hidden="true" />
                  </button>
                  <button type="button" className={styles.close} onClick={onClose} aria-label="Đóng chi tiết chữ">
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {slot}

              {/* B. Writing guidance */}
              <div className={styles.card}>
                <KanaStudyGrid cell={cell} />
              </div>

              {/* C. Example — dictionary style: word, italic romaji (only when verified data has it), meaning */}
              <section className={`${styles.card} ${styles.example}`} aria-label="Từ ví dụ">
                {cell.example ? (
                  <>
                    <div className={styles.exampleWord} lang="ja">{cell.example.word}</div>
                    {cell.example.reading && <div className={styles.exampleRomaji}>{cell.example.reading}</div>}
                    <div className={styles.exampleMeaning}>{cell.example.meaning}</div>
                  </>
                ) : (
                  <p className={styles.muted}>Chưa có từ ví dụ đã được xác minh cho chữ này.</p>
                )}
              </section>
            </>
          )}
        </div>
        </div>
      </aside>
    </div>
  );
}
