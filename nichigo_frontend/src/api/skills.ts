import { apiRequest, ApiError } from "./index";

/**
 * Typed client for the public Skills Content API (JPN-033 backend foundation, `SkillsContentController`).
 * All routes are anonymous GETs: they never create a Guest identity, spend a Lesson unlock or mutate
 * bookmarks, so none of them touches the Guest/CSRF flow. Query values are sent exactly as given.
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

/** `limit` is 1–50 (backend default 20). `after` is an opaque cursor valid only for the same `type`/`q`. */
export interface SkillItemsQuery { type?: SkillKind; q?: string; limit?: number; after?: string }
export interface FlashcardsQuery { type?: SkillKind; limit?: number; after?: string }

const AVAILABILITY: readonly string[] = ["available", "no_published_content", "feature_unavailable"];
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = () => new ApiError("http_error", 200, "invalid_response", "Máy chủ trả về dữ liệu kỹ năng không hợp lệ.");

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

/** Builds query params, omitting only undefined values; nothing is trimmed, defaulted or rewritten. */
function params<T extends object>(query: T | undefined) {
  const result: Record<string, string | number> = {};
  if (query) for (const [key, value] of Object.entries(query)) if (value !== undefined) result[key] = value as string | number;
  return result;
}

export const skillsApi = {
  async directory(signal?: AbortSignal): Promise<DirectoryDto> {
    return parseDirectory(await apiRequest<unknown>({ url: "/api/v1/skills", method: "GET", signal }));
  },
  items(query?: SkillItemsQuery, signal?: AbortSignal): Promise<SkillContentPageDto> {
    return apiRequest<SkillContentPageDto>({ url: "/api/v1/skills/items", method: "GET", params: params(query), signal });
  },
  item(itemId: string, signal?: AbortSignal): Promise<SkillContentDto> {
    return apiRequest<SkillContentDto>({ url: `/api/v1/skills/items/${encodeURIComponent(itemId)}`, method: "GET", signal });
  },
  flashcards(query?: FlashcardsQuery, signal?: AbortSignal): Promise<FlashcardPageDto> {
    return apiRequest<FlashcardPageDto>({ url: "/api/v1/skills/flashcards", method: "GET", params: params(query), signal });
  },
};
