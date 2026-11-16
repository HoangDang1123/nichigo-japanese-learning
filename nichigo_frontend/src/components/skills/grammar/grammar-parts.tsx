"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { getGrammarCategory, GRAMMAR_DEMO_NOTICE } from "./grammar-data";
import type {
  GrammarCategory,
  GrammarExample,
  GrammarNote,
  GrammarNoteKind,
  GrammarPattern,
  GrammarStructure,
} from "./grammar-types";
import styles from "./grammar.module.css";

export function DemoBadge() {
  return <span className={styles.demoBadge}>{GRAMMAR_DEMO_NOTICE}</span>;
}

/** Compact filter chip. A filter only narrows the list below; it never navigates. */
export function FilterChip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.filterChip} ${selected ? styles.filterChipSelected : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}

/** Overview card. The example is the entry's own first example; no example means no example area. */
export function PatternCard({ pattern, categories }: { pattern: GrammarPattern; categories: readonly GrammarCategory[] }) {
  const category = categories.find((c) => c.id === pattern.categoryId) ?? getGrammarCategory(pattern.categoryId);
  const example = pattern.examples[0];
  return (
    <Link href={`/skills/grammar/${pattern.id}`} className={styles.patternCard}>
      <span className={styles.cardTop}>
        <span className={styles.cardCategory}>{category?.titleVi}</span>
        <ArrowUpRight size={18} aria-hidden="true" className={styles.cardIcon} />
      </span>
      <span className={styles.cardPattern} lang="ja">{pattern.pattern}</span>
      <span className={styles.cardMeaning}>{pattern.meaningVi}</span>
      {example && (
        <span className={styles.cardExample}>
          <span className={styles.cardExampleJa} lang="ja">{example.ja}</span>
          <span className={styles.cardExampleVi}>{example.vi}</span>
        </span>
      )}
    </Link>
  );
}

export function GrammarStructureBlock({ structure }: { structure: GrammarStructure }) {
  return (
    <div className={styles.structure}>
      <ul className={styles.structureParts} aria-label="Các thành phần của cấu trúc">
        {structure.parts.map((part, index) => (
          <li key={`${part.text}-${index}`} className={styles.structurePart}>
            <span className={styles.structureText} lang="ja">{part.text}</span>
            {part.noteVi && <span className={styles.structureNote}>{part.noteVi}</span>}
          </li>
        ))}
      </ul>
      {structure.remarkVi && <p className={styles.structureRemark}>{structure.remarkVi}</p>}
    </div>
  );
}

/** Optional romaji toggle exists only when the example carries a verified reading. */
export function ExampleItem({ example }: { example: GrammarExample }) {
  const [showReading, setShowReading] = React.useState(false);
  const readingId = React.useId();
  const hasReading = Boolean(example.romaji);
  return (
    <li className={styles.example}>
      {example.illustration && (
        <figure className={styles.exampleFigure}>
          {/* Plain img: future artwork metadata is optional and its size is not known yet. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={example.illustration.src} alt={example.illustration.alt} className={styles.exampleImage} />
          {example.illustration.caption && <figcaption>{example.illustration.caption}</figcaption>}
        </figure>
      )}
      <p className={styles.exampleJa} lang="ja">{example.ja}</p>
      {hasReading && showReading && <p id={readingId} className={styles.exampleRomaji}>{example.romaji}</p>}
      <p className={styles.exampleVi}>{example.vi}</p>
      {hasReading && (
        <button
          type="button"
          className={styles.readingToggle}
          aria-expanded={showReading}
          aria-controls={showReading ? readingId : undefined}
          onClick={() => setShowReading((v) => !v)}
        >
          {showReading ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          {showReading ? "Ẩn cách đọc" : "Hiện cách đọc"}
        </button>
      )}
    </li>
  );
}

export function ExampleList({ examples }: { examples: readonly GrammarExample[] }) {
  return (
    <ul className={styles.exampleList} aria-label="Câu ví dụ">
      {examples.map((example) => <ExampleItem key={example.id} example={example} />)}
    </ul>
  );
}

const NOTE_LABEL: Record<GrammarNoteKind, string> = {
  usage: "Lưu ý cách dùng",
  mistake: "Điểm dễ nhầm",
  compare: "So sánh",
};

export function UsageNotes({ notes }: { notes: readonly GrammarNote[] }) {
  return (
    <ul className={styles.notes}>
      {notes.map((note, index) => (
        <li key={index} className={`${styles.note} ${styles[`note_${note.kind}`]}`}>
          <span className={styles.noteLabel}>{NOTE_LABEL[note.kind]}</span>
          <span className={styles.noteText} lang="vi">{note.textVi}</span>
        </li>
      ))}
    </ul>
  );
}

export function RelatedPatterns({ patterns }: { patterns: readonly GrammarPattern[] }) {
  return (
    <ul className={styles.related}>
      {patterns.map((p) => (
        <li key={p.id}>
          <Link href={`/skills/grammar/${p.id}`} className={styles.relatedLink}>
            <span className={styles.relatedJa} lang="ja">{p.pattern}</span>
            <span className={styles.relatedMeaning}>{p.meaningVi}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
