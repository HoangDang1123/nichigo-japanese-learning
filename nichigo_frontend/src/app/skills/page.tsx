import { AppShell } from "@/components/layout/app-shell";
import { SkillsOverview } from "@/components/skills/overview/skills-overview";

export default function SkillsPage() {
  return (
    <AppShell title="Kỹ năng">
      <SkillsOverview />
    </AppShell>
  );
}
