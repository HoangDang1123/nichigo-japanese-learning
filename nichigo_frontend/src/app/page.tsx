import { ThemeSwitcher } from "@/components/theme-switcher";

export default function HomePage() {
  return (
    <div className="nichigo-page">
      <header className="nichigo-header">
        <ThemeSwitcher />
      </header>

      <main className="nichigo-main">
        <h1 className="nichigo-title">Nichigo</h1>
        <p className="nichigo-tagline">
          Học tiếng Nhật dành cho người Việt bắt đầu từ con số 0.
        </p>

        {/* Semantic theme preview card to verify light/dark/system tokens */}
        <section
          className="nichigo-preview-card"
          aria-label="Kiểm tra hệ thống màu giao diện"
        >
          <div className="nichigo-preview-card__header">
            <span className="nichigo-preview-card__title">Giao diện màu ngữ nghĩa</span>
            <span className="nichigo-badge">JPN-UI-001</span>
          </div>
          <p className="nichigo-preview-card__text">
            Hệ thống giao diện sử dụng các biến CSS tập trung tại{" "}
            <code>src/styles/themes.css</code>. Hỗ trợ đầy đủ ba chế độ: Sáng, Tối và Hệ thống.
          </p>
          <div className="nichigo-preview-card__swatches" aria-hidden="true">
            <div className="nichigo-swatch">
              <div className="nichigo-swatch__box nichigo-swatch__box--primary" />
              <span>Chính</span>
            </div>
            <div className="nichigo-swatch">
              <div className="nichigo-swatch__box nichigo-swatch__box--accent" />
              <span>Điểm nhấn</span>
            </div>
            <div className="nichigo-swatch">
              <div className="nichigo-swatch__box nichigo-swatch__box--surface" />
              <span>Bề mặt</span>
            </div>
            <div className="nichigo-swatch">
              <div className="nichigo-swatch__box nichigo-swatch__box--border" />
              <span>Đường viền</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="nichigo-footer">
        <p>Nichigo &bull; Modern Japanese Learning Studio</p>
      </footer>
    </div>
  );
}