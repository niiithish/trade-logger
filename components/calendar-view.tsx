"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  dateToDayKey,
  dayKeyToDate,
  formatDate,
  formatPnl,
} from "@/lib/format";
import type { DaySummary, Trade } from "@/lib/types";

function pnlTextClass(pnl: number): string | undefined {
  if (pnl > 0) {
    return "text-emerald-400";
  }
  if (pnl < 0) {
    return "text-destructive";
  }
}

export function CalendarView({
  daySummaries,
  tradesByDay,
}: {
  daySummaries: DaySummary[];
  tradesByDay: Record<string, Trade[]>;
}) {
  const summaryMap = useMemo(() => {
    const map = new Map<string, DaySummary>();
    for (const day of daySummaries) {
      map.set(day.dayKey, day);
    }
    return map;
  }, [daySummaries]);

  const winDays = useMemo(
    () =>
      daySummaries
        .filter((d) => d.totalPnl > 0)
        .map((d) => dayKeyToDate(d.dayKey)),
    [daySummaries]
  );
  const lossDays = useMemo(
    () =>
      daySummaries
        .filter((d) => d.totalPnl < 0)
        .map((d) => dayKeyToDate(d.dayKey)),
    [daySummaries]
  );
  const flatDays = useMemo(
    () =>
      daySummaries
        .filter((d) => d.totalPnl === 0)
        .map((d) => dayKeyToDate(d.dayKey)),
    [daySummaries]
  );

  const latestKey = daySummaries[0]?.dayKey;
  const [selected, setSelected] = useState<Date | undefined>(
    latestKey ? dayKeyToDate(latestKey) : new Date()
  );

  const selectedKey = selected ? dateToDayKey(selected) : null;
  const selectedSummary = selectedKey ? summaryMap.get(selectedKey) : null;
  const selectedTrades = selectedKey ? (tradesByDay[selectedKey] ?? []) : [];

  return (
    <div className="grid items-start gap-4 p-4 md:grid-cols-[auto_1fr] md:p-6">
      <Card className="w-fit">
        <CardHeader>
          <CardTitle>Trading calendar</CardTitle>
          <CardDescription>
            Green days = net green. Red days = net red.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            className="rounded-lg border"
            mode="single"
            modifiers={{
              flat: flatDays,
              loss: lossDays,
              win: winDays,
            }}
            modifiersClassNames={{
              flat: "bg-muted font-medium",
              loss: "bg-destructive/20 text-red-300 font-medium",
              win: "bg-emerald-500/20 text-emerald-300 font-medium",
            }}
            onSelect={setSelected}
            selected={selected}
          />
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge className="bg-emerald-500/10" variant="outline">
              Net win
            </Badge>
            <Badge className="bg-destructive/10" variant="outline">
              Net loss
            </Badge>
            <Badge variant="outline">Flat / no P&L</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            {selected ? format(selected, "EEEE, MMM d, yyyy") : "Select a day"}
          </CardTitle>
          <CardDescription>
            {selectedSummary
              ? `${selectedSummary.tradeCount} trade${selectedSummary.tradeCount === 1 ? "" : "s"} · ${formatPnl(selectedSummary.totalPnl)} · avg anxiety ${selectedSummary.avgAnxiety.toFixed(1)}`
              : "No trades on this day."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedTrades.length === 0 ? (
            <Empty className="border-dashed py-10">
              <EmptyHeader>
                <EmptyTitle>No trades</EmptyTitle>
                <EmptyDescription>
                  Pick a highlighted day, or log a new trade.
                </EmptyDescription>
              </EmptyHeader>
              <Button render={<Link href="/log" />}>Log trade</Button>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>Anxiety</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-mono">{trade.ticker}</TableCell>
                    <TableCell className={pnlTextClass(trade.pnl)}>
                      {formatPnl(trade.pnl)}
                    </TableCell>
                    <TableCell>{trade.anxietyLevel}/10</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(trade.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        render={<Link href={`/trades/${trade.id}`} />}
                        size="sm"
                        variant="outline"
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
