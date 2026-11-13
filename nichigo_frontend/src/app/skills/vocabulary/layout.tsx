import { AppShell } from "@/components/layout/app-shell";
import { VocabularyProvider } from "@/components/skills/vocabulary/vocabulary-provider";

/**
 * Shared layout for every /skills/vocabulary route. Next.js keeps layouts mounted across
 * client navigation, so the in-memory prototype state in VocabularyProvider survives
 * Home -> Explore -> Saved -> Study navigation (but not a full page reload).
 */
export default function VocabularyLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell title="Từ vựng">
      <VocabularyProvider>{children}</VocabularyProvider>
    </AppShell>
  );
}
