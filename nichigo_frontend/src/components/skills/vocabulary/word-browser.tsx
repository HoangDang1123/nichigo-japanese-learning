"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Search, X } from "lucide-react";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui";
import { VOCABULARY_TOPICS, VOCABULARY_WORDS, getDiscoveryWords } from "./vocabulary-data";
import { searchWords, stateOf } from "./vocabulary-logic";
import {
  BookmarkButton,
  ExampleBlock,
  PronunciationButton,
  RelatedWords,
  StateBadge,
  WordHeading,
} from "./vocabulary-parts";
import { useVocabulary } from "./vocabulary-provider";
import type { VocabularyWord } from "./vocabulary-types";
import styles from "./vocabulary.module.css";


const COPY = {
  explore: {
    title: "Khám phá từ vựng",
    desc: "Tìm theo chữ Nhật, kana, romaji hoặc nghĩa tiếng Việt.",
    label: "Tìm từ vựng",
    placeholder: "Ví dụ: 学校, gakkō, ohayo, cảm ơn",
  },
  saved: {
    title: "Từ đã lưu",
    desc: "Từ bạn đã đánh dấu. Lưu từ không có nghĩa là đã học từ đó.",
    label: "Tìm trong từ đã lưu",
    placeholder: "Tìm trong từ đã lưu",
  },
} as const;

export function WordBrowser({ mode }: { mode: "explore" | "saved" }) {
  const { bookmarks, progress, toggleBookmark: onToggleBookmark } = useVocabulary();
  const copy = COPY[mode];
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const inputId = React.useId();

  React.useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const source = React.useMemo<readonly VocabularyWord[]>(
    () => (mode === "saved" ? VOCABULARY_WORDS.filter((w) => bookmarks.has(w.id)) : VOCABULARY_WORDS),
    [mode, bookmarks]
  );
  // Explore with an empty query shows a small curated discovery list instead of the whole catalogue.
  const isDiscovery = mode === "explore" && query.trim() === "";
  const results = React.useMemo(
    () => (isDiscovery ? getDiscoveryWords() : searchWords(query, source)),
    [isDiscovery, query, source]
  );
  // A chosen word (also one reached through a related-word link) stays selected while it is
  // available; otherwise fall back to the first result, so unbookmarking in Saved moves on.
  const selected = source.find((w) => w.id === selectedId) ?? results[0] ?? null;

  const selectRelated = (id: string) => {
    setQuery("");
    setSelectedId(id);
  };

  const savedIsEmpty = mode === "saved" && source.length === 0;

  return (
    <div className={styles.page}>
      <Link href="/skills/vocabulary" className={styles.backLink}>
        <ArrowLeft size={15} aria-hidden="true" />
        Từ vựng
      </Link>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle} ref={headingRef} tabIndex={-1}>{copy.title}</h1>
        <p className={styles.pageDescription}>{copy.desc}</p>
      </header>

      {savedIsEmpty ? (
        <EmptyState
          title="Chưa có từ nào được lưu"
          description="Nhấn biểu tượng đánh dấu trên một từ để lưu lại và xem lại tại đây."
          action={<Link href="/skills/vocabulary/explore" className={styles.linkButton}>Khám phá từ vựng</Link>}
        />
      ) : (
        <>
          <div className={styles.searchBox}>
            <label htmlFor={inputId} className={styles.searchLabel}>{copy.label}</label>
            <div className={styles.searchField}>
              <Search size={18} aria-hidden="true" className={styles.searchIcon} />
              <input
                id={inputId}
                type="search"
                className={styles.searchInput}
                value={query}
                placeholder={copy.placeholder}
                autoComplete="off"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedId(null);
                }}
              />
              {query && (
                <button type="button" className={styles.searchClear} aria-label="Xóa tìm kiếm" onClick={() => {
                    setQuery("");
                    setSelectedId(null);
                  }}>
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>
            <p className={styles.resultCount} role="status">
              {isDiscovery ? `Gợi ý cho bạn · ${results.length} từ` : `${results.length} từ${query ? " phù hợp" : ""}`}
            </p>
          </div>

          {results.length === 0 ? (
            <EmptyState
              title="Không tìm thấy từ phù hợp"
              description="Thử chữ Nhật, kana, romaji hoặc nghĩa tiếng Việt khác."
              action={<Button variant="outline" onClick={() => { setQuery(""); setSelectedId(null); }}>Xóa tìm kiếm</Button>}
            />
          ) : (
            <div className={styles.masterDetail}>
              <ul className={styles.resultList} aria-label={isDiscovery ? "Từ gợi ý" : "Kết quả"}>
                {results.map((w) => {
                  const current = selected?.id === w.id;
                  return (
                    <li key={w.id}>
                      <button
                        type="button"
                        className={`${styles.resultItem} ${current ? styles.resultItemCurrent : ""}`}
                        aria-current={current ? "true" : undefined}
                        onClick={() => setSelectedId(w.id)}
                      >
                        <span className={styles.resultJa} lang="ja">{w.surface}</span>
                        <span className={styles.resultMeta}>
                          <span className={styles.resultRomaji}>{w.romaji}</span>
                          <span className={styles.resultMeaning}>{w.meaningVi}</span>
                        </span>
                        {bookmarks.has(w.id) && <span className={styles.savedDot} title="Đã lưu">Đã lưu</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {selected && (
                <article className={styles.detail} aria-label={`Chi tiết từ ${selected.surface}`}>
                  <div className={styles.wordTools}>
                    {selected.partOfSpeech && <span className={styles.pos}>{selected.partOfSpeech}</span>}
                    <span className={styles.toolSpacer} />
                    <PronunciationButton word={selected} />
                    <BookmarkButton word={selected} saved={bookmarks.has(selected.id)} onToggle={onToggleBookmark} />
                  </div>
                  <WordHeading word={selected} size="lg" />
                  <p className={styles.meaning}>{selected.meaningVi}</p>
                  <dl className={styles.statusRow}>
                    <div>
                      <dt>Tiến độ học</dt>
                      <dd><StateBadge state={stateOf(progress, selected.id)} /></dd>
                    </div>
                    <div>
                      <dt>Đánh dấu</dt>
                      <dd>{bookmarks.has(selected.id) ? "Đã lưu" : "Chưa lưu"}</dd>
                    </div>
                    <div>
                      <dt>Chủ đề</dt>
                      <dd>{topicName(selected.topicId)}</dd>
                    </div>
                  </dl>
                  <ExampleBlock key={selected.id} word={selected} />
                  <RelatedWords
                    wordId={selected.id}
                    savedIds={bookmarks}
                    onSelect={mode === "explore" ? selectRelated : undefined}
                  />
                </article>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function topicName(topicId: string): string {
  return VOCABULARY_TOPICS.find((t) => t.id === topicId)?.title ?? topicId;
}
