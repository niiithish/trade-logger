"use client";

import { addMonths, format, isToday as isDateToday, subMonths } from "date-fns";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAccountFilter } from "@/components/account-filter";
import { LogTradeButton } from "@/components/log-trade-dialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  buildMonthGrid,
  computeDayStats,
  type DayStats,
  filterTradesByAccount,
} from "@/lib/analytics";
import { formatPnl, pnlTextClass } from "@/lib/format";
import type { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function formatMoney(value: number) {
  const abs = Math.abs(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  });
  return `$${abs}`;
}

function dayResultTone(pnl: number): "win" | "loss" | "flat" {
  if (pnl > 0) {
    return "win";
  }
  if (pnl < 0) {
    return "loss";
  }
  return "flat";
}

export function TradingCalendar({ trades }: { trades: Trade[] }) {
  const { account } = useAccountFilter();
  const [month, setMonth] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const scopedTrades = useMemo(
    () => filterTradesByAccount(trades, account),
    [trades, account]
  );

  const dayStats = useMemo(() => computeDayStats(scopedTrades), [scopedTrades]);
  const { monthLabel, weeks, weekSummaries } = useMemo(
    () => buildMonthGrid(month, dayStats),
    [month, dayStats]
  );

  const selectedTrades = useMemo(() => {
    if (!selectedKey) {
      return [];
    }
    return scopedTrades
      .filter((t) => {
        const d = new Date(t.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return key === selectedKey;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [scopedTrades, selectedKey]);

  const monthHasTrades = useMemo(
    () =>
      weeks.some((week) =>
        week.some((day) => day.inMonth && day.stats && day.stats.tradeCount > 0)
      ),
    [weeks]
  );

  const hasAnyScoped = scopedTrades.length > 0;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            aria-label="Previous month"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            size="icon-sm"
            variant="outline"
          >
            <ChevronLeftIcon />
          </Button>
          <div className="min-w-0 flex-1 text-center font-medium text-sm tracking-tight sm:min-w-32">
            {monthLabel}
          </div>
          <Button
            aria-label="Next month"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            size="icon-sm"
            variant="outline"
          >
            <ChevronRightIcon />
          </Button>
          <Button
            onClick={() => setMonth(new Date())}
            size="sm"
            variant="secondary"
          >
            Today
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Select a trading day to inspect its trades
        </p>
      </div>

      {trades.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-8 ring-1 ring-border">
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDaysIcon />
              </EmptyMedia>
              <EmptyTitle>No trading days yet</EmptyTitle>
              <EmptyDescription>
                Once you log trades, this grid shows daily P&amp;L, trade count,
                and win rate — green for winners, red for losers.
              </EmptyDescription>
            </EmptyHeader>
            <LogTradeButton>
              <PlusCircleIcon data-icon="inline-start" />
              Log first trade
            </LogTradeButton>
          </Empty>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
        <div className="grid grid-cols-7 border-border border-b lg:grid-cols-[repeat(7,minmax(0,1fr))_7.5rem]">
          {WEEKDAYS.map((d) => (
            <div
              className="px-1.5 py-2.5 text-center font-medium text-muted-foreground text-xs tracking-wider sm:px-2"
              key={d}
            >
              {d}
            </div>
          ))}
          <div className="hidden border-border border-l px-2 py-3 text-center font-medium text-muted-foreground text-xs tracking-wider lg:block">
            WEEKLY
          </div>
        </div>

        {weeks.map((week, wi) => (
          <div
            className="grid grid-cols-7 border-border border-b last:border-b-0 lg:grid-cols-[repeat(7,minmax(0,1fr))_7.5rem]"
            key={weekSummaries[wi].label}
          >
            {week.map((day) => (
              <DayCell
                dayNumber={day.dayNumber}
                inMonth={day.inMonth}
                isTodayDate={isDateToday(day.date)}
                key={day.dayKey}
                onClick={() => {
                  if (day.stats) {
                    setSelectedKey(day.dayKey);
                  } else {
                    setSelectedKey(null);
                  }
                }}
                selected={selectedKey === day.dayKey}
                stats={day.stats}
              />
            ))}
            <WeekCell summary={weekSummaries[wi]} />
          </div>
        ))}
      </div>

      {hasAnyScoped && !monthHasTrades ? (
        <p className="text-center text-muted-foreground text-sm">
          No trades in {monthLabel}
          {account === "all" ? "" : " for this account"}. Navigate months or{" "}
          <LogTradeButton
            className="h-auto px-0 text-foreground"
            variant="link"
          >
            log a trade
          </LogTradeButton>
          .
        </p>
      ) : null}

      {selectedKey && selectedTrades.length > 0 ? (
        <div className="rounded-xl bg-card p-4 ring-1 ring-border">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="font-medium text-sm tracking-tight">
                {format(
                  new Date(`${selectedKey}T12:00:00`),
                  "EEEE, MMM d, yyyy"
                )}
              </p>
              <p className="text-muted-foreground text-xs">
                {selectedTrades.length} trade
                {selectedTrades.length === 1 ? "" : "s"} ·{" "}
                {formatPnl(selectedTrades.reduce((s, t) => s + t.pnl, 0))}
              </p>
            </div>
            <Button
              onClick={() => setSelectedKey(null)}
              size="sm"
              variant="ghost"
            >
              Close
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {selectedTrades.map((trade) => (
              <Link
                className="flex items-center gap-3 rounded-lg border border-border p-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={`/trades/${trade.id}`}
                key={trade.id}
              >
                {/* Data-URL charts — next/image is not suitable here */}
                {/* biome-ignore lint/performance/noImgElement: base64 chart data URLs */}
                <img
                  alt={`${trade.ticker} chart thumbnail`}
                  className="size-12 rounded-md object-cover ring-1 ring-border"
                  height={48}
                  src={trade.chartImage}
                  width={48}
                />
                <div className="min-w-0">
                  <p className="font-medium font-mono text-sm">
                    {trade.ticker}
                  </p>
                  <p
                    className={cn(
                      "font-medium text-sm tabular-nums",
                      pnlTextClass(trade.pnl)
                    )}
                  >
                    {formatPnl(trade.pnl)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DayCell({
  dayNumber,
  inMonth,
  stats,
  selected,
  isTodayDate,
  onClick,
}: {
  dayNumber: number;
  inMonth: boolean;
  stats: DayStats | null;
  selected: boolean;
  isTodayDate: boolean;
  onClick: () => void;
}) {
  const hasTrades = Boolean(stats && stats.tradeCount > 0);
  const tone = dayResultTone(stats?.totalPnl ?? 0);

  return (
    <button
      className={cn(
        "relative flex min-h-20 flex-col items-stretch gap-1 border-border border-r p-1.5 text-left transition-colors last:border-r-0 sm:min-h-28 sm:p-2",
        !inMonth &&
          "bg-[repeating-linear-gradient(-45deg,transparent,transparent_4px,#292929_4px,#292929_8px)] text-muted-foreground/40",
        inMonth && !hasTrades && "bg-background/40 hover:bg-muted/20",
        inMonth &&
          hasTrades &&
          tone === "win" &&
          "bg-emerald-500/15 hover:bg-emerald-500/20",
        inMonth &&
          hasTrades &&
          tone === "loss" &&
          "bg-red-500/15 hover:bg-red-500/20",
        inMonth &&
          hasTrades &&
          tone === "flat" &&
          "bg-muted/40 hover:bg-muted/50",
        selected && "z-10 ring-2 ring-primary ring-inset",
        isTodayDate && inMonth && !hasTrades && "bg-muted/20"
      )}
      disabled={!inMonth}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "inline-flex size-5 items-center justify-center rounded-full text-xs sm:size-6",
            isTodayDate && "bg-primary font-medium text-primary-foreground",
            !(isTodayDate || hasTrades) && "text-muted-foreground",
            !isTodayDate && hasTrades && tone === "win" && "text-emerald-300",
            !isTodayDate && hasTrades && tone === "loss" && "text-red-300",
            !isTodayDate &&
              hasTrades &&
              tone === "flat" &&
              "text-muted-foreground"
          )}
        >
          {dayNumber}
        </span>
      </div>

      {inMonth && hasTrades && stats ? (
        <DayTradeSummary stats={stats} tone={tone} />
      ) : null}
    </button>
  );
}

function DayTradeSummary({
  stats,
  tone,
}: {
  stats: DayStats;
  tone: "win" | "loss" | "flat";
}) {
  return (
    <div className="mt-auto flex flex-1 flex-col justify-center px-0.5 py-1 sm:px-1">
      <p
        className={cn(
          "truncate text-center font-medium text-xs tabular-nums tracking-tight sm:text-sm",
          tone === "win" && "text-emerald-300",
          tone === "loss" && "text-red-300",
          tone === "flat" && "text-muted-foreground"
        )}
      >
        {tone === "loss" ? "-" : ""}
        {formatMoney(stats.totalPnl)}
      </p>
      <p
        className={cn(
          "mt-0.5 text-center text-xs",
          tone === "win" && "text-emerald-400/80",
          tone === "loss" && "text-red-400/80",
          tone === "flat" && "text-muted-foreground"
        )}
      >
        {stats.tradeCount} trade{stats.tradeCount === 1 ? "" : "s"}
      </p>
      <p
        className={cn(
          "hidden text-center text-xs sm:block",
          tone === "win" && "text-emerald-400/70",
          tone === "loss" && "text-red-400/70",
          tone === "flat" && "text-muted-foreground"
        )}
      >
        {stats.winRate.toFixed(0)}% win rate
      </p>
    </div>
  );
}

function WeekCell({
  summary,
}: {
  summary: { label: string; totalPnl: number; tradingDays: number };
}) {
  const tone = dayResultTone(summary.totalPnl);

  return (
    <div className="hidden min-h-28 flex-col justify-center border-border border-l px-3 py-2 lg:flex">
      <p className="text-muted-foreground text-xs">{summary.label}</p>
      <p
        className={cn(
          "mt-1 font-medium text-sm tabular-nums",
          tone === "win" && "text-emerald-400",
          tone === "loss" && "text-red-400",
          tone === "flat" && "text-muted-foreground"
        )}
      >
        {tone === "loss" ? "-" : ""}
        {formatMoney(summary.totalPnl)}
      </p>
      <p className="mt-0.5 text-muted-foreground text-xs">
        {summary.tradingDays} day{summary.tradingDays === 1 ? "" : "s"}
      </p>
    </div>
  );
}
