/**
 * skills-mock-data.ts — DEPRECATED compatibility re-export (JPN-ARCH-004).
 *
 * The former single mock-data module was split by owner:
 *   - category metadata       -> ./shared/skills-categories
 *   - Kana demo items         -> ./kana/kana-mock-data
 *   - category-page demo data -> ./category/category-mock-data
 *
 * Nothing in the tracked source imports this file any more. It exists only so the untracked legacy
 * ./skills-library.tsx (kept intentionally) still compiles. Delete it together with skills-library.
 */
export * from "./shared/skills-categories";
export * from "./kana/kana-mock-data";
export * from "./category/category-mock-data";
