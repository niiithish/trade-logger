"use client";

import { CheckIcon } from "lucide-react";

import {
  type ConfluenceChecklist,
  LIQUIDITY_SWEEP_TYPES,
  type LiquiditySweepType,
  MAX_CONFLUENCE_SCORE,
  scoreConfluence,
  setSweptLiquidity,
  smtDivergenceLabel,
  toggleLiquiditySweepType,
} from "@/lib/confluence";
import type { Ticker } from "@/lib/types";
import { cn } from "@/lib/utils";

function ChecklistRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description?: string;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
        checked
          ? "border-strong bg-selected"
          : "border-border hover:bg-selected/50"
      )}
    >
      <span className="relative mt-0.5 size-5 shrink-0">
        <input
          checked={checked}
          className="peer sr-only"
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span
          aria-hidden
          className={cn(
            "flex size-5 items-center justify-center rounded-md border transition-colors",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
            checked
              ? "border-strong bg-strong text-primary-foreground"
              : "border-border bg-background"
          )}
        >
          {checked ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
        </span>
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block font-medium text-sm text-strong">{label}</span>
        {description ? (
          <span className="block text-muted-foreground text-xs leading-snug">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function SweepTypeChip({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "cursor-pointer rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors",
        checked
          ? "border-strong bg-strong text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-selected hover:text-foreground"
      )}
    >
      <input
        checked={checked}
        className="sr-only"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

export function ConfluenceChecklistFields({
  checklist,
  onChange,
  ticker,
}: {
  checklist: ConfluenceChecklist;
  onChange: (next: ConfluenceChecklist) => void;
  ticker: Ticker;
}) {
  const score = scoreConfluence(checklist);

  function patch(partial: Partial<ConfluenceChecklist>) {
    onChange({ ...checklist, ...partial });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-sm text-strong">Confluence checklist</p>
        <span className="font-medium text-sm text-strong tabular-nums">
          {score}/{MAX_CONFLUENCE_SCORE}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">
        Each checked item is +1 point. Tick what was true for this setup.
      </p>

      <div className="space-y-2">
        <ChecklistRow
          checked={checklist.sweptLiquidity}
          description="Liquidity taken before the move into your entry."
          label="1. Swept liquidity?"
          onChange={(next) => onChange(setSweptLiquidity(checklist, next))}
        />

        {checklist.sweptLiquidity ? (
          <div className="ml-2 space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3 sm:ml-4">
            <p className="font-medium text-muted-foreground text-xs">
              Which liquidity? (pick all that apply · required)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {LIQUIDITY_SWEEP_TYPES.map((type) => {
                const checked = checklist.sweptLiquidityTypes.includes(type.id);
                return (
                  <SweepTypeChip
                    checked={checked}
                    key={type.id}
                    label={type.label}
                    onChange={() =>
                      onChange(
                        toggleLiquiditySweepType(
                          checklist,
                          type.id as LiquiditySweepType
                        )
                      )
                    }
                  />
                );
              })}
            </div>
            {checklist.sweptLiquidityTypes.length === 0 ? (
              <p className="text-amber-400 text-xs">
                Select at least one pool so this point counts.
              </p>
            ) : null}
          </div>
        ) : null}

        <ChecklistRow
          checked={checklist.targetLiquidity}
          description="Is there good liquidity sitting at the target area?"
          label="2. Good liquidity at target"
          onChange={(next) => patch({ targetLiquidity: next })}
        />

        <ChecklistRow
          checked={checklist.smtDivergence}
          description={`Cross-check ${ticker === "MNQ" ? "MES" : "MNQ"} for SMT.`}
          label={`3. ${smtDivergenceLabel(ticker)}`}
          onChange={(next) => patch({ smtDivergence: next })}
        />

        <ChecklistRow
          checked={checklist.htfFvgBounce}
          description="Reaction from a higher-timeframe fair value gap."
          label="4. Bounce from HTF FVG"
          onChange={(next) => patch({ htfFvgBounce: next })}
        />

        <ChecklistRow
          checked={checklist.tempoTookIt}
          description="Tempo (Discord livestream) took the same idea."
          label="5. Tempo took it"
          onChange={(next) => patch({ tempoTookIt: next })}
        />

        <ChecklistRow
          checked={checklist.ifvgMomentum}
          description="Strong push while the inversion FVG closed."
          label="6. Good momentum closing IFVG"
          onChange={(next) => patch({ ifvgMomentum: next })}
        />
      </div>
    </div>
  );
}
