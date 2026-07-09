import { SiteHeader } from "@/components/site-header";
import { TradesTable } from "@/components/trades-table";
import { listTrades } from "@/lib/trades";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const trades = await listTrades();

  return (
    <>
      <SiteHeader title="Trades" />
      <div className="p-4 md:p-6">
        <TradesTable trades={trades} />
      </div>
    </>
  );
}
