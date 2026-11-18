"use client";

import * as React from "react";
import { X } from "lucide-react";
import { usePopover } from "../ui/use-popover";
import { getTerm, type TermId } from "./glossary";
import { placePopover } from "./popover-position";
import styles from "./learning-term.module.css";

export interface LearningTermProps {
  term: TermId;
  /** Text shown in the sentence. Defaults to the glossary's Vietnamese label. */
  children?: React.ReactNode;
  /** Renders the explanation already open (server rendering in tests). */
  initialOpen?: boolean;
}

/**
 * Inline term that opens a short explanation on click/tap or Enter/Space. Never depends on hover.
 * Escape, a tap outside or the close button dismiss it and focus returns to the term. The explanation comes only from
 * the central glossary and is positioned inside the viewport.
 */
export function LearningTerm({ term, children, initialOpen = false }: LearningTermProps) {
  const entry = getTerm(term);
  const { open, rootRef, triggerRef, toggle, close } = usePopover<HTMLSpanElement>();
  const panelRef = React.useRef<HTMLSpanElement>(null);
  const id = React.useId();
  const shown = open || initialOpen;

  React.useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      // Width first: the height depends on it.
      const width = placePopover(trigger.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }, 0).width;
      panel.style.width = `${width}px`;
      const placement = placePopover(trigger.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }, panel.offsetHeight);
      panel.style.left = `${placement.left}px`;
      panel.style.top = `${placement.top}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, triggerRef]);

  const { example } = entry;
  return (
    <span
      className={styles.root}
      ref={rootRef}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (open && next instanceof Node && !rootRef.current?.contains(next)) close();
      }}
    >
      <button type="button" ref={triggerRef} className={styles.trigger} aria-expanded={shown} aria-controls={id} onClick={toggle}>
        {children ?? entry.labelVi}
      </button>
      {shown && (
        <span id={id} ref={panelRef} role="group" aria-label={`Giải thích: ${entry.labelVi}`} tabIndex={-1} className={styles.panel}>
          <span className={styles.head}>
            <span className={styles.title}>{entry.labelVi}</span>
            <button type="button" className={styles.close} aria-label="Đóng giải thích" onClick={() => close(true)}>
              <X size={14} aria-hidden="true" />
            </button>
          </span>
          <span className={styles.japanese} lang="ja">{entry.ja}（{entry.jaReading}）</span>
          <span className={styles.body}>{entry.explanationVi}</span>
          <span className={styles.example}>
            <span className={styles.exampleLabel}>Ví dụ</span>
            <span className={styles.exampleJa} lang="ja">
              {example.ruby ? <ruby>{example.ruby.base}<rp>(</rp><rt>{example.ruby.reading}</rt><rp>)</rp></ruby> : example.ja}
            </span>
            <span className={styles.body}>{example.noteVi}</span>
          </span>
        </span>
      )}
    </span>
  );
}
