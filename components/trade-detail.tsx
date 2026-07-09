"use client";

import { ArrowLeftIcon, Loader2Icon, Trash2Icon } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { anxietyLabel, formatDate, formatPnl } from "@/lib/format";
import type { Trade } from "@/lib/types";

function pnlBadgeVariant(pnl: number): "default" | "destructive" | "secondary" {
  if (pnl > 0) {
    return "default";
  }
  if (pnl < 0) {
    return "destructive";
  }
  return "secondary";
}

export function TradeDetail({ trade }: { trade: Trade }) {
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
      router.push("/trades");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button render={<Link href="/trades" />} size="sm" variant="outline">
          <ArrowLeftIcon data-icon="inline-start" />
          Back to trades
        </Button>
        <Button
          disabled={deleting}
          onClick={() => void onDelete()}
          size="sm"
          variant="destructive"
        >
          {deleting ? (
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
          ) : (
            <Trash2Icon data-icon="inline-start" />
          )}
          Delete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="font-mono text-xl">{trade.ticker}</CardTitle>
            <Badge variant={pnlBadgeVariant(trade.pnl)}>
              {formatPnl(trade.pnl)}
            </Badge>
          </div>
          <CardDescription>{formatDate(trade.createdAt)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <img
            alt={`${trade.ticker} chart`}
            className="max-h-[28rem] w-full rounded-xl object-contain ring-1 ring-foreground/10"
            height={448}
            src={trade.chartImage}
            width={896}
          />

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Size {trade.positionSize}</Badge>
            <Badge variant="secondary">
              Confluence {trade.confluenceScore}/5
            </Badge>
            <Badge
              variant={trade.anxietyLevel >= 7 ? "destructive" : "secondary"}
            >
              Anxiety {trade.anxietyLevel}/10 ·{" "}
              {anxietyLabel(trade.anxietyLevel)}
            </Badge>
            {trade.notesText ? (
              <Badge variant="outline">Text note</Badge>
            ) : null}
            {trade.voiceNote ? (
              <Badge variant="outline">Voice note</Badge>
            ) : null}
          </div>

          <Separator />

          {trade.notesText ? (
            <div className="space-y-1">
              <p className="font-medium text-sm">Notes</p>
              <p className="whitespace-pre-wrap text-muted-foreground text-sm">
                {trade.notesText}
              </p>
            </div>
          ) : null}

          {trade.voiceNote ? (
            <div className="space-y-1">
              <p className="font-medium text-sm">Voice note</p>
              <audio className="w-full" controls src={trade.voiceNote} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
