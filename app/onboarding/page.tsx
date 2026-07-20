import { Suspense } from "react";
import { OnboardingWizard } from "@/features/onboarding/components/OnboardingWizard";

export default function OnboardingPage() {
  // useSearchParams() inside OnboardingWizard requires a Suspense boundary
  // per Next.js App Router rules.
  return (
    <Suspense>
      <OnboardingWizard />
    </Suspense>
  );
}
