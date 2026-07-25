"use client";

import { useState, useCallback, useEffect } from "react";
import { Lang } from "@/shared/types";
import { t, TranslationKey } from "@/shared/i18n/translations";

const STORAGE_KEY = "wow.lang";

function isLang(value: unknown): value is Lang {
  return value === "ar" || value === "en";
}

/**
 * The language choice now persists across pages and reloads (localStorage,
 * `wow.lang`) — before this, every page re-mounted at its own "ar" default,
 * so the toggle was effectively forgotten the moment you navigated.
 *
 * localStorage is read in an effect, never during render, deliberately:
 * the server has no access to it, so seeding state from it directly would
 * make the first client render disagree with the server's HTML — a real
 * hydration mismatch. The tradeoff is a brief first paint in `initial`
 * before a stored non-default choice applies. A cookie read server-side
 * would remove even that flash, but only by threading an initial lang
 * through every page that renders a translated component — a much larger
 * change than this hook.
 *
 * Note: each useLang() call owns its own state. Two components on the same
 * page therefore both *load* the same stored value, but toggling one does
 * not live-update the other. No page currently mounts two independent
 * toggles, so this isn't a live problem — it would need a context or a
 * shared store if that changes.
 */
export function useLang(initial: Lang = "ar") {
  const [lang, setLangState] = useState<Lang>(initial);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage blocked (private mode / hardened settings) — keep `initial`.
    }
    if (isLang(stored)) setLangState(stored);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still applies to this page, it just won't persist.
    }
  }, []);

  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  const translate = useCallback((key: TranslationKey) => t(key, lang), [lang]);

  return { lang, setLang, dir, t: translate };
}
