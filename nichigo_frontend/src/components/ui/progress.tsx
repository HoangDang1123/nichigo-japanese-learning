import * as React from "react";
import styles from "./progress.module.css";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: "primary" | "accent";
}

export function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  variant = "primary",
  className = "",
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const indicatorVariantClass =
    variant === "accent" ? styles.indicatorAccent : styles.indicatorPrimary;

  return (
    <div className={`${styles.container} ${className}`.trim()} {...props}>
      {(label || showValue) && (
        <div className={styles.header}>
          {label && <span className={styles.label}>{label}</span>}
          {showValue && <span className={styles.value}>{percentage}%</span>}
        </div>
      )}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Tiến độ học tập"}
      >
        <div
          className={`${styles.indicator} ${indicatorVariantClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
