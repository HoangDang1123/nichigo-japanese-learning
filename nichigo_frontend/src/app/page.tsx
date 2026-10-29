import Link from "next/link";
import { ArrowRight, MoveUpRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <AppShell title="Trang chủ">
      <div className={styles.home}>
        <section className={styles.intro} aria-labelledby="intro-title">
          <div className={styles.introCopy}>
            <p className={styles.eyebrow}><span lang="ja">日本語の時間</span><span aria-hidden="true"> / </span>Dành cho người mới</p>
            <h1 id="intro-title" className={styles.heading}>Tiếng Nhật, từng bước một.</h1>
            <p className={styles.description}>
              Một không gian học tiếng Nhật dành cho người Việt. Khám phá lộ trình và những kỹ năng nền tảng theo nhịp riêng của bạn.
            </p>
            <div className={styles.actions}>
              <Link href="/learn" className={styles.primary}>
                Khám phá lộ trình <MoveUpRight size={17} strokeWidth={1.8} aria-hidden="true" />
              </Link>
              <Link href="/skills" className={styles.secondary}>
                Khám phá kỹ năng <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className={styles.scene} role="img" aria-label="Hoa anh đào và cổng torii nhìn ra mặt trời trên những triền đồi Nhật Bản">
            <span className={styles.sceneSun} />
            <span className={`${styles.sakuraCluster} ${styles.sakuraClusterOne}`} aria-hidden="true">
              <i /><i /><i /><i /><i />
            </span>
            <span className={`${styles.sakuraCluster} ${styles.sakuraClusterTwo}`} aria-hidden="true">
              <i /><i /><i /><i /><i />
            </span>
            <span className={styles.sceneArch} />
            <span className={styles.sceneHillFar} />
            <span className={styles.sceneHillNear} />
            <span className={styles.scenePillar} />
            <span className={styles.sceneCaption} lang="ja">一歩ずつ</span>
          </div>
        </section>

        <section className={styles.explore} aria-labelledby="explore-title">
          <div className={styles.exploreHeading}>
            <p className={styles.sectionEyebrow} lang="ja">学びの入口</p>
            <h2 id="explore-title">Bắt đầu theo cách của bạn</h2>
            <p>Hai hướng khám phá, cùng một hành trình học tập.</p>
          </div>

          <div className={styles.destinations}>
            <Link href="/learn" className={styles.destination}>
              <span className={styles.destinationIndex}>01 <span lang="ja">はじめる</span></span>
              <span className={styles.destinationTitle}>Lộ trình cho người mới</span>
              <span className={styles.destinationDescription}>Làm quen với tiếng Nhật qua từng chặng học tập.</span>
              <MoveUpRight className={styles.destinationArrow} size={18} strokeWidth={1.8} aria-hidden="true" />
            </Link>
            <Link href="/skills" className={styles.destination}>
              <span className={styles.destinationIndex}>02 <span lang="ja">スキル</span></span>
              <span className={styles.destinationTitle}>Khám phá kỹ năng</span>
              <span className={styles.destinationDescription}>Xem các chủ đề sẽ được bổ sung tại đây.</span>
              <MoveUpRight className={styles.destinationArrow} size={18} strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <aside className={styles.editorial} aria-label="Lời nhắn">
          <span className={styles.editorialMark} lang="ja" aria-hidden="true">余白</span>
          <p>Một khoảng nhỏ mỗi ngày cũng là một khởi đầu tốt.</p>
          <span className={styles.editorialNote} lang="ja">ゆっくりでいい</span>
        </aside>
      </div>
    </AppShell>
  );
}
