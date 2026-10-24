import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/states/empty-state";
export default function ProgressPage() {
  return <AppShell title="Tiến độ"><EmptyState title="Chưa có tiến độ học tập" description="Khi tính năng lưu kết quả học tập được triển khai, bạn sẽ xem tiến độ của mình tại đây." /></AppShell>;
}
