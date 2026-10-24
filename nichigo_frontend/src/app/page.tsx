import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <AppShell title="Trang chủ">
      <div className={styles.home}>
        <section className={styles.intro} aria-labelledby="intro-title">
          <div className={styles.introCopy}>
            <p className={styles.eyebrow}><span lang="ja">日本語</span><span aria-hidden="true"> / </span>Hành trình mới</p>
            <h1 id="intro-title" className={styles.heading}>Tiếng Nhật, từng bước một.</h1>
            <p className={styles.description}>
              Chào mừng đến Nichigo — không gian học tiếng Nhật dành cho người Việt bắt đầu từ con số 0.
              Nội dung đang được xây dựng; bạn có thể xem trước lộ trình và các nhóm kỹ năng.
            </p>
            <Link href="/learn" className={styles.primary}>
              Khám phá lộ trình <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className={styles.scene} role="img" aria-label="Khung cửa nhìn ra đồi núi dưới nắng sớm">
            <span className={styles.sceneSun} />
            <span className={styles.sceneHillFar} />
            <span className={styles.sceneHillNear} />
            <span className={styles.sceneWindow} />
            <span className={styles.sceneCaption} lang="ja">あたらしい朝</span>
          </div>
        </section>

        <section className={styles.destinations} aria-label="Khám phá Nichigo">
          <Link href="/learn" className={styles.destination}>
            <span className={styles.destinationIndex}>01 <span lang="ja">はじめる</span></span>
            <span className={styles.destinationTitle}>Lộ trình cho người mới</span>
            <span className={styles.destinationDescription}>Bắt đầu làm quen với tiếng Nhật theo từng chặng.</span>
            <span className={styles.destinationArrow} aria-hidden="true">↗</span>
          </Link>
          <Link href="/skills" className={styles.destination}>
            <span className={styles.destinationIndex}>02 <span lang="ja">スキル</span></span>
            <span className={styles.destinationTitle}>Khám phá kỹ năng</span>
            <span className={styles.destinationDescription}>Xem các chủ đề học tập sẽ được bổ sung tại đây.</span>
            <span className={styles.destinationArrow} aria-hidden="true">↗</span>
          </Link>
        </section>

        <aside className={styles.editorial} aria-label="Lời nhắn">
          <span className={styles.editorialMark} lang="ja" aria-hidden="true">余白</span>
          <p>Một khoảng nhỏ mỗi ngày cũng là một khởi đầu tốt.</p>
          <span className={styles.editorialNote} lang="ja">一歩ずつ</span>
        </aside>
      </div>
    </AppShell>
  );
}
