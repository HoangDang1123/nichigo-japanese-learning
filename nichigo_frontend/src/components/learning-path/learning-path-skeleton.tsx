import { Skeleton, SkeletonRegion } from "../ui/skeleton";
import styles from "./learning-path-skeleton.module.css";

/** Future JPN-030 published-path loader; the current Railway preview does not mount this. */
export function LearningPathSkeleton() {
  return <SkeletonRegion label="Đang tải lộ trình học…" className={styles.page}>
    <div className={styles.hero} aria-hidden="true">
      <div className={styles.heading}><Skeleton variant="line" width="min(70%, 24rem)" height="2.75rem" /><Skeleton variant="line" width="11rem" height="1.25rem" /></div>
      <div className={styles.rail}>
        {Array.from({ length: 4 }, (_, index) => <div className={styles.station} key={index}>
          <Skeleton variant="circle" width="2.5rem" height="2.5rem" />
          <Skeleton variant="line" width="5rem" />
        </div>)}
      </div>
    </div>
    <div className={styles.detailGrid} aria-hidden="true">
      <div className={styles.lessonPanel}>
        <Skeleton variant="line" width="8rem" />
        <Skeleton variant="line" width="min(90%, 22rem)" height="2rem" />
        <Skeleton variant="line" width="min(75%, 28rem)" />
        <div className={styles.sections}>
          <Skeleton variant="block" height="3rem" />
          <Skeleton variant="block" height="3rem" />
          <Skeleton variant="block" height="3rem" />
        </div>
      </div>
      <div className={styles.sidePanels}>
        <div className={styles.sidePanel}><Skeleton variant="line" width="8rem" height="1.25rem" /><Skeleton variant="line" width="65%" /></div>
        <div className={styles.sidePanel}><Skeleton variant="line" width="10rem" height="1.25rem" /><Skeleton variant="block" height="3rem" /></div>
      </div>
    </div>
  </SkeletonRegion>;
}
