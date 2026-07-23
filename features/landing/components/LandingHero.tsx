"use client";

import { useState } from "react";
import { Lang } from "@/shared/types";
import { t, TranslationKey } from "@/shared/i18n/translations";
import { getAccountTypeLabel } from "@/shared/constants/account-types";
import { LANDING_PERSONAS, LandingStage } from "@/features/landing/constants";

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

const RING_STAGES: {
  stage: LandingStage;
  num: string;
  labelKey: TranslationKey;
  posClass: string;
  colorVar: string;
}[] = [
  { stage: "edu", num: "01", labelKey: "landing.ringEdu", posClass: "top-[2%] end-[6%]", colorVar: "#0B1E4D" },
  { stage: "hire", num: "02", labelKey: "landing.ringHire", posClass: "top-[38%] -start-[4%]", colorVar: "#E0630A" },
  { stage: "promote", num: "03", labelKey: "landing.ringPromote", posClass: "bottom-[2%] end-[12%]", colorVar: "#6D28D9" },
];

export function LandingHero({ lang }: { lang: Lang }) {
  const [personaId, setPersonaId] = useState<LandingPersonaId>("student");
  const persona = LANDING_PERSONAS.find((p) => p.id === personaId)!;

  return (
    <section className="py-16 pb-10">
      <div className="max-w-[1180px] mx-auto px-7 grid grid-cols-1 md:grid-cols-[1.05fr_.95fr] gap-14 items-center">
        <div>
          <div className="flex gap-2 mb-6 flex-wrap">
            {LANDING_PERSONAS.map((p) => {
              const { label } = getAccountTypeLabel(p.accountType, lang);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersonaId(p.id)}
                  className={`cursor-pointer border-[1.5px] rounded-full px-4 py-2 text-[13px] font-bold font-display transition
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

          <div className="inline-flex items-center gap-2 font-display font-bold text-[13px] text-orange-dark bg-orange/10 px-3.5 py-1.5 rounded-full mb-4 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-orange">
            {t("landing.heroEyebrow", lang)}
          </div>

          <h1 className="font-display text-navy text-3xl md:text-[50px] leading-[1.18] tracking-tight">
            <EditorialHeadline text={t(persona.titleKey, lang)} />
          </h1>
          <p className="text-ink-soft text-[17px] max-w-[520px] mt-5 leading-relaxed">{t(persona.subKey, lang)}</p>

          <div className="flex gap-3.5 mt-7 flex-wrap">
            <a
              href="/signup"
              className="bg-gradient-to-br from-orange to-orange-dark text-white px-8 py-3.5 rounded-full font-bold text-[15px] shadow-lg shadow-orange-dark/25 hover:-translate-y-0.5 transition"
            >
              {t(persona.ctaKey, lang)}
            </a>
            <a
              href="#audiences"
              className="border-[1.5px] border-line px-6 py-3.5 rounded-full font-bold text-[15px] text-navy hover:border-navy transition"
            >
              {t("landing.heroGhost", lang)}
            </a>
          </div>
        </div>

        <div className="relative aspect-square max-w-[440px] w-full justify-self-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[150px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#1c3a86,#0B1E4D_70%)] flex flex-col items-center justify-center text-white text-center shadow-2xl shadow-navy/35 p-2.5">
            <b className="font-display text-sm font-extrabold">{t("landing.ringTitle", lang)}</b>
            <span className="text-[11px] opacity-75 mt-1">{t("landing.ringSub", lang)}</span>
          </div>

          {RING_STAGES.map((s) => {
            const highlighted = s.stage === persona.stage;
            return (
              <div
                key={s.stage}
                className={`absolute w-32 bg-white border rounded-2xl px-4 py-3.5 transition-all duration-300 ${s.posClass} ${
                  highlighted ? "-translate-y-1 scale-105 shadow-xl" : "border-line shadow-lg shadow-navy/10"
                }`}
                style={highlighted ? { borderColor: s.colorVar, boxShadow: `0 16px 34px ${s.colorVar}4D` } : undefined}
              >
                <div className="text-[11px] text-ink-soft font-semibold">{s.num}</div>
                <div className="font-display font-extrabold text-[13.5px]" style={{ color: s.colorVar }}>
                  {t(s.labelKey, lang)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type LandingPersonaId = (typeof LANDING_PERSONAS)[number]["id"];
