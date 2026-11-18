"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { LearningTerm } from "../../learning/learning-term";
import styles from "./kanji.module.css";

/**
 * "Lần đầu học Kanji?" guide. Static explanation of concepts (not published Items); the 山 examples are illustrations
 * of the idea. Open by default for first-time learners; a native button toggles it (keyboard and touch), no persistence.
 */
export function KanjiIntro({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const panelId = React.useId();
  return (
    <section className={styles.intro} aria-labelledby={`${panelId}-title`}>
      <h2 className={styles.introTitle} id={`${panelId}-title`}>
        <button type="button" className={styles.introToggle} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
          <span>Lần đầu học Kanji?</span>
          <ChevronDown size={18} aria-hidden="true" className={open ? styles.chevronOpen : styles.chevron} />
        </button>
      </h2>
      {open && (
        <ol className={styles.introSteps} id={panelId}>
          <li>
            <strong>Kanji là gì?</strong>
            <p><LearningTerm term="kanji" /> là chữ Hán dùng trong tiếng Nhật. Mỗi chữ thường mang một ý nghĩa riêng, ví dụ <span lang="ja">山</span> nghĩa là “núi”.</p>
          </li>
          <li>
            <strong>Vì sao một chữ có nhiều cách đọc?</strong>
            <p>
              Tiếng Nhật mượn chữ Hán nhưng vẫn giữ những từ của riêng mình. Vì vậy một chữ có thể đọc theo{" "}
              <LearningTerm term="onyomi">âm Hán (On&apos;yomi)</LearningTerm> hoặc theo{" "}
              <LearningTerm term="kunyomi">tiếng Nhật (Kun&apos;yomi)</LearningTerm>. Ví dụ <span lang="ja">山</span> đọc là{" "}
              <span lang="ja">さん</span> trong <span lang="ja">富士山</span> và đọc là <span lang="ja">やま</span> khi đứng một mình.
            </p>
          </li>
          <li>
            <strong>Người mới nên học thế nào?</strong>
            <p>Học từng chữ một. Trước hết nhận ra hình dạng và nhớ nghĩa, sau đó mới xem cách đọc. Chưa cần nhớ hết mọi cách đọc ngay: hãy chọn một chữ bên dưới để bắt đầu.</p>
          </li>
        </ol>
      )}
    </section>
  );
}
