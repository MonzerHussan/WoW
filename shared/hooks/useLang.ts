"use client";

import { useState, useCallback, useEffect } from "react";
import { Lang } from "@/shared/types";
import { t, TranslationKey } from "@/shared/i18n/translations";
import { LANG_COOKIE_NAME } from "@/shared/lib/lang-cookie";

function isLang(value: unknown): value is Lang {
  return value === "ar" || value === "en";
}

function readCookieLang(): Lang | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)wow\.lang=([^;]*)/);
  const value = match ? decodeURIComponent(match[1]) : null;
  return isLang(value) ? value : null;
}

function writeCookieLang(value: Lang) {
  try {
    // 1 year, path=/ so every route sees it, Lax so it still rides along
    // on the OAuth/auth-callback redirect.
    document.cookie = `${LANG_COOKIE_NAME}=${value}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Cookies blocked (private mode / hardened settings) — the choice
    // still applies to this page, it just won't persist.
  }
}

/**
 * The language choice persists across pages and reloads via a COOKIE
 * (`wow.lang`), not localStorage — a Server Component can read a cookie
 * (shared/lib/lang-cookie.ts's getServerLang()), which is what makes it
 * possible to pass the real, already-correct `initial` value in from the
 * server on the pages that do so, eliminating the old "first paint in
 * the default, then flips" flash entirely for those pages. Pages that
 * still call `useLang("ar")` with a hardcoded default (everything not
 * yet migrated — see TECH_DEBT.md) keep the old flash-then-correct
 * behavior via the effect below, same as before.
 *
 * Note: each useLang() call owns its own state. Two components on the
 * same page therefore both *load* the same cookie value, but toggling
 * one does not live-update the other (TECH_DEBT #18) — unchanged by
 * this migration, still a real limitation.
 */
export function useLang(initial: Lang = "ar") {
  const [lang, setLangState] = useState<Lang>(initial);

  useEffect(() => {
    const stored = readCookieLang();
    if (stored && stored !== initial) setLangState(stored);
  }, [initial]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    writeCookieLang(next);
  }, []);

  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  const translate = useCallback((key: TranslationKey) => t(key, lang), [lang]);

  return { lang, setLang, dir, t: translate };
}
