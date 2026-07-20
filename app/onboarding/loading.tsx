import { Loading } from "@/shared/components/Feedback";

export default function OnboardingLoading() {
  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center">
      <Loading label="لحظة واحدة..." />
    </main>
  );
}
