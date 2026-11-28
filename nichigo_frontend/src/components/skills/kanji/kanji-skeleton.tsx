import { Skeleton, SkeletonRegion } from "../../ui/skeleton";
import styles from "./kanji.module.css";

/** Initial loader for the Kanji list: approximates the card grid. */
export function KanjiGridSkeleton() {
  return <SkeletonRegion label="Đang tải danh sách Kanji…">
    <div className={styles.skeletonGrid} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => <div className={styles.skeletonCard} key={i}>
        <Skeleton variant="block" width="4.25rem" height="4.25rem" />
        <div className={styles.skeletonLines}>
          <Skeleton variant="line" width="70%" height="1.1rem" />
          <Skeleton variant="line" width="90%" />
          <Skeleton variant="line" width="55%" />
        </div>
      </div>)}
    </div>
  </SkeletonRegion>;
}

/** Initial loader for Kanji Detail: hero plus two reading sections. */
export function KanjiDetailSkeleton() {
  return <SkeletonRegion label="Đang tải chữ Kanji…">
    <div aria-hidden="true">
      <div className={styles.hero}>
        <Skeleton variant="block" width="7rem" height="7rem" />
        <Skeleton variant="line" width="min(60%, 14rem)" height="1.5rem" />
      </div>
      <div className={styles.sections}>
        {[0, 1].map((i) => <div className={styles.section} key={i}>
          <Skeleton variant="line" width="40%" />
          <Skeleton variant="line" width="75%" height="1.75rem" />
        </div>)}
      </div>
    </div>
  </SkeletonRegion>;
}
