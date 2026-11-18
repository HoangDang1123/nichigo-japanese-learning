"use client";

import * as React from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { skillsApi } from "../../../api/skills";
import { EmptyState } from "../../states/empty-state";
import { ErrorState } from "../../states/error-state";
import shared from "../shared/skills-detail.module.css";
import {
  INITIAL_LIST_STATE,
  errorMessage,
  kanjiListReducer,
  kanjiQuery,
  type KanjiEntry,
  type KanjiListState,
} from "./kanji-data";
import { KanjiIntro } from "./kanji-intro";
import { KanjiGridSkeleton } from "./kanji-skeleton";
import styles from "./kanji.module.css";

const SEARCH_DEBOUNCE_MS = 350;

/** Container: owns search, cursor pagination and request ordering. Reads only; no Guest identity is created. */
export function KanjiOverview() {
  const [input, setInput] = React.useState("");
  const [submitted, setSubmitted] = React.useState("");
  const [attempt, setAttempt] = React.useState(0);
  const [state, dispatch] = React.useReducer(kanjiListReducer, INITIAL_LIST_STATE);
  const seqRef = React.useRef(0);
  const controllerRef = React.useRef<AbortController | null>(null);

  // Debounce only the keystrokes; it is not a loading delay.
  React.useEffect(() => {
    const trimmed = input.trim();
    if (trimmed === submitted) return;
    const timer = setTimeout(() => setSubmitted(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, submitted]);

  // A new search (or retry) resets list and cursor; results of any older request are dropped by `seq`.
  React.useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    const seq = ++seqRef.current;
    dispatch({ type: "search", seq, query: submitted });
    skillsApi.items(kanjiQuery(submitted, null), controller.signal).then(
      (page) => dispatch({ type: "loaded", seq, append: false, page }),
      (error: unknown) => { if (!controller.signal.aborted) dispatch({ type: "failed", seq, append: false, message: errorMessage(error) }); },
    );
    return () => controller.abort();
  }, [submitted, attempt]);

  const loadMore = React.useCallback(() => {
    if (state.nextCursor === null || state.loadingMore || state.status !== "ready") return;
    const controller = controllerRef.current;
    if (!controller || controller.signal.aborted) return;
    const seq = state.seq;
    dispatch({ type: "more", seq });
    skillsApi.items(kanjiQuery(state.query, state.nextCursor), controller.signal).then(
      (page) => dispatch({ type: "loaded", seq, append: true, page }),
      (error: unknown) => { if (!controller.signal.aborted) dispatch({ type: "failed", seq, append: true, message: errorMessage(error) }); },
    );
  }, [state.nextCursor, state.loadingMore, state.status, state.seq, state.query]);

  return (
    <KanjiOverviewView
      state={state}
      searchValue={input}
      onSearchChange={setInput}
      onRetry={() => setAttempt((n) => n + 1)}
      onLoadMore={loadMore}
    />
  );
}

export interface KanjiOverviewViewProps {
  state: KanjiListState;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRetry: () => void;
  onLoadMore: () => void;
}

export function KanjiOverviewView({ state, searchValue, onSearchChange, onRetry, onLoadMore }: KanjiOverviewViewProps) {
  const searching = state.query !== "";
  return (
    <div className={shared.page}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <ol>
          <li><Link href="/skills">Kỹ năng</Link></li>
          <li aria-current="page">Kanji</li>
        </ol>
      </nav>

      <header className={shared.pageHeader}>
        <div className={shared.pageTitleRow}>
          <h1 className={shared.pageTitle}>Kanji</h1>
          <span className={shared.pageJapaneseTitle} lang="ja">漢字</span>
        </div>
        <p className={shared.pageDescription}>Kanji là chữ Hán trong tiếng Nhật. Chọn một chữ để xem nghĩa và cách đọc của nó.</p>
      </header>

      <KanjiIntro />

      <div className={styles.searchRow}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon} aria-hidden="true"><Search size={15} /></span>
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") onSearchChange(""); }}
            placeholder="Tìm chữ Kanji hoặc nghĩa…"
            aria-label="Tìm kiếm Kanji"
            className={styles.searchInput}
          />
          {searchValue && (
            <button type="button" className={styles.clearBtn} aria-label="Xóa tìm kiếm" onClick={() => onSearchChange("")}>
              <X size={12} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {state.status === "loading" && <KanjiGridSkeleton />}

      {state.status === "error" && (
        <ErrorState title="Không thể tải danh sách Kanji" description={state.error ?? ""} onRetry={onRetry} />
      )}

      {state.status === "ready" && state.items.length === 0 && (
        searching ? (
          <EmptyState
            title="Không tìm thấy chữ Kanji nào"
            description={`Không có kết quả cho "${state.query}". Thử từ khóa khác hoặc xóa tìm kiếm.`}
            action={<button type="button" className={styles.button} onClick={() => onSearchChange("")}>Xóa tìm kiếm</button>}
          />
        ) : (
          <EmptyState
            title="Chưa có Kanji nào được xuất bản"
            description="Nội dung Kanji chưa được xuất bản. NichiGo không hiển thị dữ liệu giả lập thay thế."
          />
        )
      )}

      {state.status === "ready" && state.items.length > 0 && (
        <>
          <p className={styles.summary} role="status">
            Đã tải {state.items.length} chữ Kanji{state.nextCursor !== null ? " · còn nội dung khác" : ""}
          </p>
          <ul className={styles.grid} aria-label="Danh sách Kanji">
            {state.items.map((entry) => <li key={entry.id}><KanjiCard entry={entry} /></li>)}
          </ul>
          {(state.nextCursor !== null || state.moreError) && (
            <div className={styles.actions}>
              {state.moreError && <p className={styles.inlineError} role="alert">{state.moreError}</p>}
              <button type="button" className={styles.button} onClick={onLoadMore} disabled={state.loadingMore} aria-busy={state.loadingMore}>
                {state.loadingMore ? "Đang tải…" : state.moreError ? "Thử tải lại" : "Tải thêm"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KanjiCard({ entry }: { entry: KanjiEntry }) {
  const label = entry.meaningVi ? `${entry.glyph} — ${entry.meaningVi}` : entry.glyph;
  return (
    <Link href={`/skills/kanji/${encodeURIComponent(entry.id)}`} className={styles.card} aria-label={label}>
      <span className={styles.glyph} lang="ja" aria-hidden="true">{entry.glyph}</span>
      <span className={styles.cardBody}>
        {entry.meaningVi && <span className={styles.meaning}>{entry.meaningVi}</span>}
      </span>
    </Link>
  );
}
