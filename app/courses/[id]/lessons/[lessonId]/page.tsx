import Link from "next/link";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { t } from "@/shared/i18n/translations";
import { getLessonDetail, resolveLanguageTask } from "@/features/lms/services/lesson.service";
import { getPricingUnit, PRICING_KEYS } from "@/shared/services/pricing.service";
import { LessonView } from "@/features/lms/components/LessonView";
import { getAgentInitialState } from "@/features/agent/services/agent.service";
import { FloatingAgent } from "@/features/agent/components/FloatingAgent";

export default async function LessonPage({ params }: { params: { id: string; lessonId: string } }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialLang = getServerLang();

  const lesson = await getLessonDetail(supabase, params.lessonId, user?.id ?? null);
  if (!lesson) {
    return (
      <main
        dir={initialLang === "ar" ? "rtl" : "ltr"}
        className="min-h-screen px-5 py-10 max-w-3xl mx-auto text-center"
      >
        <p className="text-ink-soft">{t("lms.lessonLocked", initialLang)}</p>
        <Link href={`/courses/${params.id}`} className="text-navy font-bold mt-4 inline-block">
          ← {t("lms.backToCatalog", initialLang)}
        </Link>
      </main>
    );
  }

  // The same resolver the view and the API route use, so a lesson can't
  // render a task the page didn't prefetch state for. It now yields the
  // task's type/pricing key rather than a price — since 024 the number
  // comes from pricing_units, fetched here server-side so the client
  // never has to know how a price is decided.
  const languageTask = resolveLanguageTask(lesson.content);

  const [languageTaskCost, pronunciationCost] = await Promise.all([
    languageTask ? getPricingUnit(supabase, languageTask.pricingKey) : Promise.resolve(null),
    getPricingUnit(supabase, PRICING_KEYS.pronunciation),
  ]);

  let walletBalance = 0;
  let languageTaskSubmitted = false;
  if (user && languageTask) {
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
        languageTaskCost={languageTaskCost}
        pronunciationCost={pronunciationCost}
        initialLang={initialLang}
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
