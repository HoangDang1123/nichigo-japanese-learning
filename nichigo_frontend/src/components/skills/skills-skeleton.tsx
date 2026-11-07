import { Skeleton, SkeletonRegion } from "../ui/skeleton";
import styles from "./skills-skeleton.module.css";

/** Future published Skills listing loader; /skills currently has an honest static empty state. */
export function SkillsSkeleton() {
  return <SkeletonRegion label="Đang tải thư viện kỹ năng…" className={styles.page}>
    <div className={styles.heading} aria-hidden="true">
      <Skeleton variant="line" width="min(75%, 20rem)" height="2.5rem" />
      <Skeleton variant="line" width="min(90%, 32rem)" />
    </div>
    <div className={styles.grid} aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => <div className={styles.card} key={index}>
        <Skeleton variant="circle" width="2.5rem" height="2.5rem" />
        <Skeleton variant="line" width="75%" height="1.25rem" />
        <Skeleton variant="line" width="90%" />
        <Skeleton variant="line" width="60%" />
      </div>)}
    </div>
  </SkeletonRegion>;
}
