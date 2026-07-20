"use client";

import { Lang } from "@/shared/types";

export function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="flex border border-line rounded-full overflow-hidden text-xs font-bold">
      <button
        type="button"
        onClick={() => onChange("ar")}
        className={`px-3 py-1.5 ${lang === "ar" ? "bg-navy text-white" : "text-ink-soft"}`}
      >
        AR
      </button>
      <button
        type="button"
        onClick={() => onChange("en")}
        className={`px-3 py-1.5 ${lang === "en" ? "bg-navy text-white" : "text-ink-soft"}`}
      >
        EN
      </button>
    </div>
  );
}
