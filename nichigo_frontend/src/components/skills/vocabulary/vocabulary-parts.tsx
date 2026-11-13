"use client";

import * as React from "react";
import { Bookmark, BookmarkCheck, Eye, EyeOff, Volume2 } from "lucide-react";
import { RELATION_LABELS, STATE_LABELS, relatedWords } from "./vocabulary-logic";
import type { LearningState, VocabularyWord } from "./vocabulary-types";
import styles from "./vocabulary.module.css";

export function BookmarkButton({
  word,
  saved,
  onToggle,
}: {
  word: VocabularyWord;
  saved: boolean;
  onToggle: (wordId: string) => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.iconButton} ${saved ? styles.iconButtonActive : ""}`}
      aria-pressed={saved}
      aria-label={saved ? `Bỏ lưu từ ${word.surface}` : `Lưu từ ${word.surface}`}
      title={saved ? "Bỏ lưu" : "Lưu từ"}
      onClick={() => onToggle(word.id)}
    >
      {saved ? <BookmarkCheck size={20} aria-hidden="true" /> : <Bookmark size={20} aria-hidden="true" />}
    </button>
  );
}

/** Audio is not implemented: the control stays disabled but is announced. */
export function PronunciationButton({ word }: { word: VocabularyWord }) {
  return (
    <button
      type="button"
      className={styles.iconButton}
      disabled
      aria-label={`Phát âm từ ${word.surface} (chưa khả dụng)`}
      title="Phát âm chưa khả dụng"
    >
      <Volume2 size={20} aria-hidden="true" />
    </button>
  );
}

export function StateBadge({ state }: { state: LearningState }) {
  return (
    <span className={`${styles.stateBadge} ${styles[`state_${state}`]}`}>
      {STATE_LABELS[state]}
    </span>
  );
}

export function WordHeading({ word, size = "lg" }: { word: VocabularyWord; size?: "lg" | "md" }) {
  const showReading = word.reading !== word.surface;
  return (
    <div className={styles.wordHeading}>
      <span className={size === "lg" ? styles.surfaceLg : styles.surfaceMd} lang="ja">
        {word.surface}
      </span>
      {showReading && (
        <span className={styles.kanaReading} lang="ja">
          {word.reading}
        </span>
      )}
      <span className={styles.romaji}>{word.romaji}</span>
    </div>
  );
}

/**
 * Example sentence. Rōmaji is optional and hidden by default; the toggle only exists when the
 * word has curated reading data. Callers key this by word id so the state resets per word.
 */
export function ExampleBlock({ word }: { word: VocabularyWord }) {
  const [showReading, setShowReading] = React.useState(false);
  const hasReading = Boolean(word.exampleRomaji);
  return (
    <section className={styles.example} aria-label="Ví dụ">
      <p className={styles.exampleJa} lang="ja">{word.exampleJa}</p>
      {hasReading && showReading && <p className={styles.exampleRomaji}>{word.exampleRomaji}</p>}
      <p className={styles.exampleVi}>{word.exampleVi}</p>
      {hasReading && (
        <button
          type="button"
          className={styles.readingToggle}
          aria-expanded={showReading}
          onClick={() => setShowReading((v) => !v)}
        >
          {showReading ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          {showReading ? "Ẩn cách đọc" : "Hiện cách đọc"}
        </button>
      )}
    </section>
  );
}

export function RelatedWords({
  wordId,
  savedIds,
  onSelect,
}: {
  wordId: string;
  savedIds?: ReadonlySet<string>;
  onSelect?: (id: string) => void;
}) {
  const groups = relatedWords(wordId);
  return (
    <section className={styles.related} aria-labelledby={`related-${wordId}`}>
      <h3 id={`related-${wordId}`} className={styles.relatedTitle}>Từ liên quan</h3>
      {groups.length === 0 ? (
        <p className={styles.muted}>Chưa có từ liên quan trong dữ liệu minh họa.</p>
      ) : (
        groups.map((group) => (
          <div key={group.type} className={styles.relatedGroup}>
            <h4 className={styles.relatedLabel}>{RELATION_LABELS[group.type]}</h4>
            <ul className={styles.relatedList}>
              {group.words.map((w) => {
                const inner = (
                  <>
                    <span className={styles.relatedJa} lang="ja">{w.surface}</span>
                    <span className={styles.relatedVi}>{w.meaningVi}</span>
                    {savedIds?.has(w.id) && <span className={styles.relatedSaved}>Đã lưu</span>}
                  </>
                );
                return (
                  <li key={w.id}>
                    {onSelect ? (
                      <button type="button" className={styles.relatedChip} onClick={() => onSelect(w.id)}>
                        {inner}
                      </button>
                    ) : (
                      <span className={styles.relatedChip}>{inner}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
