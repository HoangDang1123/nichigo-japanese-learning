"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  cellPositionKey,
  findCell,
  type KanaChartCell,
  type KanaScript,
} from "./kana-chart-data";
import { KanaChart } from "./kana-chart";
import { KanaDrawer } from "./kana-drawer";
import detail from "./skills-detail.module.css";
import chart from "./kana-chart.module.css";
import drawerStyles from "./kana-drawer.module.css";

const SHEET_QUERY = "(max-width: 63.999rem)";

function subscribeSheet(callback: () => void) {
  const mql = window.matchMedia(SHEET_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function useIsSheet(): boolean {
  return React.useSyncExternalStore(
    subscribeSheet,
    () => window.matchMedia(SHEET_QUERY).matches,
    () => false,
  );
}

export function KanaDetail() {
  const [script, setScript] = React.useState<KanaScript>("hiragana");
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const isSheet = useIsSheet();
  const drawerId = React.useId();
  const cellRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const returnFocusKey = React.useRef<string | null>(null);

  const selectedCell = findCell(script, selectedKey);
  const isOpen = selectedCell !== null;

  const registerCell = React.useCallback((key: string, el: HTMLButtonElement | null) => {
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }, []);

  const close = React.useCallback(() => {
    returnFocusKey.current = selectedKey;
    setSelectedKey(null);
  }, [selectedKey]);

  const handleSelect = (cell: KanaChartCell) => {
    setSelectedKey(cellPositionKey(cell));
  };

  // Move focus into the sheet when it opens on narrow screens (dialog pattern);
  // the docked desktop drawer is nonmodal, so focus stays on the chart cell.
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (isOpen && !wasOpen.current && isSheet) headingRef.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen, isSheet]);

  // After closing, return focus to the cell that opened the drawer.
  React.useEffect(() => {
    if (!isOpen && returnFocusKey.current) {
      cellRefs.current.get(returnFocusKey.current)?.focus();
      returnFocusKey.current = null;
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    // Capture phase: in the real app a trusted Escape reaches the bubble phase already marked
    // default-prevented (observed in headless Edge on every app page), which would make a bubble
    // listener ignore it. Reading the flag before the event propagates keeps Escape reliable
    // while still respecting handlers that prevented it earlier in the capture phase.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) close();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isOpen, close]);

  return (
    <div className={detail.page}>
      <Link href="/skills" className={detail.backNav}>
        <ArrowLeft size={15} aria-hidden="true" />
        Kỹ năng
      </Link>

      <header className={detail.pageHeader}>
        <div className={detail.pageTitleRow}>
          <h1 className={detail.pageTitle}>Bảng chữ cái</h1>
          <span className={detail.pageJapaneseTitle} lang="ja">仮名</span>
          <span className={detail.demoBadge}>Dữ liệu minh họa</span>
        </div>
        <p className={detail.pageDescription}>
          Bảng tham khảo Hiragana và Katakana: âm cơ bản, âm đục, bán đục và âm ghép. Chọn một chữ để xem chi tiết.
        </p>

        <div className={detail.scriptToggle} role="group" aria-label="Chọn bảng chữ cái">
          <button
            type="button"
            aria-pressed={script === "hiragana"}
            className={`${detail.scriptToggleBtn} ${script === "hiragana" ? detail.scriptToggleBtnActive : ""}`}
            onClick={() => setScript("hiragana")}
          >
            <span className={detail.scriptToggleBtnGlyph} lang="ja">あ</span>
            Hiragana
          </button>
          <button
            type="button"
            aria-pressed={script === "katakana"}
            className={`${detail.scriptToggleBtn} ${script === "katakana" ? detail.scriptToggleBtnActive : ""}`}
            onClick={() => setScript("katakana")}
          >
            <span className={detail.scriptToggleBtnGlyph} lang="ja">ア</span>
            Katakana
          </button>
        </div>
      </header>

      <div className={chart.workspace}>
        <KanaChart
          script={script}
          selectedKey={selectedKey}
          drawerId={drawerId}
          onSelect={handleSelect}
          registerCell={registerCell}
        />
        {(!isSheet || selectedCell) && (
          <>
            {isSheet && <div className={drawerStyles.backdrop} aria-hidden="true" onClick={close} />}
            <KanaDrawer
              key={isSheet ? "sheet" : "docked"}
              cell={selectedCell}
              id={drawerId}
              mode={isSheet ? "sheet" : "docked"}
              headingRef={headingRef}
              onClose={close}
            />
          </>
        )}
      </div>
    </div>
  );
}
