"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { LangToggle } from "@/shared/components/LangToggle";
import { Logo } from "@/shared/components/Logo";
import { LandingHero } from "./LandingHero";
import {
  JOURNEY_CARDS,
  AUDIENCE_CARDS,
  LANDING_STATS,
  COMPANY_STEPS,
  PANEL_CANDIDATES,
  TRENDING_TOPICS,
  FEED_POSTS,
  SUGGESTED_MENTORS,
} from "@/features/landing/constants";

/**
 * Phase-1 visual mockup (ROADMAP.md's phased rollout) — local-only
 * toggle, never writes anywhere. Real follow functionality is a later,
 * separately-gated phase.
 */
function FollowButton({ label, followingLabel }: { label: string; followingLabel: string }) {
  const [following, setFollowing] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFollowing((v) => !v)}
      className={`mt-3 w-full rounded-full px-4 py-2 text-[13px] font-bold font-display border-[1.5px] transition ${
        following ? "bg-navy border-navy text-white" : "border-line text-navy hover:border-navy/40"
      }`}
    >
      {following ? followingLabel : label}
    </button>
  );
}

function Eyebrow({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 font-display font-bold text-[13px] px-3.5 py-1.5 rounded-full mb-4 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-orange ${
        onDark ? "bg-white/10 text-[#FFB877]" : "bg-orange/10 text-orange-dark"
      }`}
    >
      {children}
    </div>
  );
}

function Wrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`max-w-[1180px] mx-auto px-7 ${className}`}>{children}</div>;
}

export function LandingPage() {
  const { lang, setLang, dir, t } = useLang("ar");
  const journeyRef = useRef<HTMLDivElement>(null);

  // Prototype's IntersectionObserver card reveal, ported to React.
  useEffect(() => {
    const cards = journeyRef.current?.querySelectorAll("[data-reveal]");
    if (!cards?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.remove("opacity-0", "translate-y-6"), i * 90);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  return (
    <div dir={dir} className="bg-bg text-ink">
      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur-md border-b border-line">
        <nav className="flex items-center justify-between px-7 py-4 max-w-[1180px] mx-auto gap-4">
          <Logo />
          <div className="hidden md:flex gap-6 font-semibold text-[14.5px] text-ink-soft">
            <a className="hover:text-navy transition" href="#journey">{t("landing.navJourney")}</a>
            <a className="hover:text-navy transition" href="#audiences">{t("landing.navAudiences")}</a>
            <a className="hover:text-navy transition" href="#companies">{t("landing.navCompanies")}</a>
            <a className="hover:text-navy transition" href="#stats">{t("landing.navStats")}</a>
          </div>
          <div className="flex items-center gap-3.5">
            <LangToggle lang={lang} onChange={setLang} />
            <a href="/login" className="hidden sm:block font-bold text-sm text-navy hover:opacity-80 transition whitespace-nowrap">
              {t("auth.login")}
            </a>
            <a
              href="/signup"
              className="bg-navy text-white px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap hover:-translate-y-0.5 hover:shadow-lg hover:shadow-navy/25 transition"
            >
              {t("landing.navCta")}
            </a>
          </div>
        </nav>
      </header>

      {/* ===== HERO ===== */}
      <LandingHero lang={lang} />

      {/* ===== TRENDING + SPONSOR (Phase-1 visual mockup — static, no backend) ===== */}
      <section className="pb-[70px]">
        <Wrap>
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-stretch">
            <div className="bg-white border border-line rounded-wow p-6">
              <div className="font-display font-bold text-[11px] uppercase tracking-[1.1px] text-ink-soft mb-4">
                {t("landing.trendingEyebrow")}
              </div>
              <ol className="flex flex-col gap-3.5">
                {TRENDING_TOPICS.map((key, i) => (
                  <li key={key} className="flex gap-3 items-baseline">
                    <span className="font-display font-black text-orange text-[13px] flex-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[13.5px] font-semibold text-navy leading-snug">{t(key)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-6">
              <div className="bg-navy rounded-wow p-7 md:p-9 text-white flex flex-col justify-center">
                <div className="font-display font-bold text-[11px] uppercase tracking-[1.1px] text-[#FFB877] mb-3">
                  {t("landing.sponsorEyebrow")}
                </div>
                <h3 className="font-display font-black text-2xl md:text-[28px] mb-3">{t("landing.sponsorTitle")}</h3>
                <p className="text-[#C4CCE8] text-[14.5px] max-w-[440px] mb-6">{t("landing.sponsorBody")}</p>
                <a
                  href="/courses/8986e80e-4f85-48d5-9abe-e7669b3bb1cb"
                  className="inline-block w-fit bg-gradient-to-br from-orange to-orange-dark text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg shadow-orange-dark/25 hover:-translate-y-0.5 transition"
                >
                  {t("landing.sponsorCta")}
                </a>
              </div>

              <div className="bg-white border-2 border-orange rounded-wow p-6 flex flex-col justify-center text-center">
                <div className="font-display font-black text-navy text-[38px] leading-none tracking-tight">
                  {t("landing.outcomeStatPlaceholder")}
                </div>
                <p className="text-ink-soft text-[12.5px] mt-3 leading-snug">{t("landing.outcomeStatShortCaption")}</p>
              </div>
            </div>
          </div>

          {/* ===== ADVERTISE ON WOW (reserved ad space — visual only, no functional link) ===== */}
          <div className="mt-6 border-2 border-dashed border-line rounded-wow p-7 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
            <div>
              <h4 className="font-display font-black text-navy text-lg mb-1">{t("landing.advertiseTitle")}</h4>
              <p className="text-ink-soft text-[13.5px]">{t("landing.advertiseSub")}</p>
            </div>
            <button
              type="button"
              className="flex-none border-[1.5px] border-navy text-navy px-6 py-3 rounded-full font-bold text-sm hover:bg-navy hover:text-white transition"
            >
              {t("landing.advertiseCta")}
            </button>
          </div>
        </Wrap>
      </section>

      {/* ===== JOURNEY ===== */}
      <section id="journey" className="py-[90px]">
        <Wrap>
          <div className="max-w-[640px] mb-14">
            <Eyebrow>{t("landing.journeyEyebrow")}</Eyebrow>
            <h2 className="font-display font-black text-navy text-[33px] leading-[1.3]">{t("landing.journeyTitle")}</h2>
            <p className="text-ink-soft mt-3.5">{t("landing.journeySub")}</p>
          </div>
          <div className="relative" ref={journeyRef}>
            <div className="hidden md:block absolute top-[46px] inset-x-[9%] h-0.5 bg-[repeating-linear-gradient(90deg,#E7E2D6_0_8px,transparent_8px_16px)]" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-[1]">
              {JOURNEY_CARDS.map((card) => (
                <div
                  key={card.stage}
                  data-reveal
                  className="bg-white border border-line rounded-wow p-7 px-6 opacity-0 translate-y-6 transition-all duration-500 hover:shadow-2xl hover:shadow-navy/10"
                >
                  <div className={`w-14 h-14 rounded-[14px] flex items-center justify-center mb-4 text-white text-2xl ${card.iconBg}`}>
                    {card.icon}
                  </div>
                  <h3 className={`font-display font-black text-xl mb-2 ${card.titleColor}`}>{t(card.titleKey)}</h3>
                  <p className="text-[14.5px] text-ink-soft mb-4">{t(card.descKey)}</p>
                  <ul className="text-[13.5px] text-ink-soft space-y-1.5">
                    {card.featKeys.map((k) => (
                      <li key={k} className="relative ps-[18px] before:absolute before:start-0 before:text-xs before:content-['←'] ltr:before:content-['→']">
                        {t(k)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      {/* ===== AUDIENCES ===== */}
      <section id="audiences" className="py-0">
        <Wrap>
          <div className="bg-navy text-white rounded-[32px] py-20 px-6 md:px-12">
            <div className="max-w-[640px] mb-14">
              <Eyebrow onDark>{t("landing.audEyebrow")}</Eyebrow>
              <h2 className="font-display font-black text-white text-[33px] leading-[1.3]">{t("landing.audTitle")}</h2>
              <p className="text-[#B9C3E6] mt-3.5">{t("landing.audSub")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {AUDIENCE_CARDS.map((card) => (
                <div key={card.tagKey} className="bg-white/[.06] border border-white/[.12] rounded-2xl px-4 py-5">
                  <div className="font-display font-extrabold text-[15px] mb-2.5">{t(card.tagKey)}</div>
                  <p className="text-[13px] text-[#C4CCE8]">{t(card.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      {/* ===== STATS ===== */}
      <section id="stats" className="py-[90px]">
        <Wrap>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 border-y border-line py-10">
            {LANDING_STATS.map((s, i) => (
              <div key={s.labelKey} className={`text-center ${i > 0 ? "md:border-s md:border-line" : ""}`}>
                <b className="font-display text-4xl text-navy block">{s.value}</b>
                <span className="text-[13.5px] text-ink-soft">{t(s.labelKey)}</span>
              </div>
            ))}
          </div>
        </Wrap>
      </section>

      {/* ===== OUTCOME STAT (honest — no fabricated number yet) ===== */}
      <section className="pb-[90px]">
        <Wrap>
          <div className="text-center max-w-[640px] mx-auto">
            <Eyebrow>{t("landing.outcomeStatEyebrow")}</Eyebrow>
            <div className="font-display font-black text-navy text-[52px] md:text-[68px] leading-none tracking-tight">
              {t("landing.outcomeStatPlaceholder")}
            </div>
            <p className="text-ink-soft mt-4 text-[15px]">{t("landing.outcomeStatCaption")}</p>
          </div>
        </Wrap>
      </section>

      {/* ===== FEED (Phase-1 visual mockup — static posts, no backend) ===== */}
      <section className="pb-[90px]">
        <Wrap>
          <div className="max-w-[640px] mb-10">
            <Eyebrow>{t("landing.feedEyebrow")}</Eyebrow>
            <h2 className="font-display font-black text-navy text-[33px] leading-[1.3]">{t("landing.feedTitle")}</h2>
          </div>
          <div className="flex flex-col gap-5 max-w-[720px]">
            {FEED_POSTS.map((post) => (
              <div key={post.titleKey} className="bg-white border border-line rounded-wow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 flex-none rounded-full bg-navy text-white flex items-center justify-center font-display font-bold text-sm">
                    {t(post.authorKey).trim().charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[14.5px] text-navy truncate">{t(post.authorKey)}</div>
                    <div className="text-xs text-ink-soft truncate">
                      {t(post.roleKey)} · {t(post.timeKey)}
                    </div>
                  </div>
                  <span className="ms-auto flex-none font-display font-bold text-[11px] uppercase tracking-wide text-orange-dark bg-orange/10 px-2.5 py-1 rounded-full">
                    {t(post.tagKey)}
                  </span>
                </div>
                <h4 className="font-display font-extrabold text-navy text-[16.5px] mb-2 leading-snug">
                  {t(post.titleKey)}
                </h4>
                <p className="text-[13.5px] text-ink-soft leading-relaxed">{t(post.bodyKey)}</p>
                <div className="flex gap-5 text-ink-soft text-[13px] mt-4 pt-4 border-t border-line">
                  <span>❤️ {post.likes.toLocaleString("en-US")}</span>
                  <span>💬 {post.comments.toLocaleString("en-US")}</span>
                </div>
              </div>
            ))}
          </div>
        </Wrap>
      </section>

      {/* ===== SUGGESTED MENTORS (Phase-1 visual mockup — Follow is a local-only toggle) ===== */}
      <section className="pb-[90px]">
        <Wrap>
          <div className="max-w-[640px] mb-10">
            <Eyebrow>{t("landing.mentorsEyebrow")}</Eyebrow>
            <h2 className="font-display font-black text-navy text-[33px] leading-[1.3]">{t("landing.mentorsTitle")}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {SUGGESTED_MENTORS.map((mentor) => (
              <div key={mentor.id} className="bg-white border border-line rounded-wow p-6 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-[conic-gradient(from_180deg,#0B1E4D,#F2841C,#6D28D9)] text-white flex items-center justify-center font-display font-bold text-lg mb-3">
                  {t(mentor.nameKey).trim().charAt(0)}
                </div>
                <div className="font-bold text-navy text-[15px]">{t(mentor.nameKey)}</div>
                <div className="text-xs text-ink-soft mt-1">{t(mentor.fieldKey)}</div>
                <FollowButton label={t("landing.followCta")} followingLabel={t("landing.followingCta")} />
              </div>
            ))}
          </div>
        </Wrap>
      </section>

      {/* ===== COMPANIES ===== */}
      <section id="companies" className="pb-[90px]">
        <Wrap className="grid grid-cols-1 md:grid-cols-2 gap-14 items-center">
          <div>
            <Eyebrow>{t("landing.compEyebrow")}</Eyebrow>
            <h2 className="font-display font-black text-navy text-3xl mb-4">{t("landing.compTitle")}</h2>
            <p className="text-ink-soft mb-6">{t("landing.compSub")}</p>
            <ul className="mb-7">
              {COMPANY_STEPS.map((step, i) => (
                <li key={step.titleKey} className="flex gap-3.5 mb-5">
                  <div className="font-display font-black text-sm text-white bg-orange w-[30px] h-[30px] flex-none rounded-[9px] flex items-center justify-center">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-display font-extrabold text-base text-navy mb-1">{t(step.titleKey)}</h4>
                    <p className="text-[13.5px] text-ink-soft">{t(step.descKey)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <a
              href="/signup"
              className="inline-block bg-gradient-to-br from-orange to-orange-dark text-white px-8 py-3.5 rounded-full font-bold text-[15px] shadow-lg shadow-orange-dark/25 hover:-translate-y-0.5 transition"
            >
              {t("landing.compCta")}
            </a>
          </div>
          <div className="bg-white border border-line rounded-wow p-7 shadow-2xl shadow-navy/5">
            <div className="font-display font-extrabold text-[15px] text-navy mb-4">{t("landing.panelTitle")}</div>
            {PANEL_CANDIDATES.map((c, i) => (
              <div
                key={c.nameKey}
                className={`flex justify-between items-center py-3.5 gap-2.5 ${
                  i < PANEL_CANDIDATES.length - 1 ? "border-b border-dashed border-line" : ""
                }`}
              >
                <div>
                  <div className="font-bold text-[14.5px] text-navy">{t(c.nameKey)}</div>
                  <div className="text-[12.5px] text-ink-soft">{t(c.infoKey)}</div>
                </div>
                <div className="text-xs font-extrabold text-white bg-teal px-2.5 py-1 rounded-full whitespace-nowrap">
                  {t(c.matchKey)}
                </div>
              </div>
            ))}
          </div>
        </Wrap>
      </section>

      {/* ===== CTA ===== */}
      <section id="cta" className="pb-[90px]">
        <Wrap>
          <div className="bg-gradient-to-r from-navy via-navy-dark to-purple rounded-[28px] py-16 px-10 text-center text-white">
            <Eyebrow onDark>{t("landing.ctaEyebrow")}</Eyebrow>
            <h2 className="font-display font-black text-white text-[32px] mb-4">{t("landing.ctaTitle")}</h2>
            <p className="text-[#C4CCE8] max-w-[520px] mx-auto mb-7">{t("landing.ctaSub")}</p>
            <a
              href="/signup"
              className="inline-block bg-gradient-to-br from-orange to-orange-dark text-white px-8 py-3.5 rounded-full font-bold text-[15px] shadow-lg shadow-orange-dark/25 hover:-translate-y-0.5 transition"
            >
              {t("landing.ctaBtn")}
            </a>
          </div>
        </Wrap>
      </section>

      {/* ===== CLOSING (full-bleed dark, static — Phase-1 visual mockup) ===== */}
      <section className="bg-navy py-20 px-7 text-center text-white">
        <h2
          className={`font-display font-black text-[34px] md:text-[48px] leading-[1.2] max-w-[720px] mx-auto ${
            lang === "en" ? "italic" : ""
          }`}
        >
          {lang === "ar" ? (
            <>
              رحلتك المهنية <span className="text-orange">قصة تُروى</span>
            </>
          ) : (
            t("landing.closingTitle")
          )}
        </h2>
        <p className="text-[#C4CCE8] max-w-[520px] mx-auto mt-5 mb-8 text-[15.5px]">{t("landing.closingSub")}</p>
        <a
          href="/signup"
          className="inline-block bg-gradient-to-br from-orange to-orange-dark text-white px-9 py-4 rounded-full font-bold text-[15px] shadow-lg shadow-orange-dark/25 hover:-translate-y-0.5 transition"
        >
          {t("landing.closingCta")}
        </a>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="pb-8">
        <Wrap>
          <div className="flex justify-between flex-wrap gap-6 border-t border-line pt-7">
            <Logo className="h-7" />
            <div className="flex gap-6 text-[13.5px] text-ink-soft flex-wrap">
              <a className="hover:text-navy transition" href="#journey">{t("landing.navJourney")}</a>
              <a className="hover:text-navy transition" href="#audiences">{t("landing.navAudiences")}</a>
              <a className="hover:text-navy transition" href="#companies">{t("landing.navCompaniesFooter")}</a>
              <a className="hover:text-navy transition" href="#cta">{t("landing.footContact")}</a>
            </div>
          </div>
          <div className="text-[12.5px] text-ink-soft text-center mt-7">{t("landing.copyright")}</div>
        </Wrap>
      </footer>
    </div>
  );
}
