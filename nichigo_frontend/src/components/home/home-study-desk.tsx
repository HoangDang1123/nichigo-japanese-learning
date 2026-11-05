import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BookOpen, ChartNoAxesColumn, Goal,
  Grid2X2, Languages, PencilLine, Play, Sparkles,
} from "lucide-react";
import type { AuthStatus } from "@/store/slices/auth-slice";
import styles from "@/app/home.module.css";

/** Only verified JPN-040/041 learning data may populate this model. */
export interface HomeProgress {
  resume: {
    title: string;
    context: string;
    href: string;
    completedActivities: number;
    totalActivities: number;
  } | null;
  weeklyActivity: readonly { dayLabel: string; minutes: number }[] | null;
  goal: { title: string; context: string; completed: number; target: number } | null;
  recommendations: readonly {
    title: string;
    description: string;
    href: string;
    minutes?: number;
  }[] | null;
}

interface HomeStudyDeskProps {
  status: AuthStatus;
  authenticated: boolean;
  progress: HomeProgress | null;
}

const quickLinks = [
  { title: "Bảng chữ cái", subtitle: "Hiragana · Katakana", href: "/skills", icon: Languages, eyebrow: "KANA" },
  { title: "Từ vựng", subtitle: "Khám phá kỹ năng", href: "/skills", icon: BookOpen, eyebrow: "VOCAB" },
  { title: "Ngữ pháp", subtitle: "Mẫu câu và cấu trúc", href: "/skills", icon: Sparkles, eyebrow: "GRAMMAR" },
  { title: "Luyện tập", subtitle: "Bắt đầu từ lộ trình", href: "/learn", icon: PencilLine, eyebrow: "PRACTICE" },
] as const;

export function HomeStudyDesk({ status, authenticated, progress }: HomeStudyDeskProps) {
  const data = authenticated ? progress : null;
  const checking = status === "checking";
  const unavailable = status === "unavailable";
  const guest = status === "guest" || (status === "authenticated" && !authenticated);
  const resume = data?.resume;
  const activity = data?.weeklyActivity;
  const goal = data?.goal;
  const recommendations = data?.recommendations;

  return (
    <div className={styles.home}>
      <header className={styles.welcome}>
        <span className={styles.welcomeDecoration} aria-hidden="true">✿</span>
        <p className={styles.japaneseGreeting} lang="ja">{authenticated ? "おかえりなさい！" : "ようこそ！"}</p>
        <h1>{authenticated ? "Chào mừng trở lại" : "Chào mừng đến NichiGo"}</h1>
        <span className={styles.welcomeRule} aria-hidden="true" />
        <p className={styles.welcomeNote}>
          {checking ? "Đang mở không gian học của bạn…"
            : unavailable ? "Bạn vẫn có thể khám phá nội dung học."
              : guest ? "Một góc học tiếng Nhật để bắt đầu theo nhịp riêng của bạn."
                : "Hôm nay, mình cùng học thêm một bước nhỏ nhé."}
        </p>
      </header>

      <div className={`${styles.topGrid} ${resume ? styles.topGridWithProgress : ""}`}>
        <section className={`${styles.panel} ${styles.resumePanel}`} aria-labelledby="resume-heading">
          <div className={styles.panelHeading}>
            <span className={styles.headingIcon}><Play size={18} fill="currentColor" aria-hidden="true" /></span>
            <h2 id="resume-heading">Tiếp tục học</h2>
          </div>
          {resume ? (
            <div className={styles.resumeBody}>
              <p className={styles.resumeTitle}>{resume.title}</p>
              <p className={styles.muted}>{resume.context}</p>
              {resume.totalActivities > 0 && (
                <div className={styles.progressLine}>
                  <progress value={resume.completedActivities} max={resume.totalActivities} aria-label="Tiến độ bài học" />
                  <span>{resume.completedActivities} / {resume.totalActivities} hoạt động</span>
                </div>
              )}
              <Link className={styles.primaryLink} href={resume.href}>
                Tiếp tục bài học <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className={styles.emptyBody}>
              <p className={styles.emptyTitle}>
                {checking ? "Đang tải trạng thái học tập"
                  : unavailable ? "Chưa thể xem bài học gần đây"
                    : guest ? "Bắt đầu hành trình của bạn"
                      : "Chưa có bài học để tiếp tục"}
              </p>
              <p className={styles.muted}>
                {checking ? "Chúng tôi đang kiểm tra phiên đăng nhập."
                  : unavailable ? "Lộ trình vẫn có thể được khám phá trong lúc chờ dữ liệu học tập."
                    : guest ? "Khám phá lộ trình dành cho người mới bắt đầu."
                      : "Khi có dữ liệu học tập, bài học gần nhất sẽ xuất hiện ở đây."}
              </p>
              {!checking && (
                <Link className={styles.primaryLink} href="/learn">
                  Khám phá lộ trình <ArrowRight size={17} aria-hidden="true" />
                </Link>
              )}
            </div>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="activity-heading">
          <div className={styles.panelHeading}>
            <ChartNoAxesColumn className={styles.sectionIcon} size={24} aria-hidden="true" />
            <h2 id="activity-heading">Tiến độ học tập</h2>
            <span className={styles.periodLabel}>7 ngày gần đây</span>
          </div>
          {activity?.length ? <ActivityChart days={activity} /> : (
            <div className={styles.activityEmpty}>
              {!checking && !unavailable && (
                <span className={styles.emptyWeek} aria-hidden="true">
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <span key={day}><i />{day}</span>)}
                </span>
              )}
              <p className={styles.emptyTitle}>
                {checking ? "Đang kiểm tra dữ liệu hoạt động"
                  : unavailable ? "Chưa thể tải hoạt động"
                    : guest ? "Hoạt động học sẽ hiển thị ở đây"
                      : "Chưa có dữ liệu hoạt động"}
              </p>
              <p className={styles.muted}>
                {guest ? "Đăng nhập để xem tiến độ khi tính năng lưu học tập sẵn sàng."
                  : unavailable ? "Dữ liệu học tập hiện chưa hiển thị."
                    : checking ? "Dữ liệu sẽ hiển thị sau khi kiểm tra xong."
                      : "Tuần học của bạn sẽ hiện ở đây khi có dữ liệu được lưu."}
              </p>
            </div>
          )}
        </section>
      </div>

      <div className={styles.middleGrid}>
        <section className={styles.panel} aria-labelledby="recommendations-heading">
          <div className={styles.panelHeading}>
            <Sparkles className={styles.sectionIcon} size={24} aria-hidden="true" />
            <div>
              <h2 id="recommendations-heading">{recommendations?.length ? "Hôm nay nên học gì?" : "Bắt đầu từ đây"}</h2>
              <p className={styles.headingDescription}>
                {recommendations?.length ? "Gợi ý từ hành trình học của bạn" : "Chọn một hướng để khám phá"}
              </p>
            </div>
          </div>
          <div className={styles.recommendationList}>
            {recommendations?.length ? recommendations.map((item) => (
              <Recommendation key={`${item.href}-${item.title}`} title={item.title} description={item.description} href={item.href} minutes={item.minutes} />
            )) : (
              <>
                <Recommendation title="Khám phá lộ trình học" description="Xem nơi bạn có thể bắt đầu học tiếng Nhật." href="/learn" />
                <Recommendation title="Duyệt thư viện kỹ năng" description="Tìm hiểu Kana, từ vựng và ngữ pháp." href="/skills" />
              </>
            )}
          </div>
          {guest && <p className={styles.panelFootnote}><Link href="/login">Đăng nhập</Link> để xem gợi ý cá nhân khi tiến độ học tập được hỗ trợ.</p>}
        </section>

        <section className={`${styles.panel} ${styles.goalPanel}`} aria-labelledby="goal-heading">
          <div className={styles.panelHeading}>
            <Goal className={styles.sectionIcon} size={24} aria-hidden="true" />
            <h2 id="goal-heading">Mục tiêu học tập</h2>
          </div>
          {goal && goal.target > 0 ? <GoalSummary goal={goal} /> : (
            <div className={styles.goalEmpty}>
              <span className={styles.goalPlaceholder} aria-hidden="true"><Goal size={21} strokeWidth={1.6} /></span>
              <div>
                <p className={styles.emptyTitle}>
                  {checking ? "Đang kiểm tra mục tiêu"
                    : unavailable ? "Chưa thể xem mục tiêu"
                      : "Chưa có mục tiêu học tập"}
                </p>
                <p className={styles.muted}>Mục tiêu học tập sẽ xuất hiện khi tính năng này sẵn sàng.</p>
                <Link className={styles.textLink} href="/learn">Xem lộ trình <ArrowRight size={15} aria-hidden="true" /></Link>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className={styles.quickSection} aria-labelledby="quick-heading">
        <div className={styles.quickHeading}>
          <Grid2X2 className={styles.sectionIcon} size={23} aria-hidden="true" />
          <h2 id="quick-heading">Học nhanh</h2>
          <span>Khám phá theo cách của bạn</span>
        </div>
        <div className={styles.quickGrid}>
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link className={styles.quickCard} href={item.href} key={item.title}
                aria-label={`${item.title} — ${item.href === "/learn" ? "mở Lộ trình học" : "mở Kỹ năng"}`}>
                <span className={styles.quickEyebrow}>{item.eyebrow}</span>
                <Icon className={styles.quickIcon} size={29} strokeWidth={1.5} aria-hidden="true" />
                <strong>{item.title}</strong>
                <span className={styles.quickSubtitle}>{item.subtitle}</span>
                <ArrowUpRight className={styles.quickArrow} size={18} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Recommendation({ title, description, href, minutes }: {
  title: string; description: string; href: string; minutes?: number;
}) {
  return (
    <Link className={styles.recommendation} href={href}>
      <span className={styles.recommendationSymbol}><BookOpen size={19} aria-hidden="true" /></span>
      <span className={styles.recommendationCopy}><strong>{title}</strong><small>{description}</small></span>
      {minutes !== undefined && <span className={styles.timeChip}>{minutes} phút</span>}
      <ArrowUpRight size={18} aria-hidden="true" />
    </Link>
  );
}

function ActivityChart({ days }: { days: NonNullable<HomeProgress["weeklyActivity"]> }) {
  const maximum = Math.max(...days.map((day) => day.minutes), 1);
  return (
    <div className={styles.activityChart} role="list" aria-label="Thời gian học theo ngày trong 7 ngày gần đây">
      {days.map((day, index) => (
        <div className={styles.activityDay} role="listitem" key={`${day.dayLabel}-${index}`}
          aria-label={`${day.dayLabel}: ${day.minutes} phút`}>
          <span className={styles.chartTrack}>
            <span className={styles.chartBar} style={{ height: `${Math.max(0, Math.min(100, day.minutes / maximum * 100))}%` }} />
          </span>
          <span className={styles.dayLabel}>{day.dayLabel}</span>
        </div>
      ))}
    </div>
  );
}

function GoalSummary({ goal }: { goal: NonNullable<HomeProgress["goal"]> }) {
  const percent = Math.max(0, Math.min(100, goal.completed / goal.target * 100));
  return (
    <div className={styles.goalBody}>
      <div className={styles.goalRing} style={{ "--goal-progress": `${percent}%` } as CSSProperties}
        role="img" aria-label={`Đã hoàn thành ${goal.completed} trên ${goal.target} mục tiêu`}>
        <strong>{Math.round(percent)}%</strong>
      </div>
      <div className={styles.goalCopy}>
        <h3>{goal.title}</h3>
        <p>{goal.context}</p>
        <span>Đã hoàn thành: {goal.completed} / {goal.target}</span>
      </div>
    </div>
  );
}
