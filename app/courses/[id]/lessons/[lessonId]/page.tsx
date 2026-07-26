import Link from "next/link";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";
import { getLessonDetail, resolveLanguageTask } from "@/features/lms/services/lesson.service";
import { LessonView } from "@/features/lms/components/LessonView";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

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

  // Only decides whether the wallet/submission lookups are worth doing —
  // the same resolver the view and the API route use, so a lesson can't
  // render a task the page didn't prefetch state for.
  const hasLanguageTask = !!resolveLanguageTask(lesson.content);

  let walletBalance = 0;
  let languageTaskSubmitted = false;
  if (user && hasLanguageTask) {
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

  // A lesson can be opened by a signed-out visitor (free preview), so
  // the agent state is fetched only when there is actually a user.
  const agentState = user ? await getAgentInitialState(supabase, user.id) : null;

  return (
    <>
      <LessonView
        lesson={lesson}
        hasUser={!!user}
        walletBalance={walletBalance}
        languageTaskSubmitted={languageTaskSubmitted}
      />
      {/* `lessonId` is what makes this agent lesson-aware: the route
          re-fetches the real content under RLS on every message. Only
          the id crosses the wire. */}
      {user && agentState && (
        <FloatingAgent
          userId={user.id}
          initialChosenName={agentState.chosenName}
          initialNeedsNaming={agentState.needsNaming}
          lessonId={lesson.id}
        />
      )}
    </>
  );
}
