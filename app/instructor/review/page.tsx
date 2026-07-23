import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";
import { Logo } from "@/shared/components/Logo";
import { getPendingReviewLessons } from "@/features/instructor/services/curriculum-contribution.service";
import { ReviewQueue } from "@/features/instructor/components/ReviewQueue";

export default async function InstructorReviewPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lang = "ar" as const;

  if (!user) redirect("/login?redirectedFrom=/instructor/review");

  const [{ data: capabilities }, { data: hasContentManage }] = await Promise.all([
    supabase.from("user_capabilities").select("capability").eq("user_id", user.id),
    supabase.rpc("has_permission", { perm: "content.manage" }),
  ]);
  const caps = (capabilities || []).map((c: any) => c.capability as string);
  const canPeerVote = caps.includes("instructor") || caps.includes("assessor");
  const canFinalize = !!hasContentManage;

  if (!canPeerVote && !canFinalize) {
    return (
      <main dir="rtl" className="min-h-screen flex flex-col items-center justify-center px-5 gap-4 text-center">
        <Logo className="h-8" />
        <p className="text-ink-soft">{t("instructor.reviewOnly", lang)}</p>
      </main>
    );
  }

  const lessons = await getPendingReviewLessons(supabase);

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
      <Logo className="h-8 mb-6" />
      <h1 className="font-display font-black text-2xl text-navy mb-2">{t("instructor.reviewQueueTitle", lang)}</h1>
      {canFinalize && <p className="text-sm text-ink-soft mb-6">{t("instructor.finalizerHint", lang)}</p>}
      <ReviewQueue initialLessons={lessons} canFinalize={canFinalize} canPeerVote={canPeerVote} />
    </main>
  );
}
