"use client";

import {
  BookOpenIcon,
  EyeIcon,
  HeartPulseIcon,
  PlusCircleIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { deleteTradeAction } from "@/app/actions/trades";
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
import { beginDeleteTrade } from "@/lib/confirm-flow";
import { formatConfluenceScore } from "@/lib/confluence";
import {
  anxietyLabel,
  formatDate,
  formatPnl,
  pnlTextClass,
} from "@/lib/format";
import type { Trade } from "@/lib/types";
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
                Log your first MNQ or MES trade to start the journal. Charts,
                P&amp;L, and Heart Rate Index metrics all live here.
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
                `${trades.length} trade${trades.length === 1 ? "" : "s"} · newest first`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Chart</TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead className="hidden sm:table-cell">Size</TableHead>
                <TableHead className="hidden md:table-cell">
                  Confluence
                </TableHead>
                <TableHead className="hidden lg:table-cell">Anxiety</TableHead>
                <TableHead className="hidden md:table-cell">When</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TradeRow key={trade.id} trade={trade} />
              ))}
            </TableBody>
          </Table>
        </div>
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
        <TableCell className="hidden tabular-nums sm:table-cell">
          {trade.positionSize}
        </TableCell>
        <TableCell className="hidden tabular-nums md:table-cell">
          {formatConfluenceScore(
            trade.confluenceScore,
            trade.confluenceChecklist
          )}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
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
