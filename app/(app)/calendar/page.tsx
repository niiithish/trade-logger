import { SiteHeader } from "@/components/site-header";
import { TradingCalendar } from "@/components/trading-calendar";
import { listTrades } from "@/lib/trades";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const trades = await listTrades();

  return (
    <>
      <SiteHeader title="Calendar" />
      <TradingCalendar trades={trades} />
    </>
  );
}
