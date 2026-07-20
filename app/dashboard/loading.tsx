import { Loading } from "@/shared/components/Feedback";

export default function DashboardLoading() {
  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center">
      <Loading label="جارِ تحميل لوحة التحكم..." />
    </main>
  );
}
