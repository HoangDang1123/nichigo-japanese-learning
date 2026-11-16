import { notFound } from "next/navigation";
import { GrammarDetail } from "@/components/skills/grammar/grammar-detail";
import { GRAMMAR_PATTERNS, getGrammarPattern } from "@/components/skills/grammar/grammar-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return GRAMMAR_PATTERNS.map((p) => ({ grammarId: p.id }));
}

export default async function SkillsGrammarDetailPage({
  params,
}: {
  params: Promise<{ grammarId: string }>;
}) {
  const { grammarId } = await params;
  const pattern = getGrammarPattern(grammarId);
  if (!pattern) notFound();
  return <GrammarDetail pattern={pattern} />;
}
