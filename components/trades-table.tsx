"use client";

import {
  BookOpenIcon,
  EyeIcon,
  HeartPulseIcon,
  PencilIcon,
  PlusCircleIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { deleteTradeAction } from "@/app/actions/trades";
import { useAccountFilter } from "@/components/account-filter";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LogTradeButton } from "@/components/log-trade-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { accountLabel } from "@/lib/accounts";
import { filterTrades } from "@/lib/analytics";
import { beginDeleteTrade } from "@/lib/confirm-flow";
import { formatConfluenceScore } from "@/lib/confluence";
import {
  anxietyLabel,
  formatDate,
  formatPnl,
  pnlTextClass,
  toDayKey,
} from "@/lib/format";
import {
  directionLabel,
  EXIT_OUTCOME_OPTIONS,
  exitOutcomeLabel,
} from "@/lib/trade-management";
import type { DateRangePreset, Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TradesTable({
  trades,
  title = "All trades",
  description,
}: {
  trades: Trade[];
  title?: string;
  description?: string;
}) {
  const { account } = useAccountFilter();
  const [direction, setDirection] = useState<"all" | "long" | "short">("all");
  const [ticker, setTicker] = useState<"all" | "MNQ" | "MES">("all");
  const [exitOutcome, setExitOutcome] = useState<string>("all");
  const [range, setRange] = useState<DateRangePreset>("all");
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = filterTrades(trades, {
      account,
      dateRange: range,
      direction,
      exitOutcome,
      ticker,
    });
    if (fromDay) {
      list = list.filter((t) => toDayKey(t.createdAt) >= fromDay);
    }
    if (toDay) {
      list = list.filter((t) => toDayKey(t.createdAt) <= toDay);
    }
    return list;
  }, [trades, account, direction, ticker, exitOutcome, range, fromDay, toDay]);

  const activeFilterCount = [
    direction !== "all",
    ticker !== "all",
    exitOutcome !== "all",
    range !== "all",
    Boolean(fromDay),
    Boolean(toDay),
  ].filter(Boolean).length;

  if (trades.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-14">
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpenIcon />
              </EmptyMedia>
              <EmptyTitle>No trades yet</EmptyTitle>
              <EmptyDescription>
                Log your first MNQ or MES trade with account, direction, and
                exit management to start the journal.
              </EmptyDescription>
            </EmptyHeader>
            <LogTradeButton>
              <PlusCircleIcon data-icon="inline-start" />
              Log first trade
            </LogTradeButton>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-border/60 border-b pb-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">
              {description ??
                `${filtered.length} of ${trades.length} trade${trades.length === 1 ? "" : "s"} · newest first`}
            </CardDescription>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              onValueChange={(v) => {
                if (v === "all" || v === "long" || v === "short") {
                  setDirection(v);
                }
              }}
              value={direction}
            >
              <SelectTrigger className="h-8 w-[7rem]" size="sm">
                <SelectValue placeholder="Side" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sides</SelectItem>
                <SelectItem value="long">Long</SelectItem>
                <SelectItem value="short">Short</SelectItem>
              </SelectContent>
            </Select>

            <Select
              onValueChange={(v) => {
                if (v === "all" || v === "MNQ" || v === "MES") {
                  setTicker(v);
                }
              }}
              value={ticker}
            >
              <SelectTrigger className="h-8 w-[6.5rem]" size="sm">
                <SelectValue placeholder="Ticker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="MNQ">MNQ</SelectItem>
                <SelectItem value="MES">MES</SelectItem>
              </SelectContent>
            </Select>

            <Select
              onValueChange={(v) => {
                if (typeof v === "string") {
                  setExitOutcome(v);
                }
              }}
              value={exitOutcome}
            >
              <SelectTrigger className="h-8 w-[8.5rem]" size="sm">
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All outcomes</SelectItem>
                {EXIT_OUTCOME_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              onValueChange={(v) => {
                if (
                  v === "all" ||
                  v === "today" ||
                  v === "this_week" ||
                  v === "last_week" ||
                  v === "mtd"
                ) {
                  setRange(v);
                }
              }}
              value={range}
            >
              <SelectTrigger className="h-8 w-[8rem]" size="sm">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All-time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This week</SelectItem>
                <SelectItem value="last_week">Last week</SelectItem>
                <SelectItem value="mtd">MTD</SelectItem>
              </SelectContent>
            </Select>

            <Button
              className="h-8"
              onClick={() => setShowMoreFilters((open) => !open)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {showMoreFilters ? "Less" : "Dates"}
              {activeFilterCount > 0 ? (
                <Badge className="ml-1" variant="secondary">
                  {activeFilterCount}
                </Badge>
              ) : null}
            </Button>
          </div>

          {showMoreFilters ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="h-8 w-auto min-w-[9rem]"
                onChange={(e) => setFromDay(e.target.value)}
                type="date"
                value={fromDay}
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                className="h-8 w-auto min-w-[9rem]"
                onChange={(e) => setToDay(e.target.value)}
                type="date"
                value={toDay}
              />
              {activeFilterCount > 0 ? (
                <Button
                  className="h-8"
                  onClick={() => {
                    setDirection("all");
                    setTicker("all");
                    setExitOutcome("all");
                    setRange("all");
                    setFromDay("");
                    setToDay("");
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Clear
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-muted-foreground text-sm">
            No trades match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Chart</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Account
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Side</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Outcome
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Size</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Confluence
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Anxiety
                  </TableHead>
                  <TableHead className="hidden md:table-cell">When</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((trade) => (
                  <TradeRow key={trade.id} trade={trade} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onConfirmDelete() {
    setDeleting(true);
    try {
      const result = await deleteTradeAction(trade.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Trade deleted");
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <TableRow className="group hover:bg-muted/30">
        <TableCell className="pl-4">
          <Link
            className="block size-12 overflow-hidden rounded-md ring-1 ring-border transition-opacity hover:opacity-90"
            href={`/trades/${trade.id}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${trade.ticker} chart thumbnail`}
              className="size-12 object-cover"
              src={trade.chartImage}
            />
          </Link>
        </TableCell>
        <TableCell>
          <Badge className="font-mono" variant="outline">
            {trade.ticker}
          </Badge>
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <Badge variant="secondary">{accountLabel(trade.accountId)}</Badge>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {directionLabel(trade.direction)}
        </TableCell>
        <TableCell>
          <span
            className={cn(
              "font-medium tabular-nums",
              pnlTextClass(trade.pnl, true)
            )}
          >
            {formatPnl(trade.pnl)}
          </span>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <Badge variant="outline">{exitOutcomeLabel(trade.exitOutcome)}</Badge>
        </TableCell>
        <TableCell className="hidden tabular-nums sm:table-cell">
          {trade.positionSize}
        </TableCell>
        <TableCell className="hidden tabular-nums md:table-cell">
          {formatConfluenceScore(
            trade.confluenceScore,
            trade.confluenceChecklist
          )}
        </TableCell>
        <TableCell className="hidden xl:table-cell">
          <Badge
            variant={trade.anxietyLevel >= 7 ? "destructive" : "secondary"}
          >
            <HeartPulseIcon data-icon="inline-start" />
            {trade.anxietyLevel}/10 · {anxietyLabel(trade.anxietyLevel)}
          </Badge>
        </TableCell>
        <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
          {formatDate(trade.createdAt)}
        </TableCell>
        <TableCell className="pr-4">
          <div className="flex justify-end gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    aria-label="View trade"
                    className={cn(
                      buttonVariants({ size: "icon-sm", variant: "ghost" })
                    )}
                    href={`/trades/${trade.id}`}
                  />
                }
              >
                <EyeIcon />
              </TooltipTrigger>
              <TooltipContent>View trade</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    aria-label="Edit trade"
                    className={cn(
                      buttonVariants({ size: "icon-sm", variant: "ghost" })
                    )}
                    href={`/trades/${trade.id}/edit`}
                  />
                }
              >
                <PencilIcon />
              </TooltipTrigger>
              <TooltipContent>Edit trade</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label="Delete trade"
                    className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                    disabled={deleting}
                    onClick={() => beginDeleteTrade(() => setConfirmOpen(true))}
                    size="icon-sm"
                    variant="ghost"
                  />
                }
              >
                <Trash2Icon />
              </TooltipTrigger>
              <TooltipContent>Delete trade</TooltipContent>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>

      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel="Delete trade"
        description={`This permanently removes the ${trade.ticker} trade (${formatPnl(trade.pnl)}) and its chart from your journal. This cannot be undone.`}
        loading={deleting}
        onConfirm={onConfirmDelete}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        title="Delete this trade?"
        variant="destructive"
      />
    </>
  );
}
