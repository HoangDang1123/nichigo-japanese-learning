import { AppShell } from "@/components/layout/app-shell";
import { KanjiDetail } from "@/components/skills/kanji/kanji-detail";

export default async function KanjiDetailPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return (
    <AppShell title="Kanji">
      <KanjiDetail itemId={itemId} />
    </AppShell>
  );
}
