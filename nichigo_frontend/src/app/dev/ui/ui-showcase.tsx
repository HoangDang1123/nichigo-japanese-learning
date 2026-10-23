"use client";

import * as React from "react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Dialog,
  Tooltip,
  Progress,
} from "@/components/ui";
import styles from "./dev-ui.module.css";

export function DevUIShowcase() {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("Xin chào Nichigo");
  const [progressVal, setProgressVal] = React.useState(45);

  return (
    <div className={styles.container}>
      {/* ── Top Header Bar ─────────────────────────────────────────────── */}
      <header className={styles.topBar}>
        <div className={styles.headerTitleArea}>
          <div className={styles.titleRow}>
            <span className="studio-stamp" aria-label="Ký hiệu học tập">
              弐
            </span>
            <h1 className={styles.pageTitle}>Nichigo UI Foundation</h1>
            <span className="studio-tag">JPN-UI-002</span>
          </div>
          <p className={styles.pageSubtitle}>
            Modern Japanese Learning Studio &bull; Reusable Component Showcase
          </p>
        </div>

        <div className={styles.row}>
          <ThemeSwitcher />
          <Link href="/">
            <Button variant="ghost" size="sm">
              &larr; Về trang chủ
            </Button>
          </Link>
        </div>
      </header>

      {/* ── Section 1: Typography & Japanese Editorial Aesthetics ───────── */}
      <section className={styles.section} aria-labelledby="sec-typography">
        <div className={styles.sectionHeader}>
          <h2 id="sec-typography" className={styles.sectionTitle}>
            1. Ngữ pháp &amp; Kiểu chữ (Typography)
          </h2>
          <span className={styles.sectionSubtitle}>
            Vietnamese diacritics + Japanese Furigana
          </span>
        </div>

        <div className={styles.grid}>
          <div className={styles.componentBox}>
            <h3 className={styles.componentBoxTitle}>Mẫu câu kèm Furigana (Ruby)</h3>
            <div className={styles.typeSampleGroup}>
              <p className={styles.japanesePhrase}>
                <ruby>
                  私<rt>わたし</rt>
                </ruby>
                は
                <ruby>
                  日本語<rt>にほんご</rt>
                </ruby>
                を
                <ruby>
                  勉強<rt>べんきょう</rt>
                </ruby>
                しています。
              </p>
              <p className={styles.japaneseTranslation}>
                (Tôi đang học tiếng Nhật. — Vietnamese diacritic rendering)
              </p>
            </div>
            <hr className="studio-divider" />
            <div className={styles.typeSampleGroup}>
              <p className={`${styles.japanesePhrase} jp-text--serif`}>
                <ruby>
                  一期一会<rt>いちごいちえ</rt>
                </ruby>
              </p>
              <p className={styles.japaneseTranslation}>
                (Nhất kỳ nhất hội — Đời người chỉ gặp một lần)
              </p>
            </div>
          </div>

          <div className={styles.componentBox}>
            <h3 className={styles.componentBoxTitle}>Bảng âm chuẩn Kana Studio</h3>
            <div className={styles.kanaGrid} aria-label="Hàng nguyên âm tiếng Nhật">
              {[
                { glyph: "あ", romaji: "a" },
                { glyph: "い", romaji: "i" },
                { glyph: "う", romaji: "u" },
                { glyph: "え", romaji: "e" },
                { glyph: "お", romaji: "o" },
                { glyph: "か", romaji: "ka" },
                { glyph: "き", romaji: "ki" },
                { glyph: "く", romaji: "ku" },
                { glyph: "け", romaji: "ke" },
                { glyph: "こ", romaji: "ko" },
              ].map((k) => (
                <div key={k.romaji} className={styles.kanaCell}>
                  <span className={styles.kanaGlyph}>{k.glyph}</span>
                  <span className={styles.kanaRomaji}>{k.romaji}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Buttons ──────────────────────────────────────────── */}
      <section className={styles.section} aria-labelledby="sec-buttons">
        <div className={styles.sectionHeader}>
          <h2 id="sec-buttons" className={styles.sectionTitle}>
            2. Nút bấm (Button)
          </h2>
          <span className={styles.sectionSubtitle}>
            Variants, Sizes, States &amp; Keyboard focus
          </span>
        </div>

        <div className={styles.column}>
          <div className={styles.componentBox}>
            <h3 className={styles.componentBoxTitle}>Biến thể (Variants)</h3>
            <div className={styles.row}>
              <Button variant="primary">Chính (Primary)</Button>
              <Button variant="secondary">Phụ (Secondary)</Button>
              <Button variant="outline">Đường viền (Outline)</Button>
              <Button variant="ghost">Trong suốt (Ghost)</Button>
              <Button variant="danger">Cảnh báo (Danger)</Button>
            </div>
          </div>

          <div className={styles.componentBox}>
            <h3 className={styles.componentBoxTitle}>Kích thước &amp; Trạng thái (Sizes &amp; States)</h3>
            <div className={styles.row}>
              <Button size="sm">Nhỏ (sm)</Button>
              <Button size="md">Vừa (md)</Button>
              <Button size="lg">Lớn (lg)</Button>
              <Button isLoading>Đang xử lý</Button>
              <Button disabled>Vô hiệu hóa</Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Input ────────────────────────────────────────────── */}
      <section className={styles.section} aria-labelledby="sec-inputs">
        <div className={styles.sectionHeader}>
          <h2 id="sec-inputs" className={styles.sectionTitle}>
            3. Ô nhập văn bản (Input)
          </h2>
          <span className={styles.sectionSubtitle}>
            Accessible labels, focus ring, helper &amp; error states
          </span>
        </div>

        <div className={styles.grid}>
          <div className={styles.componentBox}>
            <Input
              label="Tên hiển thị người học"
              placeholder="Nhập tên của bạn..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              helperText="Tên sẽ được sử dụng trong lộ trình học."
            />
          </div>

          <div className={styles.componentBox}>
            <Input
              label="Từ vựng cần tra cứu"
              required
              defaultValue="さくら"
              helperText="Hỗ trợ cả Romaji, Hiragana và Kanji."
            />
          </div>

          <div className={styles.componentBox}>
            <Input
              label="Email đăng ký"
              defaultValue="invalid-email"
              errorMessage="Định dạng email không hợp lệ. Vui lòng kiểm tra lại."
            />
          </div>

          <div className={styles.componentBox}>
            <Input
              label="Mã định danh học viên"
              disabled
              defaultValue="NICHIGO-2026-DEV"
              helperText="Mã này được quản lý tự động bởi hệ thống."
            />
          </div>
        </div>
      </section>

      {/* ── Section 4: Cards ────────────────────────────────────────────── */}
      <section className={styles.section} aria-labelledby="sec-cards">
        <div className={styles.sectionHeader}>
          <h2 id="sec-cards" className={styles.sectionTitle}>
            4. Thẻ nội dung (Card)
          </h2>
          <span className={styles.sectionSubtitle}>
            Warm paper surface &bull; Fine borders &bull; Japanese editorial accents
          </span>
        </div>

        <div className={styles.grid}>
          <Card>
            <CardHeader>
              <div className={styles.row}>
                <CardTitle>Bài 01: Nhập môn Hiragana</CardTitle>
                <span className="studio-tag">Cơ bản</span>
              </div>
              <CardDescription>
                Làm quen với hệ thống chữ viết biểu âm cơ bản đầu tiên của tiếng Nhật.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Hiragana gồm 46 ký tự cơ bản, biểu thị tất cả các âm vị trong tiếng Nhật.
                Học chuẩn từng nét theo thứ tự bút thuận.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="secondary" size="sm">
                Chi tiết
              </Button>
              <Button size="sm">Bắt đầu học</Button>
            </CardFooter>
          </Card>

          <Card variant="accent">
            <CardHeader>
              <div className={styles.row}>
                <CardTitle>Từ vựng: こんにちは</CardTitle>
                <span className="studio-stamp" aria-label="Dấu ghi chú">
                  記
                </span>
              </div>
              <CardDescription>Chào buổi chiều / Xin chào phổ thông</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                <strong>Cách phát âm:</strong> Kon-ni-chi-wa (lưu ý chữ は phát âm là /wa/
                khi đóng vai trò trợ từ hoặc trong câu chào này).
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">
                Nghe phát âm
              </Button>
            </CardFooter>
          </Card>

          <Card variant="interactive">
            <CardHeader>
              <CardTitle>Góc học tập tương tác</CardTitle>
              <CardDescription>
                Thẻ phản hồi di chuột (Hover interactive card)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                Thẻ này kích hoạt thay đổi màu nền và viền nhẹ nhàng khi người dùng
                di chuột, thích hợp cho việc chọn đáp án hoặc bài học.
              </p>
            </CardContent>
            <CardFooter>
              <span className={styles.sectionSubtitle}>Nhấp chuột để xem</span>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* ── Section 5: Dialog & Tooltip ─────────────────────────────────── */}
      <section className={styles.section} aria-labelledby="sec-overlays">
        <div className={styles.sectionHeader}>
          <h2 id="sec-overlays" className={styles.sectionTitle}>
            5. Hộp thoại &amp; Chú giải (Dialog &amp; Tooltip)
          </h2>
          <span className={styles.sectionSubtitle}>
            Accessible modal with focus trap &amp; keyboard tooltip
          </span>
        </div>

        <div className={styles.grid}>
          <div className={styles.componentBox}>
            <h3 className={styles.componentBoxTitle}>Hộp thoại Modal (Dialog)</h3>
            <p className={styles.sectionSubtitle}>
              Hỗ trợ phím Escape, click ra ngoài để đóng, và trả lại tiêu điểm bàn phím.
            </p>
            <div>
              <Button variant="primary" onClick={() => setIsDialogOpen(true)}>
                Mở hộp thoại thử nghiệm
              </Button>
            </div>

            <Dialog
              isOpen={isDialogOpen}
              onClose={() => setIsDialogOpen(false)}
              title="Xác nhận hoàn thành bài học"
              description="Bạn vừa hoàn thành phần luyện tập chữ cái Hiragana hàng A."
              footer={
                <>
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                    Hủy bỏ
                  </Button>
                  <Button variant="primary" onClick={() => setIsDialogOpen(false)}>
                    Tiếp tục bài kế
                  </Button>
                </>
              }
            >
              <p>
                Tiến độ của bạn sẽ được lưu vào hệ thống. Bạn có thể xem lại bài học này
                bất cứ lúc nào trong bảng điều khiển học tập.
              </p>
            </Dialog>
          </div>

          <div className={styles.componentBox}>
            <h3 className={styles.componentBoxTitle}>Chú giải (Tooltip)</h3>
            <p className={styles.sectionSubtitle}>
              Hiển thị khi hover chuột hoặc dùng phím Tab focus.
            </p>
            <div className={styles.row}>
              <Tooltip content="Mẹo: Âm ngắt trong tiếng Nhật được viết bằng chữ Tsu nhỏ っ">
                <Button variant="secondary" size="sm">
                  Di chuột / Focus (Top)
                </Button>
              </Tooltip>

              <Tooltip
                position="bottom"
                content="Lưu ý: Bấm Escape để ẩn nhanh chú giải này"
              >
                <Button variant="outline" size="sm">
                  Chú giải vị trí dưới (Bottom)
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: Progress Indicator ───────────────────────────────── */}
      <section className={styles.section} aria-labelledby="sec-progress">
        <div className={styles.sectionHeader}>
          <h2 id="sec-progress" className={styles.sectionTitle}>
            6. Thanh tiến trình (Progress)
          </h2>
          <span className={styles.sectionSubtitle}>
            Accessible role=&quot;progressbar&quot; &bull; Smooth fill transition
          </span>
        </div>

        <div className={styles.grid}>
          <div className={styles.componentBox}>
            <h3 className={styles.componentBoxTitle}>Thanh tiến độ cố định</h3>
            <Progress value={25} label="Hiragana: Hàng A &bull; Ka" showValue />
            <Progress value={70} label="Tổng thể cấp độ N5" showValue />
            <Progress
              value={100}
              variant="accent"
              label="Hoàn thành bài nhập môn"
              showValue
            />
          </div>

          <div className={styles.componentBox}>
            <h3 className={styles.componentBoxTitle}>Thử nghiệm tương tác động</h3>
            <Progress
              value={progressVal}
              label="Tiến độ học hôm nay"
              showValue
            />
            <div className={styles.row}>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setProgressVal((p) => Math.max(0, p - 15))}
              >
                - 15%
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setProgressVal((p) => Math.min(100, p + 15))}
              >
                + 15%
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setProgressVal(100)}
              >
                100%
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
