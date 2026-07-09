import { PlusCircleIcon } from "lucide-react";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { TradeStatsCards } from "@/components/trade-stats";
import { TradesTable } from "@/components/trades-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTradeStats, listTrades } from "@/lib/trades";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [trades, stats] = await Promise.all([listTrades(), getTradeStats()]);
  const recent = trades.slice(0, 8);

  return (
    <>
      <SiteHeader
        actions={
          <Button render={<Link href="/log" />} size="sm">
            <PlusCircleIcon data-icon="inline-start" />
            Log trade
          </Button>
        }
        description="Overview of your futures prop journal"
        title="Dashboard"
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <TradeStatsCards stats={stats} />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
              <CardDescription>Jump into your journal workflow</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                className="justify-start"
                render={<Link href="/log" />}
                variant="outline"
              >
                Log a new trade
              </Button>
              <Button
                className="justify-start"
                render={<Link href="/trades" />}
                variant="outline"
              >
                Browse all trades
              </Button>
              <Button
                className="justify-start"
                render={<Link href="/calendar" />}
                variant="outline"
              >
                Open calendar
              </Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <TradesTable
              description="Latest entries — open Trades for the full history"
              title="Recent trades"
              trades={recent}
            />
          </div>
        </div>
      </div>
    </>
  );
}
