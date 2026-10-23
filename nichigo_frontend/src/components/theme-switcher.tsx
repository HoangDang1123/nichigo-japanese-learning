"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import styles from "./theme-switcher.module.css";

const THEME_OPTIONS = [
  {
    value: "light",
    label: "Sáng",
    description: "Giao diện Sáng (Light)",
    icon: (
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Tối",
    description: "Giao diện Tối (Dark)",
    icon: (
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    value: "system",
    label: "Hệ thống",
    description: "Giao diện Hệ thống (System default)",
    icon: (
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
] as const;

// Stable no-op subscription for useSyncExternalStore
const emptySubscribe = () => () => {};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  // Idiomatic React 18/19 hydration detection without cascading renders
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  return (
    <div
      role="group"
      aria-label="Chọn giao diện hiển thị"
      className={styles.switcherContainer}
    >
      {THEME_OPTIONS.map((option) => {
        // Before mounting on the client, match 'system' fallback
        // to prevent SSR/client hydration mismatch.
        const isActive = mounted ? theme === option.value : option.value === "system";

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.description}
            className={`${styles.switcherButton} ${isActive ? styles.active : ""}`}
            onClick={() => setTheme(option.value)}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}