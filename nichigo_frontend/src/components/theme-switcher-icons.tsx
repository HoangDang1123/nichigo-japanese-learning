import { Moon, Sun } from "lucide-react";

export function ThemeSwitcherIcons({ lightClass, darkClass }: { lightClass: string; darkClass: string }) {
  return (
    <>
      <span className={lightClass}><Sun size={20} strokeWidth={1.8} aria-hidden="true" /></span>
      <span className={darkClass}><Moon size={20} strokeWidth={1.8} aria-hidden="true" /></span>
    </>
  );
}
