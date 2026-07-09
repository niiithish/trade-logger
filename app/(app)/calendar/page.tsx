import { CalendarView } from "@/components/calendar-view";
import { SiteHeader } from "@/components/site-header";
import { toDayKey } from "@/lib/format";
import { getDaySummaries, listTrades } from "@/lib/trades";
import type { Trade } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [daySummaries, trades] = await Promise.all([
    getDaySummaries(),
    listTrades(),
  ]);

  const tradesByDay: Record<string, Trade[]> = {};
  for (const trade of trades) {
    const key = toDayKey(trade.createdAt);
    if (!tradesByDay[key]) {
      tradesByDay[key] = [];
    }
    tradesByDay[key].push(trade);
  }

  return (
    <>
      <SiteHeader
        description="Review trading days by P&L and anxiety"
        title="Calendar"
      />
      <CalendarView daySummaries={daySummaries} tradesByDay={tradesByDay} />
    </>
  );
}
