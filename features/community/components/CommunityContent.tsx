"use client";

import { useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { AppShell } from "@/shared/components/AppShell";
import { getAccountTypeLabel } from "@/shared/constants/account-types";
import {
  COMMUNITY_SHORTCUTS,
  COMMUNITY_POSTS,
  COMMUNITY_CONNECTIONS,
  COMMUNITY_TRENDING,
  COMMUNITY_GROUPS,
} from "@/features/community/constants";

/**
 * Phase-1 visual mockup ONLY (owner instruction, navigation-restructuring
 * batch item 7): a static page blending Facebook's feed/composer layout
 * with LinkedIn's network/connections sidebars. Every post, connection,
 * and group below is hardcoded content from constants.ts — nothing here
 * reads or writes Supabase, and the composer/Connect/Join buttons are
 * local-only visual toggles (same "never writes anywhere" pattern as
 * LandingPage.tsx's own FollowButton). Real community functionality is a
 * separate, later, explicitly-gated phase — do not wire this up without a
 * fresh product decision.
 */
function ToggleButton({ idleLabel, activeLabel }: { idleLabel: string; activeLabel: string }) {
  const [active, setActive] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setActive((v) => !v)}
      className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-bold font-display border-[1.5px] transition ${
        active ? "bg-navy border-navy text-white" : "border-line text-navy hover:border-navy/40"
      }`}
    >
      {active ? activeLabel : idleLabel}
    </button>
  );
}

function Avatar({ initial, size = 10 }: { initial: string; size?: number }) {
  return (
    <div
      style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem` }}
      className="flex-none rounded-full bg-[conic-gradient(from_180deg,#0B1E4D,#F2841C,#6D28D9)] text-white flex items-center justify-center font-display font-bold"
    >
      {initial}
    </div>
  );
}

export function CommunityContent({
  fullName,
  accountType,
  avatarUrl,
  walletBalance,
  agentChosenName,
  initialLang,
}: {
  fullName: string | null;
  accountType: string;
  avatarUrl: string | null;
  walletBalance: number;
  agentChosenName: string;
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);
  const acc = getAccountTypeLabel(accountType as any, lang);
  const displayName = fullName || "";

  return (
    <AppShell active="community" walletBalance={walletBalance} agentChosenName={agentChosenName} lang={lang} dir={dir} onLangChange={setLang}>
      <main className="min-h-screen px-5 py-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display font-black text-2xl text-navy">{t("community.title")}</h1>
          <p className="text-ink-soft text-sm mt-1">{t("community.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-5 items-start">
          {/* Left sidebar: mini profile card + shortcuts (LinkedIn-style) */}
          <div className="flex flex-col gap-4 order-2 lg:order-1">
            <div className="bg-white border border-line rounded-wow p-5 text-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover mx-auto mb-3" />
              ) : (
                <div className="mx-auto mb-3">
                  <Avatar initial={displayName.charAt(0) || "؟"} size={16} />
                </div>
              )}
              <div className="font-bold text-navy text-sm truncate">{displayName}</div>
              <div className="text-xs text-ink-soft mt-0.5 flex items-center justify-center gap-1">
                <span>{acc.icon}</span>
                <span>{acc.label}</span>
              </div>
            </div>

            <div className="bg-white border border-line rounded-wow p-4">
              <div className="font-display font-bold text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-3">
                {t("community.shortcutsTitle")}
              </div>
              <div className="flex flex-col gap-1">
                {COMMUNITY_SHORTCUTS.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center gap-2.5 text-sm font-semibold text-ink px-2 py-2 rounded-lg hover:bg-bg transition cursor-default"
                  >
                    <span>{s.icon}</span>
                    <span>{t(s.labelKey)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center: composer + feed (Facebook-style) */}
          <div className="flex flex-col gap-5 order-1 lg:order-2">
            <div className="bg-white border border-line rounded-wow p-4">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-none" />
                ) : (
                  <Avatar initial={displayName.charAt(0) || "؟"} />
                )}
                <input
                  type="text"
                  disabled
                  placeholder={t("community.composerPlaceholder")}
                  className="flex-1 rounded-full border border-line bg-bg px-4 py-2.5 text-sm text-ink-soft cursor-default"
                />
                <button
                  type="button"
                  disabled
                  className="flex-none rounded-full bg-navy/40 text-white px-4 py-2.5 text-sm font-bold cursor-default"
                >
                  {t("community.composerPostBtn")}
                </button>
              </div>
            </div>

            {COMMUNITY_POSTS.map((post) => (
              <div key={post.id} className="bg-white border border-line rounded-wow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar initial={t(post.authorKey).trim().charAt(0)} />
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
                <p className="text-[13.5px] text-ink leading-relaxed">{t(post.bodyKey)}</p>
                <div className="flex gap-5 text-ink-soft text-[13px] mt-4 pt-4 border-t border-line">
                  <span>❤️ {post.likes.toLocaleString("en-US")}</span>
                  <span>💬 {post.comments.toLocaleString("en-US")}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right sidebar: connections + trending + groups (LinkedIn-style) */}
          <div className="flex flex-col gap-4 order-3">
            <div className="bg-white border border-line rounded-wow p-5">
              <div className="font-display font-bold text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-3">
                {t("community.connectionsTitle")}
              </div>
              <div className="flex flex-col gap-3">
                {COMMUNITY_CONNECTIONS.map((c) => (
                  <div key={c.id} className="flex items-center gap-2.5">
                    <Avatar initial={t(c.nameKey).trim().charAt(0)} size={8} />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-navy text-[12px] truncate">{t(c.nameKey)}</div>
                      <div className="text-[10.5px] text-ink-soft truncate">{t(c.fieldKey)}</div>
                    </div>
                    <ToggleButton idleLabel={t("community.connectCta")} activeLabel={t("community.connectedCta")} />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-line rounded-wow p-5">
              <div className="font-display font-bold text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-3">
                {t("community.trendingTitle")}
              </div>
              <ol className="flex flex-col gap-2.5">
                {COMMUNITY_TRENDING.map((key, i) => (
                  <li key={key} className="flex gap-2.5 items-baseline">
                    <span className="font-display font-black text-orange text-[11.5px] flex-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[12px] font-semibold text-navy leading-snug">{t(key)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-white border border-line rounded-wow p-5">
              <div className="font-display font-bold text-[10.5px] uppercase tracking-[1px] text-ink-soft mb-3">
                {t("community.groupsTitle")}
              </div>
              <div className="flex flex-col gap-3">
                {COMMUNITY_GROUPS.map((g) => (
                  <div key={g.id} className="flex items-center gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-navy text-[12px] truncate">{t(g.nameKey)}</div>
                      <div className="text-[10.5px] text-ink-soft truncate">
                        {g.members.toLocaleString("en-US")} {t("community.groupsMembersLabel")}
                      </div>
                    </div>
                    <ToggleButton idleLabel={t("community.groupsJoinCta")} activeLabel={t("community.groupsJoinedCta")} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
