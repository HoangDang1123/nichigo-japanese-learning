import { notFound } from "next/navigation";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
export const dynamic = "force-dynamic";
export default function DevStatesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <main style={{ maxWidth: "50rem", padding: "2rem", margin: "0 auto", display: "grid", gap: "1.5rem" }}>
    <h1>UI states — Development only</h1>
    <EmptyState title="Chưa có nội dung" description="Trạng thái trống để kiểm tra layout." />
    <LoadingState />
    <ErrorState description="Không thể tải dữ liệu thử nghiệm." />
  </main>;
}
