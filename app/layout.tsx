import type { Metadata } from "next";
import { Tajawal, IBM_Plex_Sans_Arabic } from "next/font/google";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WOW | World of Work",
  description: "منصة تعليمية مهنية تجمع بين التعليم والتوظيف والتطوير الوظيفي",
};

// Reads the wow.lang cookie (shared/lib/lang-cookie.server.ts, 035)
// rather than a static "ar" default — a side effect of the cookie
// migration rather than its point: it fixes the root <html> tag's own
// lang/dir for EVERY
// page, including the eight not yet migrated to a real per-page toggle
// (TECH_DEBT — see its entry). Those eight still render their own
// content in hardcoded Arabic regardless, so a chosen "en" cookie can
// make <html lang="en" dir="ltr"> disagree with genuinely Arabic visible
// text on those pages — each one's own <main dir="rtl"> still wins
// visually (dir is inherited per-subtree), so nothing renders backwards;
// only the outer document's own lang/dir metadata is briefly imprecise
// until that page is migrated too.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = getServerLang();
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <html lang={lang} dir={dir} className={`${tajawal.variable} ${plexArabic.variable}`}>
      <body className="bg-bg text-ink font-body antialiased">{children}</body>
    </html>
  );
}
