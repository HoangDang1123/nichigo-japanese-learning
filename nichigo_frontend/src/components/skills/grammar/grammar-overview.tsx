"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Search, X } from "lucide-react";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui";
import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";
import { GRAMMAR_CATEGORIES, GRAMMAR_PATTERNS } from "./grammar-data";
import { ALL_CATEGORIES, categoriesWithData, filterPatterns } from "./grammar-logic";
import { DemoBadge, FilterChip, PatternCard } from "./grammar-parts";
import type { GrammarCategory, GrammarPattern } from "./grammar-types";
import styles from "./grammar.module.css";

export type GrammarOverviewStatus = "ready" | "loading" | "error";

export interface GrammarOverviewProps {
  /** Only a future data source can be loading or failing; production pages pass "ready". */
  status?: GrammarOverviewStatus;
  categories?: readonly GrammarCategory[];
  patterns?: readonly GrammarPattern[];
  onRetry?: () => void;
}

export function GrammarOverviewSkeleton() {
  return (
    <SkeletonRegion label="Đang tải danh sách ngữ pháp…" className={styles.page}>
      <div className={styles.skeletonStack} aria-hidden="true">
        <Skeleton variant="line" width="min(60%, 14rem)" height="2.25rem" />
        <Skeleton variant="line" width="min(90%, 30rem)" />
        <Skeleton variant="block" height="2.75rem" className={styles.skeletonSearch} />
        <div className={styles.skeletonCategories}>
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} variant="block" height="2.25rem" width="6rem" />)}
        </div>
        <div className={styles.skeletonGrid}>{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} variant="block" height="10rem" />)}</div>
      </div>
    </SkeletonRegion>
  );
}

export function GrammarOverview({
  status = "ready",
  categories = GRAMMAR_CATEGORIES,
  patterns = GRAMMAR_PATTERNS,
  onRetry,
}: GrammarOverviewProps) {
  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState(ALL_CATEGORIES);
  const inputId = React.useId();

  if (status === "loading") return <GrammarOverviewSkeleton />;

  const visibleCategories = categoriesWithData(categories, patterns);
  const results = filterPatterns(patterns, categories, categoryId, query);
  const isFiltered = query.trim() !== "" || categoryId !== ALL_CATEGORIES;
  const selectedCategory = categories.find((c) => c.id === categoryId);

  const reset = () => {
    setQuery("");
    setCategoryId(ALL_CATEGORIES);
  };

  return (
    <div className={styles.page}>
      <Link href="/skills" className={styles.backLink}>
        <ArrowLeft size={15} aria-hidden="true" />
        Kỹ năng
      </Link>

      <header className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <h1 className={styles.pageTitle}>Ngữ pháp</h1>
          <span className={styles.titleJa} lang="ja">文法</span>
          <DemoBadge />
        </div>
        <p className={styles.pageDescription}>
          Tra cứu các mẫu ngữ pháp tiếng Nhật: cấu trúc, cách dùng và câu ví dụ.
        </p>
      </header>

      {status === "error" ? (
        <ErrorState
          title="Không thể tải ngữ pháp"
          description="Danh sách ngữ pháp hiện chưa tải được. Vui lòng thử lại."
          onRetry={onRetry}
        />
      ) : patterns.length === 0 ? (
        <EmptyState title="Chưa có mẫu ngữ pháp" description="Nội dung ngữ pháp sẽ xuất hiện tại đây khi được xuất bản." />
      ) : (
        <>
          <div className={styles.searchBox}>
            <label htmlFor={inputId} className={styles.searchLabel}>Tìm mẫu ngữ pháp</label>
            <div className={styles.searchField}>
              <Search size={18} aria-hidden="true" className={styles.searchIcon} />
              <input
                id={inputId}
                type="search"
                className={styles.searchInput}
                value={query}
                placeholder="Ví dụ: は, trợ từ, quá khứ"
                autoComplete="off"
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className={styles.searchClear} aria-label="Xóa tìm kiếm" onClick={() => setQuery("")}>
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className={styles.filterGroup} role="group" aria-label="Lọc theo nhóm ngữ pháp">
            <FilterChip label="Tất cả" selected={categoryId === ALL_CATEGORIES} onSelect={() => setCategoryId(ALL_CATEGORIES)} />
            {visibleCategories.map((c) => (
              <FilterChip key={c.id} label={c.titleVi} selected={categoryId === c.id} onSelect={() => setCategoryId(c.id)} />
            ))}
          </div>

          <p className={styles.resultCount} role="status">
            {results.length} mẫu{selectedCategory ? ` · ${selectedCategory.titleVi}` : ""}{query.trim() ? " phù hợp" : ""}
          </p>

          {results.length === 0 ? (
            <EmptyState
              title="Không tìm thấy mẫu ngữ pháp phù hợp"
              description="Thử từ khóa khác, hoặc chọn nhóm khác."
              action={isFiltered ? <Button variant="outline" onClick={reset}>Xóa bộ lọc</Button> : undefined}
            />
          ) : (
            <div className={styles.patternGridWrap}><ul className={styles.patternGrid} aria-label="Danh sách mẫu ngữ pháp">
              {results.map((p) => (
                <li key={p.id}><PatternCard pattern={p} categories={categories} /></li>
              ))}
            </ul></div>
          )}
        </>
      )}
    </div>
  );
}
