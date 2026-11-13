import { notFound } from "next/navigation";
import { TopicStudy } from "@/components/skills/vocabulary/topic-study";
import { VOCABULARY_TOPICS } from "@/components/skills/vocabulary/vocabulary-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return VOCABULARY_TOPICS.map((t) => ({ topicId: t.id }));
}

export default async function VocabularyStudyPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  if (!VOCABULARY_TOPICS.some((t) => t.id === topicId)) notFound();
  return <TopicStudy topicId={topicId} />;
}
