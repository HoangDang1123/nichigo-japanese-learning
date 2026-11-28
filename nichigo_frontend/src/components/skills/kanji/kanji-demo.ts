/**
 * kanji-demo.ts — Development-only demo fallback for the Kanji screens (JPN-033 Slice 2).
 *
 * Shown ONLY when NEXT_PUBLIC_SKILLS_DEMO_FALLBACK=true (default off) AND the API returned no published Kanji.
 * These entries are illustrative fixtures, not published content, have no reviewed Rights/language status and are
 * always rendered under a "Dữ liệu minh họa" label. Pure TypeScript: no React.
 */
import type { KanjiDetailEntry, KanjiListState } from "./kanji-data";

export const DEMO_ID_PREFIX = "demo-kanji-";
export const DEMO_LABEL = "Dữ liệu minh họa";

/** The flag is on only for the exact string "true"; anything else (unset, "1", "TRUE") keeps it off. */
export function demoFallbackEnabled(value: string | undefined): boolean {
  return value === "true";
}

export const DEMO_KANJI: readonly KanjiDetailEntry[] = [
  { id: `${DEMO_ID_PREFIX}01`, glyph: "日", meaningVi: "Mặt trời, ngày", onReadings: ["ニチ", "ジツ"], kunReadings: ["ひ", "か"] },
  { id: `${DEMO_ID_PREFIX}02`, glyph: "月", meaningVi: "Mặt trăng, tháng", onReadings: ["ゲツ", "ガツ"], kunReadings: ["つき"] },
  { id: `${DEMO_ID_PREFIX}03`, glyph: "木", meaningVi: "Cây cối, gỗ", onReadings: ["モク", "ボク"], kunReadings: ["き"] },
].map((entry) => ({ ...entry, relatedVocabulary: [], strokeOrderStatus: "unavailable" as const }));

export function findDemoKanji(itemId: string): KanjiDetailEntry | null {
  return DEMO_KANJI.find((entry) => entry.id === itemId) ?? null;
}

/**
 * Overview: swaps in the demo list only for a confirmed empty, unsearched API result with the flag on.
 * Loading, error and searched-empty states are never replaced.
 */
export function withDemoFallback(state: KanjiListState, enabled: boolean): { state: KanjiListState; demo: boolean } {
  if (enabled && state.status === "ready" && state.items.length === 0 && state.query === "" && state.nextCursor === null) {
    return { state: { ...state, items: DEMO_KANJI.map(({ id, glyph, meaningVi, onReadings, kunReadings }) => ({ id, glyph, meaningVi, onReadings, kunReadings })) }, demo: true };
  }
  return { state, demo: false };
}
