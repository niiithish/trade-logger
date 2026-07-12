import { DashboardOverview } from "@/components/dashboard-overview";
import { SiteHeader } from "@/components/site-header";
import { listTrades } from "@/lib/trades";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const trades = await listTrades();

  return (
    <>
      <SiteHeader title="Dashboard" />
      <DashboardOverview trades={trades} />
    </>
  );
}
