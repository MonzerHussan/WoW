import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { t } from "@/shared/i18n/translations";
import { Logo } from "@/shared/components/Logo";
import { getPendingAttempts } from "@/features/lms/services/quiz.service";
import { AssessorQueue } from "@/features/lms/components/AssessorQueue";

export default async function AssessorQueuePage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lang = "ar" as const;

  if (!user) redirect("/login?redirectedFrom=/assessor/queue");

  const { data: capability } = await supabase
    .from("user_capabilities")
    .select("capability")
    .eq("user_id", user.id)
    .eq("capability", "assessor")
    .maybeSingle();

  if (!capability) {
    return (
      <main dir="rtl" className="min-h-screen flex flex-col items-center justify-center px-5 gap-4 text-center">
        <Logo className="h-8" />
        <p className="text-ink-soft">{t("lms.assessorOnly", lang)}</p>
      </main>
    );
  }

  const attempts = await getPendingAttempts(supabase);

  return (
    <main dir="rtl" className="min-h-screen px-5 py-10 max-w-3xl mx-auto">
      <Logo className="h-8 mb-6" />
      <h1 className="font-display font-black text-2xl text-navy mb-6">{t("lms.assessorQueueTitle", lang)}</h1>
      <AssessorQueue initialAttempts={attempts} />
    </main>
  );
}
