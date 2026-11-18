import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CategoryDetail, isDetailCategory } from "@/components/skills/category/category-detail";
import { SKILL_CATEGORIES } from "@/components/skills/shared/skills-categories";

export const dynamicParams = false;

export function generateStaticParams() {
  return SKILL_CATEGORIES.filter((c) => c.key !== "kana" && c.key !== "vocabulary" && c.key !== "grammar" && c.key !== "kanji").map((c) => ({ category: c.key }));
}

export default async function SkillsCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isDetailCategory(category)) notFound();
  const title = SKILL_CATEGORIES.find((c) => c.key === category)?.title ?? "Kỹ năng";
  return (
    <AppShell title={title}>
      <CategoryDetail categoryKey={category} />
    </AppShell>
  );
}
