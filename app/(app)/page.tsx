import { DashboardOverview } from "@/components/dashboard-overview";
import { SiteHeader } from "@/components/site-header";
import { computeDashboardMetrics } from "@/lib/analytics";
import { listTrades } from "@/lib/trades";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const trades = await listTrades();
  const metrics = computeDashboardMetrics(trades);

  return (
    <>
      <SiteHeader title="Dashboard" />
      <DashboardOverview metrics={metrics} />
    </>
  );
}
