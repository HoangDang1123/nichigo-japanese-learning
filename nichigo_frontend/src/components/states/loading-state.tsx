import styles from "./states.module.css";
export function LoadingState({ label = "Đang tải nội dung…" }: { label?: string }) {
  return <div className={styles.state} role="status" aria-live="polite">
    <span className={styles.spinner} aria-hidden="true" />
    <p className={styles.description}>{label}</p>
  </div>;
}
