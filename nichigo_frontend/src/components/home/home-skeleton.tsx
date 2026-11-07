import { Skeleton, SkeletonRegion } from "../ui/skeleton";
import home from "../../app/home.module.css";
import styles from "./home-skeleton.module.css";

/** Shown only while the existing auth session check has not resolved. */
export function HomeSkeleton() {
  return <SkeletonRegion label="Đang mở không gian học của bạn…" className={home.home}>
    <div className={`${home.welcome} ${styles.welcome}`} aria-hidden="true">
      <Skeleton variant="line" width="8rem" height="1rem" />
      <Skeleton variant="line" width="min(75%, 32rem)" height="clamp(2rem, 4vw, 3rem)" />
      <Skeleton variant="line" width="min(55%, 22rem)" />
    </div>

    <div className={home.topGrid} aria-hidden="true">
      <div className={`${home.panel} ${styles.panel}`}>
        <div className={styles.heading}><Skeleton variant="circle" width="2.5rem" height="2.5rem" /><Skeleton variant="line" width="10rem" height="1.25rem" /></div>
        <div className={styles.stack}><Skeleton variant="line" width="78%" height="1.4rem" /><Skeleton variant="line" width="52%" /><Skeleton variant="block" height="2.5rem" /></div>
      </div>
      <div className={`${home.panel} ${styles.panel}`}>
        <div className={styles.heading}><Skeleton variant="circle" width="2.5rem" height="2.5rem" /><Skeleton variant="line" width="11rem" height="1.25rem" /></div>
        <div className={styles.activity}><Skeleton variant="block" height="6.5rem" /><div className={styles.stack}><Skeleton variant="line" width="90%" /><Skeleton variant="line" width="65%" /></div></div>
      </div>
    </div>

    <div className={home.middleGrid} aria-hidden="true">
      <div className={`${home.panel} ${styles.panel}`}>
        <div className={styles.heading}><Skeleton variant="circle" width="2.5rem" height="2.5rem" /><Skeleton variant="line" width="12rem" height="1.25rem" /></div>
        <div className={styles.stack}><Skeleton variant="block" height="3.75rem" /><Skeleton variant="block" height="3.75rem" /></div>
      </div>
      <div className={`${home.panel} ${styles.panel}`}>
        <div className={styles.heading}><Skeleton variant="circle" width="2.5rem" height="2.5rem" /><Skeleton variant="line" width="10rem" height="1.25rem" /></div>
        <div className={styles.goal}><Skeleton variant="circle" width="5.5rem" height="5.5rem" /><div className={styles.stack}><Skeleton variant="line" width="9rem" /><Skeleton variant="line" width="7rem" /></div></div>
      </div>
    </div>

    <div className={home.quickSection} aria-hidden="true">
      <Skeleton variant="line" width="9rem" height="1.5rem" />
      <div className={home.quickGrid}>
        {Array.from({ length: 4 }, (_, index) => <div className={styles.quickCard} key={index}>
          <Skeleton variant="circle" width="2rem" height="2rem" />
          <Skeleton variant="line" width="75%" height="1.2rem" />
          <Skeleton variant="line" width="60%" />
        </div>)}
      </div>
    </div>
  </SkeletonRegion>;
}
