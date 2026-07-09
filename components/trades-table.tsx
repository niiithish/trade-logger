"use client";

import {
  BookOpenIcon,
  EyeIcon,
  HeartPulseIcon,
  Loader2Icon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { deleteTradeAction } from "@/app/actions/trades";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { anxietyLabel, formatDate, formatPnl } from "@/lib/format";
import type { Trade } from "@/lib/types";

function pnlTextClass(pnl: number): string | undefined {
  if (pnl > 0) {
    return "font-medium text-emerald-400";
  }
  if (pnl < 0) {
    return "font-medium text-destructive";
  }
}

export function TradesTable({
  trades,
  title = "All trades",
  description,
  emptyHref = "/log",
}: {
  trades: Trade[];
  title?: string;
  description?: string;
  emptyHref?: string;
}) {
  if (trades.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpenIcon />
              </EmptyMedia>
              <EmptyTitle>No trades yet</EmptyTitle>
              <EmptyDescription>
                Log a trade to start building your journal.
              </EmptyDescription>
            </EmptyHeader>
            <Button render={<Link href={emptyHref} />}>Log trade</Button>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description ??
            `${trades.length} trade${trades.length === 1 ? "" : "s"}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Chart</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead>P&L</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Confluence</TableHead>
              <TableHead>Anxiety</TableHead>
              <TableHead>When</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    setDeleting(true);
    try {
      const result = await deleteTradeAction(trade.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Trade deleted");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <TableRow>
      <TableCell className="pl-4">
        <img
          alt=""
          className="size-12 rounded-md object-cover ring-1 ring-foreground/10"
          height={48}
          src={trade.chartImage}
          width={48}
        />
      </TableCell>
      <TableCell>
        <Badge className="font-mono" variant="outline">
          {trade.ticker}
        </Badge>
      </TableCell>
      <TableCell>
        <span className={pnlTextClass(trade.pnl)}>{formatPnl(trade.pnl)}</span>
      </TableCell>
      <TableCell>{trade.positionSize}</TableCell>
      <TableCell>{trade.confluenceScore}/5</TableCell>
      <TableCell>
        <Badge variant={trade.anxietyLevel >= 7 ? "destructive" : "secondary"}>
          <HeartPulseIcon data-icon="inline-start" />
          {trade.anxietyLevel}/10 · {anxietyLabel(trade.anxietyLevel)}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {formatDate(trade.createdAt)}
      </TableCell>
      <TableCell className="pr-4">
        <div className="flex justify-end gap-1">
          <Button
            render={<Link href={`/trades/${trade.id}`} />}
            size="icon-sm"
            variant="ghost"
          >
            <EyeIcon />
            <span className="sr-only">View</span>
          </Button>
          <Button
            disabled={deleting}
            onClick={() => void onDelete()}
            size="icon-sm"
            variant="ghost"
          >
            {deleting ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <Trash2Icon />
            )}
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
