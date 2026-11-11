import { AppShell } from "@/components/layout/app-shell";
import { KanaDetail } from "@/components/skills/kana-detail";

export default function SkillsKanaPage() {
  return (
    <AppShell title="Bảng chữ cái">
      <KanaDetail />
    </AppShell>
  );
}
