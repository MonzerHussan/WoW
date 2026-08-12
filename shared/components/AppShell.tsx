"use client";

import Link from "next/link";
import { Lang } from "@/shared/types";
import { Logo } from "@/shared/components/Logo";
import { LangToggle } from "@/shared/components/LangToggle";
import LogoutButton from "@/shared/components/LogoutButton";
import { t } from "@/shared/i18n/translations";

export type AppShellScreen = "profile" | "community" | "course" | "projects" | "games" | "assessments" | "instructors" | "aiAssist";

const SCREEN_ORDER: { key: AppShellScreen; href: string; labelKey: "nav.profile" | "nav.community" | "nav.course" | "nav.projects" | "nav.games" | "nav.assessments" | "nav.instructors" }[] = [
  { key: "profile", href: "/profile", labelKey: "nav.profile" },
  { key: "community", href: "/community", labelKey: "nav.community" },
  { key: "course", href: "/courses", labelKey: "nav.course" },
  { key: "projects", href: "/project", labelKey: "nav.projects" },
  { key: "games", href: "/games", labelKey: "nav.games" },
  { key: "assessments", href: "/assessments", labelKey: "nav.assessments" },
  { key: "instructors", href: "/instructors", labelKey: "nav.instructors" },
];

/**
 * The persistent shell every signed-in top-level screen wraps itself
 * with. A shared COMPONENT each page's own top-level content component
 * composes with, not a Next.js route-group layout — TECH_DEBT #16
 * explicitly flagged that upgrade as its own separate decision. Every
 * existing route's URL and file location stays untouched.
 *
 * Nav order (owner-specified): Profile / Community / Course / Projects /
 * Games / Assessments / Instructors / AI Assist. Logo click goes to the
 * public landing page ("/"), not Profile — a deliberate distinction
 * between "brand mark → marketing home" and "your own screens" now that
 * Profile is a real, always-present tab rather than the implicit
 * post-login landing spot.
 *
 * Deliberately CONTROLLED (lang/dir/onLangChange as props, no internal
 * useLang) rather than owning its own toggle — see git history for the
 * full reasoning; unchanged from the previous round.
 */
export function AppShell({
  active,
  walletBalance,
  agentChosenName,
  lang,
  dir,
  onLangChange,
  children,
}: {
  active: AppShellScreen;
  walletBalance: number;
  agentChosenName: string;
  lang: Lang;
  dir: "rtl" | "ltr";
  onLangChange: (l: Lang) => void;
  children: React.ReactNode;
}) {
  return (
    <div dir={dir}>
      <header className="border-b border-line bg-white">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <Logo className="h-7 shrink-0" href="/" />

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold text-navy bg-navy/5 rounded-full px-3 py-1.5 tabular-nums">
              {walletBalance} {t("nav.walletLabel", lang)}
            </span>
            <LangToggle lang={lang} onChange={onLangChange} />
            <LogoutButton label={t("auth.logout", lang)} />
          </div>
        </div>

        <nav className="max-w-6xl mx-auto px-5 flex gap-1 overflow-x-auto">
          {SCREEN_ORDER.map((s) => (
            <Link
              key={s.key}
              href={s.href}
              className={`px-3 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition ${
                active === s.key ? "border-navy text-navy" : "border-transparent text-ink-soft hover:text-navy"
              }`}
            >
              {t(s.labelKey, lang)}
            </Link>
          ))}
          <Link
            href="/ai-assist"
            className={`px-3 py-2 text-sm font-bold whitespace-nowrap border-b-2 transition ${
              active === "aiAssist" ? "border-navy text-navy" : "border-transparent text-ink-soft hover:text-navy"
            }`}
          >
            {agentChosenName || t("nav.aiAssistFallback", lang)}
          </Link>
        </nav>
      </header>

      <div>{children}</div>
    </div>
  );
}
