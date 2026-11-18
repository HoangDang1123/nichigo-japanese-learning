"use client";

import * as React from "react";
import Link from "next/link";
import { Search, X, ChevronRight, Lock, BookOpen, LayoutGrid, BarChart3, Star } from "lucide-react";
import { skillsApi } from "../../../api/skills";
import { ErrorState } from "../../states/error-state";
import { EmptyState } from "../../states/empty-state";
import type { SkillFilterGroup } from "../shared/skills-categories";
import {
  LOADING_STATE,
  backendStatus,
  filterEntries,
  loadDirectory,
  usesDemoData,
  type DirectoryEntry,
  type DirectoryState,
} from "./skills-directory";
import { SkillsSkeleton } from "./skills-skeleton";
import styles from "./skills-overview.module.css";

// ---------------------------------------------------------------------------
// Filter groups
// ---------------------------------------------------------------------------
interface FilterOption {
  value: SkillFilterGroup | "all";
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tất cả", icon: LayoutGrid },
  { value: "foundational", label: "Học cơ bản", icon: BookOpen },
  { value: "language-skills", label: "Luyện kỹ năng", icon: BarChart3 },
  { value: "review", label: "Ôn tập", icon: Star },
];

const SECTIONS: { group: SkillFilterGroup; number: string; title: string }[] = [
  { group: "foundational", number: "01", title: "Kiến thức nền tảng" },
  { group: "language-skills", number: "02", title: "Kỹ năng ngôn ngữ" },
  { group: "review", number: "03", title: "Công cụ ôn tập" },
];

// ---------------------------------------------------------------------------
// Decorative hero SVG (top-right of header)
// ---------------------------------------------------------------------------
function HeroArt() {
  const blossoms = [
    [196, 48], [180, 62], [204, 70], [166, 52], [150, 40], [188, 34],
  ];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 220 130"
      preserveAspectRatio="xMaxYMid meet"
      aria-hidden="true"
      focusable="false"
      className={styles.headerArt}
    >
      {/* Mist clouds */}
      <ellipse cx="40" cy="92" rx="34" ry="5" fill="#f3b6cb" opacity="0.25" />
      <ellipse cx="96" cy="60" rx="26" ry="4" fill="#f3b6cb" opacity="0.22" />
      {/* Fuji */}
      <polygon points="80,104 118,30 156,104" fill="#e8929b" opacity="0.38" />
      <polygon points="118,30 128,50 122,46 118,54 112,46 108,50" fill="#fff9fb" opacity="0.8" />
      {/* Seigaiha waves */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <path
            key={`${row}-${col}`}
            d={`M ${70 + col * 22 + (row % 2) * 11} ${112 + row * 6} a 11 11 0 0 1 22 0`}
            fill="none"
            stroke="#e8929b"
            strokeWidth="1"
            opacity="0.4"
          />
        ))
      )}
      {/* Branch */}
      <path d="M 220 58 C 200 52 186 54 168 44 C 160 40 154 38 146 36" stroke="#983b62" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M 186 54 C 182 64 178 68 174 74" stroke="#983b62" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.45" />
      {blossoms.map(([cx, cy], i) => (
        <g key={i} opacity="0.85">
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx={cx} cy={cy - 4} rx="2.6" ry="4" fill="#f3b6cb" transform={`rotate(${r} ${cx} ${cy})`} />
          ))}
          <circle cx={cx} cy={cy} r="1.3" fill="#983b62" opacity="0.6" />
        </g>
      ))}
      <ellipse cx="140" cy="84" rx="3" ry="1.8" fill="#f3b6cb" opacity="0.5" transform="rotate(-25 140 84)" />
      <ellipse cx="160" cy="100" rx="2.5" ry="1.5" fill="#f3b6cb" opacity="0.4" transform="rotate(15 160 100)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Per-card decorative SVGs
// ---------------------------------------------------------------------------
function KanaDecor() {
  return (
    <svg viewBox="0 0 70 70" width="62" height="62" aria-hidden="true" focusable="false" className={styles.cardDecorSvg}>
      {/* Cherry blossom petals */}
      {[0, 72, 144, 216, 288].map((angle, i) => {
        const r = 22;
        const x = 35 + r * Math.cos((angle * Math.PI) / 180);
        const y = 35 + r * Math.sin((angle * Math.PI) / 180);
        return <ellipse key={i} cx={x} cy={y} rx="10" ry="6" fill="#f3b6cb" opacity="0.75" transform={`rotate(${angle + 90} ${x} ${y})`} />;
      })}
      <circle cx="35" cy="35" r="5" fill="#983b62" opacity="0.4" />
    </svg>
  );
}

function VocabularyDecor() {
  return (
    <svg viewBox="0 0 70 70" width="62" height="62" aria-hidden="true" focusable="false" className={styles.cardDecorSvg}>
      {/* Bamboo stalks */}
      <rect x="20" y="10" width="8" height="50" rx="3" fill="#983b62" opacity="0.2" />
      <rect x="32" y="18" width="8" height="42" rx="3" fill="#983b62" opacity="0.25" />
      <rect x="44" y="8" width="8" height="52" rx="3" fill="#983b62" opacity="0.2" />
      {/* Nodes */}
      <rect x="19" y="30" width="10" height="3" rx="1.5" fill="#983b62" opacity="0.3" />
      <rect x="31" y="40" width="10" height="3" rx="1.5" fill="#983b62" opacity="0.3" />
      <rect x="43" y="25" width="10" height="3" rx="1.5" fill="#983b62" opacity="0.3" />
    </svg>
  );
}

function GrammarDecor() {
  return (
    <svg viewBox="0 0 70 70" width="62" height="62" aria-hidden="true" focusable="false" className={styles.cardDecorSvg}>
      {/* Paper / scroll */}
      <rect x="12" y="10" width="46" height="50" rx="6" fill="#f3b6cb" opacity="0.3" />
      <rect x="12" y="10" width="46" height="10" rx="6" fill="#983b62" opacity="0.2" />
      {/* Lines */}
      <rect x="20" y="28" width="30" height="2.5" rx="1.25" fill="#983b62" opacity="0.25" />
      <rect x="20" y="36" width="22" height="2.5" rx="1.25" fill="#983b62" opacity="0.2" />
      <rect x="20" y="44" width="26" height="2.5" rx="1.25" fill="#983b62" opacity="0.2" />
    </svg>
  );
}

function KanjiDecor() {
  return (
    <svg viewBox="0 0 70 70" width="62" height="62" aria-hidden="true" focusable="false" className={styles.cardDecorSvg}>
      {/* Torii gate silhouette */}
      {/* Top crossbeam */}
      <rect x="8" y="18" width="54" height="6" rx="3" fill="#983b62" opacity="0.3" />
      {/* Sub crossbeam */}
      <rect x="16" y="28" width="38" height="4" rx="2" fill="#983b62" opacity="0.2" />
      {/* Left pillar */}
      <rect x="18" y="24" width="7" height="34" rx="3.5" fill="#983b62" opacity="0.25" />
      {/* Right pillar */}
      <rect x="45" y="24" width="7" height="34" rx="3.5" fill="#983b62" opacity="0.25" />
    </svg>
  );
}

function ListeningDecor() {
  return (
    <svg viewBox="0 0 70 70" width="62" height="62" aria-hidden="true" focusable="false" className={styles.cardDecorSvg}>
      {/* Sound waves */}
      {[14, 20, 26].map((r, i) => (
        <g key={i}>
          <path
            d={`M ${35 - r} ${35 - r * 0.7} A ${r} ${r * 0.7} 0 0 1 ${35 - r} ${35 + r * 0.7}`}
            stroke="#983b62"
            strokeWidth="3"
            fill="none"
            opacity={0.4 - i * 0.1}
            strokeLinecap="round"
          />
          <path
            d={`M ${35 + r} ${35 - r * 0.7} A ${r} ${r * 0.7} 0 0 0 ${35 + r} ${35 + r * 0.7}`}
            stroke="#983b62"
            strokeWidth="3"
            fill="none"
            opacity={0.4 - i * 0.1}
            strokeLinecap="round"
          />
        </g>
      ))}
      <circle cx="35" cy="35" r="5" fill="#983b62" opacity="0.3" />
    </svg>
  );
}

function SpeakingDecor() {
  return (
    <svg viewBox="0 0 70 70" width="62" height="62" aria-hidden="true" focusable="false" className={styles.cardDecorSvg}>
      {/* Speech bubble */}
      <rect x="10" y="12" width="44" height="32" rx="8" fill="#f3b6cb" opacity="0.4" />
      {/* Tail */}
      <polygon points="22,44 15,58 32,44" fill="#f3b6cb" opacity="0.4" />
      {/* Dots */}
      <circle cx="24" cy="28" r="4" fill="#983b62" opacity="0.3" />
      <circle cx="35" cy="28" r="4" fill="#983b62" opacity="0.3" />
      <circle cx="46" cy="28" r="4" fill="#983b62" opacity="0.3" />
    </svg>
  );
}

function ReadingDecor() {
  return (
    <svg viewBox="0 0 70 70" width="62" height="62" aria-hidden="true" focusable="false" className={styles.cardDecorSvg}>
      {/* Open book */}
      <path d="M35 20 C 25 18 10 22 10 22 L 10 55 C 10 55 25 51 35 55 C 45 51 60 55 60 55 L 60 22 C 60 22 45 18 35 20Z" fill="#f3b6cb" opacity="0.35" />
      {/* Spine */}
      <line x1="35" y1="20" x2="35" y2="55" stroke="#983b62" strokeWidth="2" opacity="0.3" />
      {/* Lines left page */}
      <line x1="15" y1="30" x2="30" y2="29" stroke="#983b62" strokeWidth="1.5" opacity="0.25" strokeLinecap="round" />
      <line x1="15" y1="37" x2="30" y2="36" stroke="#983b62" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
      <line x1="15" y1="44" x2="28" y2="43" stroke="#983b62" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
      {/* Lines right page */}
      <line x1="40" y1="29" x2="55" y2="30" stroke="#983b62" strokeWidth="1.5" opacity="0.25" strokeLinecap="round" />
      <line x1="40" y1="36" x2="55" y2="37" stroke="#983b62" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
      <line x1="40" y1="43" x2="52" y2="44" stroke="#983b62" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
    </svg>
  );
}

function WritingDecor() {
  return (
    <svg viewBox="0 0 70 70" width="62" height="62" aria-hidden="true" focusable="false" className={styles.cardDecorSvg}>
      {/* Brush stroke */}
      <path
        d="M 15 55 Q 25 30 35 20 Q 42 14 50 18 Q 58 22 55 32 Q 50 44 35 52 Q 22 58 15 55Z"
        fill="#f3b6cb"
        opacity="0.35"
      />
      {/* Brush tip */}
      <path d="M 50 18 Q 55 12 58 10 Q 56 16 52 20Z" fill="#983b62" opacity="0.4" />
      {/* Ink drip suggestion */}
      <circle cx="22" cy="52" r="3" fill="#983b62" opacity="0.2" />
    </svg>
  );
}

function FlashcardsDecor() {
  return (
    <svg viewBox="0 0 70 70" width="62" height="62" aria-hidden="true" focusable="false" className={styles.cardDecorSvg}>
      {/* Stacked cards */}
      <rect x="14" y="22" width="42" height="28" rx="5" fill="#f3b6cb" opacity="0.25" transform="rotate(-8 35 36)" />
      <rect x="14" y="22" width="42" height="28" rx="5" fill="#f3b6cb" opacity="0.35" transform="rotate(-3 35 36)" />
      <rect x="14" y="22" width="42" height="28" rx="5" fill="#f3b6cb" opacity="0.5" />
      {/* Top card content lines */}
      <rect x="22" y="30" width="26" height="3" rx="1.5" fill="#983b62" opacity="0.25" />
      <rect x="22" y="38" width="18" height="3" rx="1.5" fill="#983b62" opacity="0.2" />
    </svg>
  );
}

function CardDecorSvg({ categoryKey }: { categoryKey: string }) {
  switch (categoryKey) {
    case "kana": return <KanaDecor />;
    case "vocabulary": return <VocabularyDecor />;
    case "grammar": return <GrammarDecor />;
    case "kanji": return <KanjiDecor />;
    case "listening": return <ListeningDecor />;
    case "speaking": return <SpeakingDecor />;
    case "reading": return <ReadingDecor />;
    case "writing": return <WritingDecor />;
    case "flashcards": return <FlashcardsDecor />;
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Individual card
// ---------------------------------------------------------------------------
function SkillCard({ entry }: { entry: DirectoryEntry }) {
  const category = entry.meta;
  const status = backendStatus(entry);
  const isDemo = category.availability === "demo";
  const isPlanned = category.availability === "planned";

  const artArea = (
    <div className={styles.cardArt}>
      <span
        className={`${styles.cardMarker} ${category.markerFont === "serif" ? styles.cardMarkerSerif : styles.cardMarkerSans}`}
        lang="ja"
        aria-hidden="true"
      >
        {category.marker}
      </span>
      <CardDecorSvg categoryKey={category.key} />
    </div>
  );

  const bodyArea = (
    <div className={styles.cardBody}>
      <h3 className={styles.cardTitle}>{category.title}</h3>
      <span className={styles.cardSubtitle} lang="ja">{category.subtitle}</span>
      <p className={styles.cardDescription}>{category.description}</p>
      {usesDemoData(entry) && <p className={styles.cardNote}>Giao diện đang dùng dữ liệu minh họa</p>}
    </div>
  );

  const footerArea = (
    <div className={styles.cardFooter}>
      {status && (
        <span className={`${styles.cardStatus} ${status.tone === "published" ? styles.cardStatusPublished : ""}`}>
          {status.text}
        </span>
      )}
      {isDemo ? (
        <ChevronRight size={18} className={styles.cardChevron} aria-hidden="true" />
      ) : isPlanned ? (
        <span className={styles.badgePlanned}>Sắp ra mắt</span>
      ) : (
        <span className={styles.badgeUnavailable}>
          <Lock size={10} aria-hidden="true" />
          Chưa khả dụng
        </span>
      )}
    </div>
  );

  if (isDemo) {
    return (
      <Link
        href={category.href}
        className={`${styles.card} ${styles.cardClickable} ${styles[`tint${category.key}`] ?? ""}`}
        aria-label={`${category.title} — ${category.description}`}
      >
        {artArea}
        {bodyArea}
        {footerArea}
      </Link>
    );
  }

  return (
    <div
      className={`${styles.card} ${styles.cardUnavailable} ${styles[`tint${category.key}`] ?? ""}`}
      aria-label={`${category.title} — ${isPlanned ? "Sắp ra mắt" : "Chưa khả dụng"}`}
    >
      {artArea}
      {bodyArea}
      {footerArea}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
/** Container: loads GET /api/v1/skills once and supports retry. Reads only; no Guest identity is created. */
export function SkillsOverview() {
  const [state, setState] = React.useState<DirectoryState>(LOADING_STATE);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    loadDirectory((signal) => skillsApi.directory(signal), controller.signal).then(
      (next) => { if (!controller.signal.aborted) setState(next); },
      () => { /* cancelled: a newer request or unmount owns the state */ },
    );
    return () => controller.abort();
  }, [attempt]);

  const retry = React.useCallback(() => {
    setState(LOADING_STATE);
    setAttempt((value) => value + 1);
  }, []);

  return <SkillsOverviewView state={state} onRetry={retry} />;
}

export function SkillsOverviewView({ state, onRetry }: { state: DirectoryState; onRetry: () => void }) {
  if (state.status === "loading") return <SkillsSkeleton />;
  if (state.status === "error") {
    return (
      <div className={styles.container}>
        <ErrorState title="Không thể tải danh sách kỹ năng" description={state.message} onRetry={onRetry} />
      </div>
    );
  }
  if (state.entries.length === 0) {
    return (
      <div className={styles.container}>
        <EmptyState title="Chưa có dữ liệu kỹ năng" description="Máy chủ chưa trả về kỹ năng nào. NichiGo không hiển thị dữ liệu giả lập thay thế." />
      </div>
    );
  }
  return <SkillsDirectory entries={state.entries} />;
}

function SkillsDirectory({ entries }: { entries: DirectoryEntry[] }) {
  const [activeFilter, setActiveFilter] = React.useState<SkillFilterGroup | "all">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setSearchQuery("");
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredCategories = React.useMemo(
    () => filterEntries(entries, activeFilter, normalizedQuery),
    [entries, activeFilter, normalizedQuery],
  );

  return (
    <div className={styles.container}>
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Kỹ năng</h1>
          <p className={styles.pageSubtitle}>
            Luyện tập và củng cố từng mảng kiến thức tiếng Nhật.
          </p>
        </div>
        <HeroArt />
      </header>

      {/* ── Filter + search row ─────────────────────────────────────────────── */}
      <div className={styles.controlsRow}>
        <nav className={styles.filterGroup} aria-label="Lọc danh mục kỹ năng">
          {FILTER_OPTIONS.map((opt) => {
            const isActive = activeFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={isActive}
                className={`${styles.filterPill} ${isActive ? styles.filterPillActive : ""}`}
                onClick={() => setActiveFilter(opt.value as SkillFilterGroup | "all")}
              >
                <opt.icon size={16} className={styles.filterIcon} aria-hidden />
                {opt.label}
              </button>
            );
          })}
        </nav>

        <div className={styles.controlsSpacer} aria-hidden="true" />

        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon} aria-hidden="true">
            <Search size={15} />
          </span>
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Tìm kỹ năng, nội dung..."
            aria-label="Tìm kiếm danh mục kỹ năng"
            className={styles.searchInput}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className={styles.searchClearBtn}
              aria-label="Xóa tìm kiếm"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Card grid ───────────────────────────────────────────────────────── */}
      {filteredCategories.length > 0 ? (
        <div className={styles.sections} aria-live="polite" aria-atomic="false">
          {SECTIONS.map((section) => {
            const cats = filteredCategories.filter((e) => e.meta.filterGroup === section.group);
            if (cats.length === 0) return null;
            return (
              <section key={section.group} className={styles.section} aria-labelledby={`skills-section-${section.group}`}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber} aria-hidden="true">{section.number}</span>
                  <h2 id={`skills-section-${section.group}`} className={styles.sectionTitle}>{section.title}</h2>
                  <span className={styles.sectionRule} aria-hidden="true" />
                </div>
                <div className={styles.cardGrid}>
                  {cats.map((entry) => (
                    <SkillCard key={entry.meta.key} entry={entry} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState} role="status" aria-live="polite">
          <BookOpen size={36} color="var(--color-text-subtle)" aria-hidden="true" />
          <h2 className={styles.emptyStateTitle}>
            Không tìm thấy kỹ năng nào
          </h2>
          <p className={styles.emptyStateDesc}>
            {normalizedQuery
              ? `Không có kết quả cho "${searchQuery}". Thử từ khóa khác hoặc xóa bộ lọc.`
              : "Không có kỹ năng nào trong nhóm này."}
          </p>
          <button
            type="button"
            className={styles.emptyStateClearBtn}
            onClick={() => {
              setSearchQuery("");
              setActiveFilter("all");
            }}
          >
            <X size={14} aria-hidden="true" />
            Xóa bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}
