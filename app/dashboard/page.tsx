import { DashboardView } from "@/features/dashboard/components/DashboardView";
import NovaChat from "@/features/nova/components/NovaChat";

export default async function DashboardPage() {
  // Cross-feature composition happens here at the page level,
  // keeping features/dashboard and features/nova decoupled.
  return <DashboardView assistantSlot={<NovaChat lang="ar" />} />;
}
