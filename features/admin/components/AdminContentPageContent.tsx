"use client";

import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/shared/hooks/useLang";
import { Lang } from "@/shared/types";
import { LangToggle } from "@/shared/components/LangToggle";
import { Logo } from "@/shared/components/Logo";
import { supabaseBrowser } from "@/shared/lib/supabase/client";
import {
  ContentDraftRow,
  KbScenarioRow,
  KbScoringRuleRow,
  BadgeRow,
  listContentDrafts,
  listKbScenarios,
  listKbScoringRules,
  listBadges,
} from "@/shared/services/content-draft.service";
import { AdminCourseRow } from "@/shared/services/lesson-content.service";
import { KbScenarioEditor } from "@/features/admin/components/KbScenarioEditor";
import { KbScoringRuleEditor } from "@/features/admin/components/KbScoringRuleEditor";
import { BadgeEditor } from "@/features/admin/components/BadgeEditor";
import { LessonContentEditor } from "@/features/admin/components/LessonContentEditor";

/**
 * One shared component behind both /admin/content/pmp and
 * /admin/content/english — per the owner's decision, the split between
 * the two routes is organizational only, not a separate data domain or
 * permission (see 062's header for why: content.manage is the single
 * role for both, English content has no separate table at all).
 */
export function AdminContentPageContent({
  scope,
  courses,
  ruleScopes,
  initialLang,
}: {
  scope: "pmp" | "english";
  courses: AdminCourseRow[];
  ruleScopes: string[];
  initialLang: Lang;
}) {
  const { lang, setLang, dir, t } = useLang(initialLang);
  const supabase = supabaseBrowser();

  const [scenarios, setScenarios] = useState<KbScenarioRow[]>([]);
  const [scoringRules, setScoringRules] = useState<KbScoringRuleRow[]>([]);
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [drafts, setDrafts] = useState<ContentDraftRow[]>([]);

  const refresh = useCallback(async () => {
    if (scope !== "pmp") return;
    const [s, r, b, d] = await Promise.all([
      listKbScenarios(supabase),
      listKbScoringRules(supabase),
      listBadges(supabase),
      listContentDrafts(supabase),
    ]);
    setScenarios(s);
    setScoringRules(r);
    setBadges(b);
    setDrafts(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <Logo className="h-8" />
        <LangToggle lang={lang} onChange={setLang} />
      </div>
      <h1 className="font-display font-black text-2xl text-navy mb-2">
        {scope === "pmp" ? t("admin.contentPmpTitle") : t("admin.contentEnglishTitle")}
      </h1>
      <p className="text-sm text-ink-soft mb-8 leading-relaxed">
        {scope === "pmp" ? t("admin.contentPmpIntro") : t("admin.contentEnglishIntro")}
      </p>

      <div className="flex flex-col gap-6">
        <LessonContentEditor scope={scope} courses={courses} lang={lang} />

        {scope === "pmp" && (
          <>
            <KbScenarioEditor scenarios={scenarios} ruleScopes={ruleScopes} drafts={drafts} lang={lang} onChanged={refresh} />
            <KbScoringRuleEditor rules={scoringRules} drafts={drafts} lang={lang} onChanged={refresh} />
            <BadgeEditor badges={badges} drafts={drafts} lang={lang} onChanged={refresh} />
          </>
        )}
      </div>
    </div>
  );
}
