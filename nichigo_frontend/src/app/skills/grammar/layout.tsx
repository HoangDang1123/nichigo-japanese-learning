import { AppShell } from "@/components/layout/app-shell";

/** Shared shell for every /skills/grammar route. */
export default function GrammarLayout({ children }: { children: React.ReactNode }) {
  return <AppShell title="Ngữ pháp">{children}</AppShell>;
}
