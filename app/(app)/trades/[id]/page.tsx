import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { TradeDetail } from "@/components/trade-detail";
import { getTrade } from "@/lib/trades";

export const dynamic = "force-dynamic";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trade = await getTrade(id);

  if (!trade) {
    notFound();
  }

  return (
    <>
      <SiteHeader title={`${trade.ticker} trade`} />
      <TradeDetail trade={trade} />
    </>
  );
}
