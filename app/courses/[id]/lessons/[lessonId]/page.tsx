import Link from "next/link";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";
import { getLessonDetail } from "@/features/lms/services/lesson.service";
import { LessonView } from "@/features/lms/components/LessonView";
import { getPlacementState } from "@/features/agent/services/agent.service";
import { PlacementChat } from "@/features/agent/components/PlacementChat";

export default async function LessonPage({ params }: { params: { id: string; lessonId: string } }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lang = "ar" as const;

  const lesson = await getLessonDetail(supabase, params.lessonId, user?.id ?? null);
  if (!lesson) {
    return (
      <main dir="rtl" className="min-h-screen px-5 py-10 max-w-3xl mx-auto text-center">
        <p className="text-ink-soft">{t("lms.lessonLocked", lang)}</p>
        <Link href={`/courses/${params.id}`} className="text-navy font-bold mt-4 inline-block">
          ← {t("lms.backToCatalog", lang)}
        </Link>
      </main>
    );
  }

  const content = lesson.content as { module_closing?: { optional_language_task?: string } };

  let walletBalance = 0;
  let languageTaskSubmitted = false;
  if (user && content.module_closing?.optional_language_task) {
    const [{ data: wallet }, { data: submission }] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("language_task_submissions")
        .select("id")
        .eq("user_id", user.id)
        .eq("lesson_id", lesson.id)
        .maybeSingle(),
    ]);
    walletBalance = wallet?.balance ?? 0;
    languageTaskSubmitted = !!submission;
  }

  // Cross-feature composition at the page level (features/agent inside
  // features/lms's view) — same slot pattern as the dashboard's
  // assistantSlot, keeping the two features decoupled.
  const placement = user ? await getPlacementState(supabase, user.id) : null;

  return (
    <LessonView
      lesson={lesson}
      hasUser={!!user}
      walletBalance={walletBalance}
      languageTaskSubmitted={languageTaskSubmitted}
      placementSlot={
        placement ? (
          <PlacementChat initialPlaced={placement.placed} initialLevel={placement.englishLevel} lang="ar" />
        ) : undefined
      }
    />
  );
}
