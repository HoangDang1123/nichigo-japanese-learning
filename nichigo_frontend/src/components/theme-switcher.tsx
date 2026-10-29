"use client";

import * as React from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { usePopover } from "@/components/ui/use-popover";
import { ThemeSwitcherIcons } from "./theme-switcher-icons";
import styles from "./theme-switcher.module.css";

type ThemeName = "light" | "dark" | "system";

const options: Array<{ value: ThemeName; label: string; Icon: typeof Sun }> = [
  { value: "light", label: "Sáng", Icon: Sun },
  { value: "dark", label: "Tối", Icon: Moon },
  { value: "system", label: "Hệ thống", Icon: Monitor },
];

const emptySubscribe = () => () => {};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { open, rootRef, triggerRef, toggle, close } = usePopover();
  const mounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const selected = mounted && (theme === "light" || theme === "dark" || theme === "system") ? theme : "system";
  const selectedOption = options.find((option) => option.value === selected) ?? options[2];
  const popoverId = React.useId();

  const selectTheme = (value: ThemeName) => {
    setTheme(value);
    close(true);
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = (index + 1) % options.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = (index - 1 + options.length) % options.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else return;

    event.preventDefault();
    optionRefs.current[nextIndex]?.focus();
    setTheme(options[nextIndex].value);
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={`Giao diện: ${selectedOption.label}`}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={toggle}
      >
        <ThemeSwitcherIcons lightClass={styles.effectiveLight} darkClass={styles.effectiveDark} />
      </button>
      {open && (
        <div id={popoverId} className={styles.popover} role="group" aria-label="Chọn giao diện">
          {options.map(({ value, label, Icon }, index) => {
            const active = selected === value;
            return (
              <button
                ref={(element) => { optionRefs.current[index] = element; }}
                key={value}
                type="button"
                className={`${styles.option} ${active ? styles.optionActive : ""}`}
                aria-pressed={active}
                onClick={() => selectTheme(value)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
                {active && <Check className={styles.check} size={18} strokeWidth={2} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
