import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ReduxProvider } from "@/components/providers/redux-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nichigo — Học tiếng Nhật cho người Việt",
  description:
    "Nichigo — Học tiếng Nhật dành cho người Việt bắt đầu từ con số 0.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning is required on <html> when using next-themes
    // to prevent hydration warnings from the theme script setting data-theme.
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <ReduxProvider>{children}</ReduxProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
