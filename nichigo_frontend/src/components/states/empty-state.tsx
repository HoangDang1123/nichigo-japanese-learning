import type { ReactNode } from "react";
import styles from "./states.module.css";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className={styles.state} aria-label={title}>
    <span className={styles.mark} aria-hidden="true">余白</span>
    <h2 className={styles.title}>{title}</h2>
    <p className={styles.description}>{description}</p>
    {action && <div className={styles.action}>{action}</div>}
  </section>;
}
