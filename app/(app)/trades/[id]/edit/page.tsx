import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { TradeForm } from "@/components/trade-form";
import { getTrade } from "@/lib/trades";

export const dynamic = "force-dynamic";

export default async function EditTradePage({
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
      <SiteHeader title="Edit trade" />
      <div className="mx-auto w-full max-w-xl p-4 md:p-6">
        <div className="overflow-hidden rounded-xl border border-border bg-card ring-1 ring-border">
          <TradeForm initialTrade={trade} mode="edit" />
        </div>
      </div>
    </>
  );
}
