import { DEMO_LABEL } from "./kanji-demo";
import styles from "./kanji.module.css";

/** Shown above every screen that renders the development-only demo fallback. */
export function DemoBanner() {
  return (
    <p className={styles.demoBanner} role="note">
      <strong>{DEMO_LABEL}</strong> — đây không phải nội dung Kanji đã xuất bản. Chỉ hiển thị khi bật chế độ phát triển.
    </p>
  );
}
