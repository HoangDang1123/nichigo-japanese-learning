"use client";
import styles from "./states.module.css";
export function ErrorState({ title = "Không thể tải nội dung", description, onRetry }: { title?: string; description: string; onRetry?: () => void }) {
  return <section className={styles.state} role="alert">
    <h2 className={styles.title}>{title}</h2>
    <p className={styles.description}>{description}</p>
    {onRetry && <button type="button" className={styles.retry} onClick={onRetry}>Thử lại</button>}
  </section>;
}
