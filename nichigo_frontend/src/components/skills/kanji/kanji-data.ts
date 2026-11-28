/**
 * kanji-data.ts — Kanji (JPN-033 Slice 2) data mapping, list state machine and loaders.
 *
 * Source of truth is the public Skills Content API (GET /skills/items for the list, GET /skills/kanji/{id} for Detail).
 * Fields the contract does not provide (Hán Việt, stroke count, JLPT level) are never modelled or shown.
 * Demo content exists only behind an explicit development flag (see kanji-demo.ts).
 * Pure TypeScript: no React, so the state machine can be tested without a DOM.
 */
import { ApiError } from "../../../api";
import type { KanjiDetailDto, SkillContentDto, SkillContentPageDto, SkillItemsQuery, StrokeOrderStatus } from "../../../api/skills";

export const KANJI_PAGE_SIZE = 24;

export interface KanjiEntry {
  /** Canonical Item UUID, used in the Detail route. */
  id: string;
  glyph: string;
  meaningVi: string | null;
  onReadings: string[];
  kunReadings: string[];
}

const readings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim() !== "") : [];
const text = (value: unknown): string | null => (typeof value === "string" && value.trim() !== "" ? value : null);

/**
 * Maps one API Item to a Kanji entry. Returns null for any other kind or when no glyph exists, so a malformed or
 * foreign Item is never rendered. Falls back to the canonical display text only for glyph and meaning.
 */
export function toKanjiEntry(dto: SkillContentDto): KanjiEntry | null {
  if (dto.kind !== "kanji") return null;
  const glyph = text(dto.payload?.glyph) ?? text(dto.displayTextJa);
  if (!glyph) return null;
  return {
    id: dto.id,
    glyph,
    meaningVi: text(dto.payload?.meaningVi) ?? text(dto.displayTextVi),
    onReadings: readings(dto.payload?.onReadings),
    kunReadings: readings(dto.payload?.kunReadings),
  };
}

// ---------------------------------------------------------------------------
// List state machine
// ---------------------------------------------------------------------------
export interface KanjiListState {
  /** Increments with every new search; results carrying another seq belong to a superseded request and are ignored. */
  seq: number;
  /** Submitted search text sent to the API ("" = no search). */
  query: string;
  status: "loading" | "ready" | "error";
  items: KanjiEntry[];
  /** Opaque cursor for the next page; valid only for `query`. */
  nextCursor: string | null;
  loadingMore: boolean;
  /** Error while appending a page; loaded items stay visible. */
  moreError: string | null;
  /** Error of the initial page for the current query. */
  error: string | null;
}

export type KanjiListAction =
  | { type: "search"; seq: number; query: string }
  | { type: "more"; seq: number }
  | { type: "loaded"; seq: number; append: boolean; page: SkillContentPageDto }
  | { type: "failed"; seq: number; append: boolean; message: string };

export const INITIAL_LIST_STATE: KanjiListState = {
  seq: 0, query: "", status: "loading", items: [], nextCursor: null, loadingMore: false, moreError: null, error: null,
};

/** Appends entries, skipping ids already present (a cursor boundary must never show the same Kanji twice). */
export function mergeEntries(existing: KanjiEntry[], incoming: KanjiEntry[]): KanjiEntry[] {
  const seen = new Set(existing.map((e) => e.id));
  const merged = existing.slice();
  for (const entry of incoming) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    merged.push(entry);
  }
  return merged;
}

export function pageEntries(page: SkillContentPageDto): KanjiEntry[] {
  return (page.items ?? []).map(toKanjiEntry).filter((e): e is KanjiEntry => e !== null);
}

export function kanjiListReducer(state: KanjiListState, action: KanjiListAction): KanjiListState {
  if (action.type === "search") {
    return { ...INITIAL_LIST_STATE, seq: action.seq, query: action.query };
  }
  if (action.seq !== state.seq) return state; // out-of-order or cancelled request
  switch (action.type) {
    case "more":
      if (state.status !== "ready" || state.loadingMore || state.nextCursor === null) return state;
      return { ...state, loadingMore: true, moreError: null };
    case "loaded": {
      const incoming = pageEntries(action.page);
      return {
        ...state,
        status: "ready",
        items: action.append ? mergeEntries(state.items, incoming) : mergeEntries([], incoming),
        nextCursor: action.page.nextCursor ?? null,
        loadingMore: false, moreError: null, error: null,
      };
    }
    case "failed":
      return action.append
        ? { ...state, loadingMore: false, moreError: action.message }
        : { ...state, status: "error", items: [], nextCursor: null, loadingMore: false, error: action.message };
  }
}

/** Query for one page. Blank search is omitted; the cursor is passed through untouched. */
export function kanjiQuery(search: string, after: string | null): SkillItemsQuery {
  const q = search.trim();
  return { type: "kanji", ...(q ? { q } : {}), limit: KANJI_PAGE_SIZE, ...(after !== null ? { after } : {}) };
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.category === "configuration_error") return "Chưa cấu hình kết nối tới máy chủ NichiGo.";
    return error.message;
  }
  return "Không thể tải dữ liệu Kanji. Vui lòng thử lại.";
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------
export interface KanjiExampleSegment { text: string; reading: string | null }
export interface KanjiExample { id: string; textJa: string; translationVi: string | null; segments: KanjiExampleSegment[] }
export interface KanjiWord { id: string; surface: string; reading: string | null; glossVi: string | null; examples: KanjiExample[] }

export interface KanjiDetailEntry extends KanjiEntry {
  relatedVocabulary: KanjiWord[];
  /** Only the status: no stroke renderer exists yet and the stroke asset is not fetched. */
  strokeOrderStatus: StrokeOrderStatus;
}

/** Maps the Detail DTO. Empty strings become null/absent; nothing is invented. Null when there is no glyph. */
export function toKanjiDetailEntry(dto: KanjiDetailDto): KanjiDetailEntry | null {
  const glyph = text(dto.glyph);
  if (!glyph) return null;
  const relatedVocabulary: KanjiWord[] = [];
  for (const word of dto.relatedVocabulary ?? []) {
    const surface = text(word.surface);
    if (!surface) continue;
    const examples: KanjiExample[] = [];
    for (const example of word.examples ?? []) {
      const segments = (example.segments ?? [])
        .filter((segment) => segment.text !== "")
        .map((segment) => ({ text: segment.text, reading: text(segment.reading) }));
      const textJa = text(example.textJa) ?? segments.map((segment) => segment.text).join("");
      if (!textJa) continue;
      examples.push({ id: example.id, textJa, translationVi: text(example.translationVi), segments });
    }
    relatedVocabulary.push({ id: word.id, surface, reading: text(word.reading), glossVi: text(word.glossVi), examples });
  }
  return {
    id: dto.id,
    glyph,
    meaningVi: text(dto.meaningVi),
    onReadings: readings(dto.onReadings),
    kunReadings: readings(dto.kunReadings),
    relatedVocabulary,
    strokeOrderStatus: dto.strokeOrder?.status === "metadata_only" ? "metadata_only" : "unavailable",
  };
}

export type KanjiDetailState =
  | { status: "loading" }
  | { status: "success"; entry: KanjiDetailEntry; demo?: boolean }
  | { status: "not-found" }
  | { status: "error"; message: string };

export const DETAIL_LOADING: KanjiDetailState = { status: "loading" };

/**
 * Loads one Kanji Detail for the Detail route. A missing Item (404/400) or one without a glyph is "not found";
 * transport and server failures are errors with Retry. Cancellation is rethrown for the caller to ignore.
 */
export async function loadKanjiDetail(
  fetchDetail: (itemId: string, signal?: AbortSignal) => Promise<KanjiDetailDto>,
  itemId: string,
  signal?: AbortSignal,
): Promise<KanjiDetailState> {
  try {
    const entry = toKanjiDetailEntry(await fetchDetail(itemId, signal));
    return entry ? { status: "success", entry } : { status: "not-found" };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.category === "cancelled") throw error;
      if (error.category === "http_error" && (error.status === 404 || error.status === 400)) return { status: "not-found" };
    }
    return { status: "error", message: errorMessage(error) };
  }
}
