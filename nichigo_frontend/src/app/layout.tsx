import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nichigo",
  description:
    "Nichigo — Học tiếng Nhật dành cho người Việt bắt đầu từ con số 0.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang="vi" — primary content language is Vietnamese (PRD §1)
    // data-theme attribute is the hook for the future CSS token system (JPN-UI-001)
    <html lang="vi" data-theme="system">
      <body>{children}</body>
    </html>
  );
}
