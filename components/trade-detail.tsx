"use client";

import {
  ArrowLeftIcon,
  HeartPulseIcon,
  ImageIcon,
  MicIcon,
  StickyNoteIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import { deleteTradeAction } from "@/app/actions/trades";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { beginDeleteTrade } from "@/lib/confirm-flow";
import {
  anxietyLabel,
  anxietyTone,
  formatDate,
  formatPnl,
  pnlBadgeVariant,
} from "@/lib/format";
import type { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TradeDetail({ trade }: { trade: Trade }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasNotes = Boolean(trade.notesText || trade.voiceNote);

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
      router.push("/trades");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          href="/trades"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to trades
        </Link>
        <Button
          disabled={deleting}
          onClick={() => beginDeleteTrade(() => setConfirmOpen(true))}
          size="sm"
          variant="destructive"
        >
          <Trash2Icon data-icon="inline-start" />
          Delete trade
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-border/60 border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="font-mono text-2xl tracking-tight">
                  {trade.ticker}
                </CardTitle>
                <Badge
                  className="text-sm tabular-nums"
                  variant={pnlBadgeVariant(trade.pnl)}
                >
                  {formatPnl(trade.pnl)}
                </Badge>
              </div>
              <CardDescription>{formatDate(trade.createdAt)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="overflow-hidden rounded-xl bg-muted/20 ring-1 ring-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${trade.ticker} chart`}
              className="max-h-[28rem] w-full object-contain"
              src={trade.chartImage}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile
              hint="Contracts / size"
              label="Position size"
              value={String(trade.positionSize)}
            />
            <MetricTile
              hint="Setup quality"
              label="Confluence"
              value={`${trade.confluenceScore}/5`}
            />
            <MetricTile
              hint={anxietyLabel(trade.anxietyLevel)}
              icon={<HeartPulseIcon className="size-3.5" />}
              label="Anxiety"
              tone={anxietyTone(trade.anxietyLevel)}
              value={`${trade.anxietyLevel}/10`}
            />
          </div>

          {hasNotes ? (
            <div className="grid gap-4">
              {trade.notesText ? (
                <section className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <StickyNoteIcon className="size-4 text-muted-foreground" />
                    Notes
                  </div>
                  <p className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
                    {trade.notesText}
                  </p>
                </section>
              ) : null}

              {trade.voiceNote ? (
                <section className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <MicIcon className="size-4 text-muted-foreground" />
                    Voice note
                  </div>
                  <audio className="w-full" controls src={trade.voiceNote} />
                </section>
              ) : null}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-muted-foreground text-sm">
              <ImageIcon className="size-4 opacity-60" />
              No notes recorded for this trade.
            </p>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "ok" | "warn" | "danger";
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
      <p className="font-medium text-muted-foreground text-xs tracking-wide">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 flex items-center gap-1.5 font-medium text-lg tabular-nums",
          tone === "ok" && "text-emerald-400",
          tone === "warn" && "text-amber-400",
          tone === "danger" && "text-red-400"
        )}
      >
        {icon}
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
