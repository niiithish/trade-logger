import { PlusCircleIcon } from "lucide-react";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { TradesTable } from "@/components/trades-table";
import { Button } from "@/components/ui/button";
import { listTrades } from "@/lib/trades";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const trades = await listTrades();

  return (
    <>
      <SiteHeader
        actions={
          <Button render={<Link href="/log" />} size="sm">
            <PlusCircleIcon data-icon="inline-start" />
            Log trade
          </Button>
        }
        description="Look back through every logged trade"
        title="Trades"
      />
      <div className="p-4 md:p-6">
        <TradesTable trades={trades} />
      </div>
    </>
  );
}
