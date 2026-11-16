import type { GrammarCategory, GrammarPattern } from "./grammar-types";

export const ALL_CATEGORIES = "all";

/** Case-, width- and diacritic-insensitive form, so "tro tu" matches "Trợ từ". */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

/** Combines category selection and local search (Japanese pattern, Vietnamese meaning, category name). */
export function filterPatterns(
  patterns: readonly GrammarPattern[],
  categories: readonly GrammarCategory[],
  categoryId: string,
  query: string
): GrammarPattern[] {
  const needle = normalizeSearch(query);
  return patterns.filter((p) => {
    if (categoryId !== ALL_CATEGORIES && p.categoryId !== categoryId) return false;
    if (!needle) return true;
    const category = categories.find((c) => c.id === p.categoryId);
    const haystack = [p.pattern, p.meaningVi, category?.titleVi, category?.titleJa].filter(Boolean).join(" ");
    return normalizeSearch(haystack).includes(needle);
  });
}

/** Only categories that actually have patterns are shown. */
export function categoriesWithData(
  categories: readonly GrammarCategory[],
  patterns: readonly GrammarPattern[]
): GrammarCategory[] {
  return categories.filter((c) => patterns.some((p) => p.categoryId === c.id));
}
