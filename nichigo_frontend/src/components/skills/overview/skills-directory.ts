/**
 * skills-directory.ts — maps the Skills Directory API (JPN-033) onto the approved overview cards.
 *
 * Three independent facts exist per card and must never be merged:
 *  1. Backend: `availability` / `itemCount` from GET /api/v1/skills (published-content read usability).
 *  2. Frontend readiness: `CategoryMeta.availability` (is there a screen, and does it use demo data).
 *  3. Learner progress: not modelled here at all. `itemCount` is never a progress figure.
 * The API decides WHICH backend Skills exist, their order and their group. Frontend metadata only supplies
 * titles, decoration and routes. Flashcards is a frontend review tool, not a ninth backend Skill.
 */
import { ApiError } from "../../../api";
import type { DirectoryDto, DirectorySkillDto } from "../../../api/skills";
import { SKILL_CATEGORIES, type CategoryMeta, type SkillFilterGroup } from "../shared/skills-categories";

export interface DirectoryEntry {
  meta: CategoryMeta;
  /** `null` for frontend-only tools (Flashcards), which have no backend Directory entry. */
  backend: DirectorySkillDto | null;
}

export type DirectoryState =
  | { status: "loading" }
  | { status: "success"; entries: DirectoryEntry[] }
  | { status: "error"; message: string };

export const LOADING_STATE: DirectoryState = { status: "loading" };

const GROUP_FILTER: Record<string, SkillFilterGroup> = {
  "foundation-knowledge": "foundational",
  "language-skills": "language-skills",
};

/**
 * Builds the card list in backend order. Backend Skills or groups unknown to the frontend are skipped
 * (nothing is invented for them); known Skills absent from the response are not fabricated either.
 * Returns an empty list when the backend lists no Skills, even though Flashcards would still be a tool.
 */
export function buildDirectoryEntries(directory: DirectoryDto): DirectoryEntry[] {
  const seen = new Set<string>();
  const entries: DirectoryEntry[] = [];
  for (const group of directory.groups) {
    const filterGroup = GROUP_FILTER[group.id];
    if (!filterGroup) continue;
    for (const skill of group.skills) {
      const meta = SKILL_CATEGORIES.find((category) => category.key === skill.type);
      if (!meta || seen.has(skill.type)) continue;
      seen.add(skill.type);
      entries.push({ meta: { ...meta, filterGroup }, backend: skill });
    }
  }
  if (entries.length === 0) return [];
  const flashcards = SKILL_CATEGORIES.find((category) => category.key === "flashcards");
  if (flashcards) entries.push({ meta: flashcards, backend: null });
  return entries;
}

/** Group and text filter over card metadata only (title, subtitle, description); it never searches Item content. */
export function filterEntries(entries: DirectoryEntry[], group: SkillFilterGroup | "all", query: string): DirectoryEntry[] {
  const needle = query.trim().toLowerCase();
  return entries.filter(({ meta }) =>
    (group === "all" || meta.filterGroup === group) &&
    (!needle ||
      meta.title.toLowerCase().includes(needle) ||
      meta.subtitle.toLowerCase().includes(needle) ||
      meta.description.toLowerCase().includes(needle)));
}

export interface BackendStatus {
  tone: "published" | "empty";
  text: string;
}

/**
 * Honest backend status for a card. `feature_unavailable` and frontend-only tools return null: the card's own
 * "Chưa khả dụng" / "Sắp ra mắt" badge already says so. A count of 0 is shown; a null count is never shown as 0.
 */
export function backendStatus(entry: DirectoryEntry): BackendStatus | null {
  const backend = entry.backend;
  if (!backend || backend.availability === "feature_unavailable") return null;
  if (backend.availability === "no_published_content") return { tone: "empty", text: "Chưa có nội dung xuất bản" };
  return {
    tone: "published",
    text: backend.itemCount === null ? "Đã có nội dung xuất bản" : `${backend.itemCount} mục đã xuất bản`,
  };
}

/** True when the card opens a screen that still renders demo data instead of published content. */
export function usesDemoData(entry: DirectoryEntry): boolean {
  return entry.meta.availability === "demo" && entry.meta.contentSource !== "api";
}

export function directoryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.category === "configuration_error") return "Chưa cấu hình kết nối tới máy chủ NichiGo.";
    return error.message;
  }
  return "Không thể tải danh sách kỹ năng. Vui lòng thử lại.";
}

/** Loads the Directory once. Cancellation is rethrown so the caller can ignore a superseded request. */
export async function loadDirectory(
  fetchDirectory: (signal?: AbortSignal) => Promise<DirectoryDto>,
  signal?: AbortSignal,
): Promise<DirectoryState> {
  try {
    return { status: "success", entries: buildDirectoryEntries(await fetchDirectory(signal)) };
  } catch (error) {
    if (error instanceof ApiError && error.category === "cancelled") throw error;
    return { status: "error", message: directoryErrorMessage(error) };
  }
}
