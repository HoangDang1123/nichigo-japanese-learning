import type { CSSProperties, ReactNode } from "react";
import styles from "./skeleton.module.css";

type SkeletonVariant = "line" | "circle" | "block";

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
}

/** Decorative shape. Put the loading announcement and aria-busy on its parent region. */
export function Skeleton({ variant = "block", width, height, className = "" }: SkeletonProps) {
  const size: CSSProperties = { width, height };

  return <span
    aria-hidden="true"
    className={`${styles.skeleton} ${styles[variant]} ${className}`.trim()}
    style={size}
  />;
}

export function SkeletonRegion({ label, className, children }: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return <>
    <span className={styles.announcement} role="status">{label}</span>
    <div className={className} aria-busy="true" aria-label={label}>{children}</div>
  </>;
}
