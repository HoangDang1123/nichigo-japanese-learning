import * as React from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import styles from "./auth-layout.module.css";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.viewport}>
      <div className={styles.background} aria-hidden="true" />
      <div className={styles.overlay} aria-hidden="true" />
      <div className={styles.themeControl}><ThemeSwitcher /></div>
      <div className={styles.content}>{children}</div>
    </main>
  );
}
