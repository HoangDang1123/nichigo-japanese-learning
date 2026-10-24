import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <AppShell title="Trang chủ">
      <section className={styles.intro} aria-labelledby="intro-title">
        <p className={styles.eyebrow}>日本語 · Hành trình mới</p>
        <h1 id="intro-title" className={styles.heading}>Tiếng Nhật, từng bước một.</h1>
        <p className={styles.description}>
          Chào mừng đến Nichigo — không gian học tiếng Nhật dành cho người Việt bắt đầu từ con số 0.
          Nội dung học tập đang được xây dựng; bạn có thể khám phá các khu vực sắp ra mắt.
        </p>
        <div className={styles.actions}>
          <Link href="/learn" className={styles.primary}>Khám phá lộ trình <span aria-hidden="true">→</span></Link>
          <Link href="/skills" className={styles.secondary}>Xem kỹ năng</Link>
        </div>
      </section>
      <section className={styles.note} aria-labelledby="coming-title">
        <span className={styles.sectionNumber}>01 / はじめに</span>
        <h2 id="coming-title">Một nơi để bắt đầu</h2>
        <p>Những bài học nhập môn, luyện chữ và bài tập sẽ được bổ sung dần.
          Hiện tại Nichigo chưa lưu kết quả học tập.</p>
      </section>
    </AppShell>
  );
}
