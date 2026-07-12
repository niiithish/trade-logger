"use client";

import {
  ArrowLeftIcon,
  HeartPulseIcon,
  ImageIcon,
  MicIcon,
  PencilIcon,
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
import { accountLabel } from "@/lib/accounts";
import { beginDeleteTrade } from "@/lib/confirm-flow";
import {
  formatConfluenceScore,
  listCheckedConfluenceItems,
} from "@/lib/confluence";
import {
  anxietyLabel,
  anxietyTone,
  formatDate,
  formatPnl,
  pnlBadgeVariant,
} from "@/lib/format";
import {
  afterTp1StopLabel,
  directionLabel,
  exitOutcomeLabel,
  mistakeTagLabel,
} from "@/lib/trade-management";
import type { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Trade review surface — multi-section layout. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: detail layout
export function TradeDetail({ trade }: { trade: Trade }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasNotes = Boolean(trade.notesText || trade.voiceNote);
  const confluenceItems = trade.confluenceChecklist
    ? listCheckedConfluenceItems(trade.confluenceChecklist, trade.ticker)
    : [];

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
        <div className="flex flex-wrap gap-2">
          <Link
            className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}
            href={`/trades/${trade.id}/edit`}
          >
            <PencilIcon data-icon="inline-start" />
            Edit
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
                <Badge variant="secondary">
                  {accountLabel(trade.accountId)}
                </Badge>
                <Badge variant="outline">
                  {directionLabel(trade.direction)}
                </Badge>
                <Badge variant="outline">
                  {exitOutcomeLabel(trade.exitOutcome)}
                </Badge>
              </div>
              <CardDescription>{formatDate(trade.createdAt)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {trade.exitImage ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <ChartPanel
                alt={`${trade.ticker} entry chart`}
                label="Entry"
                src={trade.chartImage}
              />
              <ChartPanel
                alt={`${trade.ticker} exit chart`}
                label="Exit"
                src={trade.exitImage}
              />
            </div>
          ) : (
            <ChartPanel alt={`${trade.ticker} chart`} src={trade.chartImage} />
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile
              hint="Contracts / size"
              label="Position size"
              value={String(trade.positionSize)}
            />
            <MetricTile
              hint={
                trade.confluenceChecklist
                  ? "Checklist points"
                  : "Legacy slider score"
              }
              label="Confluence"
              value={formatConfluenceScore(
                trade.confluenceScore,
                trade.confluenceChecklist
              )}
            />
            <MetricTile
              hint={anxietyLabel(trade.anxietyLevel)}
              icon={<HeartPulseIcon className="size-3.5" />}
              label="Anxiety"
              tone={anxietyTone(trade.anxietyLevel)}
              value={`${trade.anxietyLevel}/10`}
            />
            <MetricTile
              hint={trade.managementStyle ?? "—"}
              label="Exit outcome"
              value={exitOutcomeLabel(trade.exitOutcome)}
            />
            {trade.managementStyle === "partials" ? (
              <>
                <MetricTile
                  hint="Contracts at TP1"
                  label="TP1 size"
                  value={
                    trade.tp1Contracts === null
                      ? "—"
                      : String(trade.tp1Contracts)
                  }
                />
                <MetricTile
                  label="After TP1 stop"
                  value={afterTp1StopLabel(trade.afterTp1Stop)}
                />
              </>
            ) : null}
            {trade.plannedR !== null || trade.realizedR !== null ? (
              <>
                <MetricTile
                  label="Planned R"
                  value={trade.plannedR === null ? "—" : String(trade.plannedR)}
                />
                <MetricTile
                  label="Realized R"
                  value={
                    trade.realizedR === null ? "—" : String(trade.realizedR)
                  }
                />
              </>
            ) : null}
          </div>

          {trade.mistakeTags.length > 0 ? (
            <section className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="font-medium text-sm">Mistake tags</p>
              <div className="flex flex-wrap gap-2">
                {trade.mistakeTags.map((tag) => (
                  <Badge key={tag} variant="destructive">
                    {mistakeTagLabel(tag)}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {confluenceItems.length > 0 ? (
            <section className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm">Confluence hits</p>
                <Badge variant="secondary">
                  {formatConfluenceScore(
                    trade.confluenceScore,
                    trade.confluenceChecklist
                  )}
                </Badge>
              </div>
              <ul className="space-y-2">
                {confluenceItems.map((item) => (
                  <li
                    className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
                    key={item.label}
                  >
                    <p className="font-medium text-sm text-strong">
                      {item.label}
                    </p>
                    {item.detail ? (
                      <p className="mt-0.5 text-muted-foreground text-xs">
                        {item.detail}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

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
                  <audio className="w-full" controls src={trade.voiceNote}>
                    <track kind="captions" />
                  </audio>
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
        description={`This permanently removes the ${trade.ticker} trade (${formatPnl(trade.pnl)}) and its chart${trade.exitImage ? "s" : ""} from your journal. This cannot be undone.`}
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

function ChartPanel({
  alt,
  label,
  src,
}: {
  alt: string;
  label?: string;
  src: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-muted/20 ring-1 ring-border">
      {label ? (
        <div className="border-border/60 border-b px-3 py-2">
          <p className="font-medium text-muted-foreground text-xs tracking-wide">
            {label}
          </p>
        </div>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt}
        className="max-h-[28rem] w-full object-contain"
        src={src}
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
