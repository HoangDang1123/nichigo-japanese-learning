import { AppShell } from "@/components/layout/app-shell";
import { KanjiOverview } from "@/components/skills/kanji/kanji-overview";

export default function KanjiPage() {
  return (
    <AppShell title="Kanji">
      <KanjiOverview />
    </AppShell>
  );
}
