"use client";

import { useState } from "react";
import { BookOpen, CalendarDays, Check, ChevronDown, Flame, LockKeyhole, Map, TrainFront, type LucideIcon } from "lucide-react";
import styles from "./learning-path-journey.module.css";

export type StationStatus = "completed" | "current" | "upcoming" | "locked";
export interface LessonSection { id: string; title: string; detail: string; completed?: boolean }
export interface LearningStation {
  id: string;
  number: number;
  title: string;
  status: StationStatus;
  description?: string;
  sections?: readonly LessonSection[];
}
/** Future adapter input: only published content and verified learner progress. */
export interface LearningPathData {
  name: string;
  level: string;
  stations: readonly LearningStation[];
  selectedStationId?: string;
  reviewItems?: readonly { id: string; title: string; completed: boolean }[];
  streakDays?: number;
}

const previewStations: readonly LearningStation[] = [
  { id: "preview-completed", number: 1, title: "Mẫu 01", status: "completed" },
  { id: "preview-current", number: 2, title: "Mẫu 02", status: "current" },
  { id: "preview-upcoming", number: 3, title: "Mẫu 03", status: "upcoming" },
  { id: "preview-locked", number: 4, title: "Mẫu 04", status: "locked" },
];
const stationIcons: Record<StationStatus, LucideIcon> = { completed: Check, current: TrainFront, upcoming: Map, locked: LockKeyhole };
const previewVariants: Record<StationStatus, string> = {
  completed: "Kiểu hoàn thành", current: "Kiểu hiện tại", upcoming: "Kiểu sắp tới", locked: "Kiểu chưa mở",
};

/** Every station node sits at the centre of an equal grid column and on this curve. */
function railwayPath(stationCount: number): string {
  let path = "M0 74 C20 74 20 38 50 38";
  for (let index = 0; index < stationCount - 1; index += 1) {
    const midpoint = (index + 1) * 100;
    path += ` C${midpoint - 20} 38 ${midpoint - 20} 74 ${midpoint} 74`;
    path += ` C${midpoint + 20} 74 ${midpoint + 20} 38 ${midpoint + 50} 38`;
  }
  const end = stationCount * 100;
  return `${path} C${end - 20} 38 ${end - 20} 74 ${end} 74`;
}

function RailwayStation({ station, selected, preview, onSelect }: {
  station: LearningStation; selected: boolean; preview: boolean; onSelect: () => void;
}) {
  const Icon = stationIcons[station.status];
  const statusText = { completed: "đã hoàn thành", current: "đang học", upcoming: "sắp tới", locked: "chưa mở" }[station.status];
  const numberLabel = `${preview ? "Mẫu" : "Chặng"} ${String(station.number).padStart(2, "0")}`;
  return (
    <li className={`${styles.station} ${styles[station.status]}`}>
      <button type="button" className={styles.stationButton} onClick={onSelect} aria-pressed={selected}
        aria-label={preview ? `${numberLabel}: ${previewVariants[station.status]}, chỉ minh họa` : `${numberLabel}: ${station.title}, ${statusText}`}>
        <span className={styles.stationNode}><Icon size={23} strokeWidth={2} aria-hidden="true" /></span>
        <span className={styles.stationNumber}>{numberLabel}</span>
        <span className={styles.stationName}>{preview ? previewVariants[station.status] : station.title}</span>
      </button>
    </li>
  );
}

export function LearningPathJourney({ path }: { path: LearningPathData | null }) {
  const preview = path === null;
  const stations = path ? path.stations : previewStations;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = stations.find((station) => station.id === selectedId)
    ?? stations.find((station) => station.id === path?.selectedStationId)
    ?? stations.find((station) => station.status === "current") ?? stations[0];
  const reviews = path?.reviewItems;

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="learning-path-heading">
        <div className={styles.heroTop}>
          <div>
            <p className={styles.eyebrow} lang="ja">学びの道</p>
            <h1 id="learning-path-heading">Lộ trình học</h1>
            <button className={styles.pathIdentity} type="button" disabled aria-label="Chọn lộ trình, chưa có danh sách lộ trình để chọn"><span>{path ? `${path.name} / ${path.level}` : "Irodori / Sơ cấp 1"}</span><ChevronDown size={20} aria-hidden="true" /></button>
          </div>
          <span className={styles.levelBadge}>{path?.level ?? "Sơ cấp 1 · xem trước"}</span>
        </div>
        {preview && <p className={styles.previewNotice} role="status">Bản xem trước tương tác. Các mẫu dưới đây chỉ minh họa kiểu hiển thị, không phải bài học hay tiến độ của bạn.</p>}
        <div className={styles.landscape} aria-hidden="true"><span className={styles.sun} /><span className={styles.mountainBack} /><span className={styles.mountainFront} /><span className={styles.landscapeText} lang="ja">一歩ずつ</span></div>
        <div className={styles.railViewport} role="region" aria-label="Các chặng trên lộ trình học" tabIndex={0}>
          <div className={styles.railCanvas} style={{ minWidth: `${Math.max(4, stations.length) * 10.5}rem` }}>
            {stations.length ? <>
              <svg className={styles.railLine} viewBox={`0 0 ${stations.length * 100} 96`} preserveAspectRatio="none" aria-hidden="true"><path d={railwayPath(stations.length)} /></svg>
              <ol className={styles.stations} style={{ gridTemplateColumns: `repeat(${stations.length}, minmax(0, 1fr))` }}>{stations.map((station) => <RailwayStation key={station.id} station={station} selected={selected?.id === station.id} preview={preview} onSelect={() => setSelectedId(station.id)} />)}</ol>
            </> : <p className={styles.noStations}>Chưa có chặng học nào được xuất bản.</p>}
          </div>
        </div>
        <p className={styles.railHint}>Chọn {preview ? "một mẫu để xem kiểu hiển thị" : "một chặng để xem thông tin bài học"}. Trên màn hình hẹp, cuộn ngang để xem thêm.</p>
      </section>
      <div className={styles.detailGrid}>
        <section className={styles.lessonPanel} aria-labelledby="selected-lesson-heading">
          <div className={styles.panelTopline}><span className={styles.sectionTag}><TrainFront size={16} aria-hidden="true" /> {preview ? "Xem trước lộ trình" : selected?.status === "current" ? "Đang học" : "Chặng đã chọn"}</span><span className={styles.lessonNumber}>{selected ? `${preview ? "Mẫu" : "Chặng"} ${String(selected.number).padStart(2, "0")}` : "Chưa có chặng"}</span></div>
          <h2 id="selected-lesson-heading">{preview ? "Bài học đang được chuẩn bị" : selected?.title ?? "Chưa có bài học"}</h2>
          <p className={styles.lessonDescription}>{preview ? "Bài học và các mục nội dung sẽ xuất hiện khi được duyệt và xuất bản." : selected?.description ?? "Chưa có mô tả cho chặng này."}</p>
          <div className={styles.sectionDivider} />
          <h3>Nội dung bài học</h3>
          {selected?.sections?.length ? <ul className={styles.lessonSections}>{selected.sections.map((section) => <li key={section.id}><BookOpen size={19} aria-hidden="true" /><span>{section.title}</span><small>{section.detail}</small>{section.completed && <Check size={17} aria-label="Đã hoàn thành" />}</li>)}</ul> : <div className={styles.lessonEmpty}><BookOpen size={22} aria-hidden="true" /><p>Chưa có nội dung bài học được xuất bản.</p></div>}
        </section>
        <aside className={styles.sidePanels} aria-label="Hoạt động học tập">
          <section className={styles.smallPanel} aria-labelledby="streak-heading"><div className={styles.sideTitle}><Flame size={24} aria-hidden="true" /><h2 id="streak-heading">Chuỗi học tập</h2></div>{path?.streakDays === undefined ? <p className={styles.sideEmpty}>Chưa có dữ liệu chuỗi học tập.</p> : <p className={styles.streakValue}><strong>{path.streakDays}</strong> ngày liên tiếp</p>}<span className={styles.panelDecoration} aria-hidden="true">✿</span></section>
          <section className={styles.smallPanel} aria-labelledby="review-heading"><div className={styles.sideTitle}><CalendarDays size={24} aria-hidden="true" /><h2 id="review-heading">Ôn tập hôm nay</h2></div>{reviews?.length ? <ul className={styles.reviewList}>{reviews.map((item) => <li key={item.id}><span>{item.completed ? <Check size={16} aria-hidden="true" /> : <span className={styles.reviewDot} />}</span>{item.title}</li>)}</ul> : <p className={styles.sideEmpty}>Chưa có nội dung ôn tập được xác nhận.</p>}</section>
        </aside>
      </div>
    </div>
  );
}
