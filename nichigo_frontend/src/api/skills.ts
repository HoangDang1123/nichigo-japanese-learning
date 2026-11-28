import { apiRequest, ApiError } from "./index";

/**
 * Typed client for the public Skills Content API (JPN-033 backend foundation, `SkillsContentController`).
 * All routes are anonymous GETs: they never create a Guest identity, spend a Lesson unlock or mutate
 * bookmarks, so none of them touches the Guest/CSRF flow. Query values are sent exactly as given.
 * Every response body is validated; a body that does not match the contract throws `ApiError`
 * with code `invalid_response` instead of being returned unchecked.
 */

/** Canonical Item kinds that have list/detail/search/flashcard routes. */
export type SkillKind = "kana" | "vocabulary" | "grammar" | "kanji";
export type LanguageSkillType = "listening" | "speaking" | "reading" | "writing";
export type DirectoryGroupId = "foundation-knowledge" | "language-skills";

/**
 * `available`: published content readable through this API (not frontend readiness).
 * `no_published_content`: the read routes exist but no eligible Item is published.
 * `feature_unavailable`: the learning feature itself is not implemented.
 */
export type DirectoryAvailability = "available" | "no_published_content" | "feature_unavailable";

export interface DirectorySkillDto {
  type: string;
  availability: DirectoryAvailability;
  /** Count of eligible published Items (0 is a real zero). `null` means no count contract exists; it is not zero. */
  itemCount: number | null;
}
export interface DirectoryGroupDto { id: string; skills: DirectorySkillDto[] }
export interface DirectoryDto { groups: DirectoryGroupDto[] }

/** Public payload fields per kind. The backend copies only these fields and only when present, so all are optional. */
export interface KanaPayload { script?: string; glyph?: string; reading?: string }
export interface VocabularyPayload { surface?: string; reading?: string; glossVi?: string; usageNoteVi?: string }
export interface GrammarPayload { pattern?: string; explanationVi?: string; usageNoteVi?: string }
export interface KanjiPayload { glyph?: string; meaningVi?: string; onReadings?: string[]; kunReadings?: string[] }

interface SkillContentBase {
  id: string;
  key: string;
  revision: number;
  displayTextJa: string;
  displayTextVi: string;
}
export type SkillContentDto =
  | (SkillContentBase & { kind: "kana"; payload: KanaPayload })
  | (SkillContentBase & { kind: "vocabulary"; payload: VocabularyPayload })
  | (SkillContentBase & { kind: "grammar"; payload: GrammarPayload })
  | (SkillContentBase & { kind: "kanji"; payload: KanjiPayload });

export interface SkillContentPageDto { items: SkillContentDto[]; nextCursor: string | null }

export interface FlashcardDto {
  id: string;
  key: string;
  revision: number;
  kind: SkillKind;
  front: string;
  back: string;
  reading: string | null;
}
export interface FlashcardPageDto { cards: FlashcardDto[]; nextCursor: string | null }

/** Kanji detail (`GET /skills/kanji/{itemId}`), matching the backend `KanjiDetail` record. Text fields may be empty strings. */
export interface KanjiExampleSegmentDto { text: string; reading?: string }
export interface KanjiExampleDto {
  id: string;
  key: string;
  revision: number;
  textJa: string;
  translationVi: string;
  segments: KanjiExampleSegmentDto[];
}
export interface KanjiVocabularyDto {
  id: string;
  key: string;
  revision: number;
  surface: string;
  reading: string;
  glossVi: string;
  examples: KanjiExampleDto[];
}
/** `metadata_only`: eligible stroke Media exists (bytes come from the separate stroke-asset route). `unavailable`: all other fields are null. */
export type StrokeOrderStatus = "metadata_only" | "unavailable";
export interface StrokeOrderDto {
  status: StrokeOrderStatus;
  mediaId: string | null;
  revision: number | null;
  mimeType: string | null;
  altTextVi: string | null;
}
export interface KanjiDetailDto {
  id: string;
  key: string;
  revision: number;
  glyph: string;
  meaningVi: string;
  onReadings?: string[];
  kunReadings?: string[];
  relatedVocabulary: KanjiVocabularyDto[];
  strokeOrder: StrokeOrderDto;
}
/** Validated JSON object of the versioned stroke contract; a renderer (later slice) owns its shape. */
export type KanjiStrokeAssetDto = Record<string, unknown>;

/** `limit` is 1–50 (backend default 20). `after` is an opaque cursor valid only for the same `type`/`q`. */
export interface SkillItemsQuery { type?: SkillKind; q?: string; limit?: number; after?: string }
export interface FlashcardsQuery { type?: SkillKind; limit?: number; after?: string }

const KINDS: readonly string[] = ["kana", "vocabulary", "grammar", "kanji"];
const AVAILABILITY: readonly string[] = ["available", "no_published_content", "feature_unavailable"];
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = () => new ApiError("http_error", 200, "invalid_response", "Máy chủ trả về dữ liệu kỹ năng không hợp lệ.");

const isStr = (v: unknown): v is string => typeof v === "string";
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const strOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (!isStr(v)) throw invalid();
  return v;
};
const intOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (!isInt(v)) throw invalid();
  return v;
};

function optionalString(source: Record<string, unknown>, field: string, target: Record<string, unknown>) {
  const v = source[field];
  if (v === undefined || v === null) return;
  if (!isStr(v)) throw invalid();
  target[field] = v;
}
function optionalStringArray(source: Record<string, unknown>, field: string, target: Record<string, unknown>) {
  const v = source[field];
  if (v === undefined || v === null) return;
  if (!Array.isArray(v) || !v.every(isStr)) throw invalid();
  target[field] = [...v];
}

/** Rejects a Directory body that does not match the contract instead of rendering guesses. */
export function parseDirectory(body: unknown): DirectoryDto {
  if (!isRecord(body) || !Array.isArray(body.groups)) throw invalid();
  const groups = body.groups.map((group): DirectoryGroupDto => {
    if (!isRecord(group) || typeof group.id !== "string" || !Array.isArray(group.skills)) throw invalid();
    const skills = group.skills.map((skill): DirectorySkillDto => {
      if (!isRecord(skill) || typeof skill.type !== "string") throw invalid();
      const { availability, itemCount } = skill;
      if (typeof availability !== "string" || !AVAILABILITY.includes(availability)) throw invalid();
      if (itemCount !== null && !(typeof itemCount === "number" && Number.isInteger(itemCount) && itemCount >= 0)) throw invalid();
      return { type: skill.type, availability: availability as DirectoryAvailability, itemCount };
    });
    return { id: group.id, skills };
  });
  return { groups };
}

const PAYLOAD_FIELDS: Record<SkillKind, { strings: string[]; arrays: string[] }> = {
  kana: { strings: ["script", "glyph", "reading"], arrays: [] },
  vocabulary: { strings: ["surface", "reading", "glossVi", "usageNoteVi"], arrays: [] },
  grammar: { strings: ["pattern", "explanationVi", "usageNoteVi"], arrays: [] },
  kanji: { strings: ["glyph", "meaningVi"], arrays: ["onReadings", "kunReadings"] },
};

/** Validates one Item. Only the documented public payload fields are kept, and only when present; nothing is filled in. */
export function parseItem(body: unknown): SkillContentDto {
  if (!isRecord(body) || !isStr(body.id) || !isStr(body.key) || !isInt(body.revision)
    || !isStr(body.kind) || !KINDS.includes(body.kind)
    || !isStr(body.displayTextJa) || !isStr(body.displayTextVi) || !isRecord(body.payload)) throw invalid();
  const kind = body.kind as SkillKind;
  const payload: Record<string, unknown> = {};
  for (const field of PAYLOAD_FIELDS[kind].strings) optionalString(body.payload, field, payload);
  for (const field of PAYLOAD_FIELDS[kind].arrays) optionalStringArray(body.payload, field, payload);
  return {
    id: body.id, key: body.key, revision: body.revision, kind,
    displayTextJa: body.displayTextJa, displayTextVi: body.displayTextVi, payload,
  } as SkillContentDto;
}

export function parseItemPage(body: unknown): SkillContentPageDto {
  if (!isRecord(body) || !Array.isArray(body.items)) throw invalid();
  return { items: body.items.map(parseItem), nextCursor: strOrNull(body.nextCursor) };
}

export function parseFlashcardPage(body: unknown): FlashcardPageDto {
  if (!isRecord(body) || !Array.isArray(body.cards)) throw invalid();
  const cards = body.cards.map((card): FlashcardDto => {
    if (!isRecord(card) || !isStr(card.id) || !isStr(card.key) || !isInt(card.revision)
      || !isStr(card.kind) || !KINDS.includes(card.kind) || !isStr(card.front) || !isStr(card.back)) throw invalid();
    return {
      id: card.id, key: card.key, revision: card.revision, kind: card.kind as SkillKind,
      front: card.front, back: card.back, reading: strOrNull(card.reading),
    };
  });
  return { cards, nextCursor: strOrNull(body.nextCursor) };
}

function parseExample(example: unknown): KanjiExampleDto {
  if (!isRecord(example) || !isStr(example.id) || !isStr(example.key) || !isInt(example.revision)
    || !isStr(example.textJa) || !isStr(example.translationVi) || !Array.isArray(example.segments)) throw invalid();
  const segments = example.segments.map((segment): KanjiExampleSegmentDto => {
    if (!isRecord(segment) || !isStr(segment.text)) throw invalid();
    if (segment.reading === undefined || segment.reading === null) return { text: segment.text };
    if (!isStr(segment.reading)) throw invalid();
    return { text: segment.text, reading: segment.reading };
  });
  return {
    id: example.id, key: example.key, revision: example.revision,
    textJa: example.textJa, translationVi: example.translationVi, segments,
  };
}

function parseStrokeOrder(value: unknown): StrokeOrderDto {
  if (!isRecord(value) || (value.status !== "metadata_only" && value.status !== "unavailable")) throw invalid();
  const result: StrokeOrderDto = {
    status: value.status, mediaId: strOrNull(value.mediaId), revision: intOrNull(value.revision),
    mimeType: strOrNull(value.mimeType), altTextVi: strOrNull(value.altTextVi),
  };
  if (result.status === "unavailable" && (result.mediaId !== null || result.revision !== null || result.mimeType !== null || result.altTextVi !== null)) throw invalid();
  if (result.status === "metadata_only" && (!result.mediaId || result.revision === null || !result.mimeType)) throw invalid();
  return result;
}

export function parseKanjiDetail(body: unknown): KanjiDetailDto {
  if (!isRecord(body) || !isStr(body.id) || !isStr(body.key) || !isInt(body.revision)
    || !isStr(body.glyph) || !isStr(body.meaningVi) || !Array.isArray(body.relatedVocabulary)) throw invalid();
  const readings: Record<string, unknown> = {};
  optionalStringArray(body, "onReadings", readings);
  optionalStringArray(body, "kunReadings", readings);
  const relatedVocabulary = body.relatedVocabulary.map((word): KanjiVocabularyDto => {
    if (!isRecord(word) || !isStr(word.id) || !isStr(word.key) || !isInt(word.revision) || !isStr(word.surface)
      || !isStr(word.reading) || !isStr(word.glossVi) || !Array.isArray(word.examples)) throw invalid();
    return {
      id: word.id, key: word.key, revision: word.revision, surface: word.surface,
      reading: word.reading, glossVi: word.glossVi, examples: word.examples.map(parseExample),
    };
  });
  return {
    id: body.id, key: body.key, revision: body.revision, glyph: body.glyph, meaningVi: body.meaningVi,
    ...readings, relatedVocabulary, strokeOrder: parseStrokeOrder(body.strokeOrder),
  };
}

export function parseKanjiStrokeAsset(body: unknown): KanjiStrokeAssetDto {
  if (!isRecord(body)) throw invalid();
  return body;
}

/**
 * Backend errors are `{ code, message }`: `invalid_content_query` (400), `content_not_found` (404),
 * `content_unavailable` (503). When a proxy or gateway answers without that body, the shared interceptor yields
 * `http_<status>`; those are normalised to the same documented codes so callers branch on one set.
 */
const STATUS_CODES: Record<number, string> = { 400: "invalid_content_query", 404: "content_not_found", 503: "content_unavailable" };
async function request<T>(config: { url: string; params?: Record<string, string | number>; signal?: AbortSignal }, parse: (body: unknown) => T): Promise<T> {
  let body: unknown;
  try { body = await apiRequest<unknown>({ ...config, method: "GET" }); }
  catch (error) {
    if (error instanceof ApiError && error.category === "http_error" && error.code === `http_${error.status}` && STATUS_CODES[error.status])
      throw new ApiError("http_error", error.status, STATUS_CODES[error.status], error.message);
    throw error;
  }
  return parse(body);
}

/** Builds query params, omitting only undefined values; nothing is trimmed, defaulted or rewritten. */
function params<T extends object>(query: T | undefined) {
  const result: Record<string, string | number> = {};
  if (query) for (const [key, value] of Object.entries(query)) if (value !== undefined) result[key] = value as string | number;
  return result;
}

export const skillsApi = {
  directory(signal?: AbortSignal): Promise<DirectoryDto> {
    return request({ url: "/api/v1/skills", signal }, parseDirectory);
  },
  items(query?: SkillItemsQuery, signal?: AbortSignal): Promise<SkillContentPageDto> {
    return request({ url: "/api/v1/skills/items", params: params(query), signal }, parseItemPage);
  },
  item(itemId: string, signal?: AbortSignal): Promise<SkillContentDto> {
    return request({ url: `/api/v1/skills/items/${encodeURIComponent(itemId)}`, signal }, parseItem);
  },
  flashcards(query?: FlashcardsQuery, signal?: AbortSignal): Promise<FlashcardPageDto> {
    return request({ url: "/api/v1/skills/flashcards", params: params(query), signal }, parseFlashcardPage);
  },
  kanjiDetail(itemId: string, signal?: AbortSignal): Promise<KanjiDetailDto> {
    return request({ url: `/api/v1/skills/kanji/${encodeURIComponent(itemId)}`, signal }, parseKanjiDetail);
  },
  kanjiStrokeAsset(itemId: string, signal?: AbortSignal): Promise<KanjiStrokeAssetDto> {
    return request({ url: `/api/v1/skills/kanji/${encodeURIComponent(itemId)}/stroke-asset`, signal }, parseKanjiStrokeAsset);
  },
};
