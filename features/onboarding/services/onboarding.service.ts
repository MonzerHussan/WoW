import { supabaseBrowser } from "@/shared/lib/supabase/client";
import { OnboardingCompleteInput } from "@/shared/schemas/onboarding.schema";
import { AccountType } from "@/shared/types";

/**
 * account_type is an onboarding HINT that seeds initial capabilities
 * (migration 003 note; RBAC.md Layer 2). It is never a permission source.
 * company/institute seed nothing here — their power comes from the
 * organization they create (org-creation flow is a later sprint).
 */
const CAPABILITY_SEED: Record<AccountType, string[]> = {
  student: ["learner"],
  job_seeker: ["job_seeker"],
  freelancer: ["freelancer", "client"],
  employee: ["learner"],
  instructor: ["instructor"],
  company: [],
  institute: [],
};

export async function completeOnboarding(
  accountType: AccountType,
  input: OnboardingCompleteInput
) {
  const supabase = supabaseBrowser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      account_type: accountType,
      onboarding_goal: input.goal,
      pmp_level_interest: input.pmpLevel,
      age: input.age,
      gender: input.gender,
      onboarding_completed: true,
    })
    .eq("id", user.id);
  if (profileError) return { error: profileError };

  const capabilities = CAPABILITY_SEED[accountType];
  if (capabilities.length > 0) {
    const { error: capError } = await supabase.from("user_capabilities").upsert(
      capabilities.map((capability) => ({ user_id: user.id, capability })),
      { onConflict: "user_id,capability", ignoreDuplicates: true }
    );
    if (capError) return { error: capError };
  }

  return { error: null };
}
