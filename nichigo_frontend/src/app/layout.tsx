import type { Metadata } from "next";
import { Be_Vietnam_Pro, Klee_One, Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ReduxProvider } from "@/components/providers/redux-provider";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

const notoSansJp = Noto_Sans_JP({
  weight: "variable",
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-jp",
});

const notoSerifJp = Noto_Serif_JP({
  weight: "variable",
  display: "swap",
  preload: false,
  variable: "--font-noto-serif-jp",
});

// Handwriting-style (textbook) face, used ONLY for the large glyph in the Kana study grid.
const kleeOne = Klee_One({
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-klee-one",
});

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
    <html lang="vi" suppressHydrationWarning className={`${beVietnamPro.variable} ${notoSansJp.variable} ${notoSerifJp.variable} ${kleeOne.variable}`}>
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
