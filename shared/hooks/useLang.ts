"use client";

import { useState, useCallback } from "react";
import { Lang } from "@/shared/types";
import { t, TranslationKey } from "@/shared/i18n/translations";

export function useLang(initial: Lang = "ar") {
  const [lang, setLang] = useState<Lang>(initial);
  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  const translate = useCallback((key: TranslationKey) => t(key, lang), [lang]);

  return { lang, setLang, dir, t: translate };
}
