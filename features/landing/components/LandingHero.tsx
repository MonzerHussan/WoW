"use client";

import { useState } from "react";
import { Lang } from "@/shared/types";
import { t } from "@/shared/i18n/translations";
import { getAccountTypeLabel } from "@/shared/constants/account-types";
import { LANDING_PERSONAS } from "@/features/landing/constants";

/**
 * Editorial two-weight headline treatment: splits on the natural AR
 * comma / EN em-dash break each persona title already uses where
 * present, rendering the lead clause in font-black and the rest in a
 * lighter font-normal for stronger typographic contrast (same Tajawal
 * family, two clearly different weights). Falls back to a single
 * font-black run for any title without that break — still correct,
 * just without the extra contrast.
 */
function EditorialHeadline({ text }: { text: string }) {
  for (const delimiter of ["، ", " — "]) {
    const idx = text.indexOf(delimiter);
    if (idx > -1) {
      const lead = text.slice(0, idx + delimiter.length);
      const rest = text.slice(idx + delimiter.length);
      return (
        <>
          <span className="font-black">{lead}</span>
          <span className="font-normal">{rest}</span>
        </>
      );
    }
  }
  return <span className="font-black">{text}</span>;
}

/**
 * The middle column of the above-the-fold 3-column layout (built in
 * LandingPage.tsx) — no longer its own <section>/grid. The decorative
 * "ring" visual (3 floating 01/02/03 stage cards around a center
 * circle) that used to sit beside this content was removed: it was
 * redundant with the full JOURNEY_CARDS section further down the page
 * (same three-stage concept, already explained in full there), and
 * removing it is what makes room for the new right-column content.
 */
export function LandingHero({ lang }: { lang: Lang }) {
  const [personaId, setPersonaId] = useState<LandingPersonaId>("student");
  const persona = LANDING_PERSONAS.find((p) => p.id === personaId)!;

  return (
    <div>
      <div className="flex gap-2 mb-5 flex-wrap">
        {LANDING_PERSONAS.map((p) => {
          const { label } = getAccountTypeLabel(p.accountType, lang);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPersonaId(p.id)}
              className={`cursor-pointer border-[1.5px] rounded-full px-3.5 py-1.5 text-[12.5px] font-bold font-display transition
                ${
                  personaId === p.id
                    ? "bg-navy border-navy text-white"
                    : "bg-white border-line text-ink-soft hover:border-navy/40"
                }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="inline-flex items-center gap-2 font-display font-bold text-[12.5px] text-orange-dark bg-orange/10 px-3 py-1.5 rounded-full mb-3.5 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-orange">
        {t("landing.heroEyebrow", lang)}
      </div>

      <h1 className="font-display text-navy text-3xl md:text-[40px] leading-[1.15] tracking-tight">
        <EditorialHeadline text={t(persona.titleKey, lang)} />
      </h1>
      <p className="text-ink-soft text-[15.5px] max-w-[480px] mt-4 leading-relaxed">{t(persona.subKey, lang)}</p>

      <div className="flex gap-3 mt-6 flex-wrap">
        <a
          href="/signup"
          className="bg-gradient-to-br from-orange to-orange-dark text-white px-7 py-3 rounded-full font-bold text-sm shadow-lg shadow-orange-dark/25 hover:-translate-y-0.5 transition"
        >
          {t(persona.ctaKey, lang)}
        </a>
        <a
          href="#audiences"
          className="border-[1.5px] border-line px-5 py-3 rounded-full font-bold text-sm text-navy hover:border-navy transition"
        >
          {t("landing.heroGhost", lang)}
        </a>
      </div>
    </div>
  );
}

type LandingPersonaId = (typeof LANDING_PERSONAS)[number]["id"];
