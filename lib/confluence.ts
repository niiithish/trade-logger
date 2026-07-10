import type { Ticker } from "@/lib/types";

/** Which liquidity pool was swept (multi-select under item 1). */
export const LIQUIDITY_SWEEP_TYPES = [
  { id: "swing_1h", label: "1H swing points" },
  { id: "swing_4h", label: "4H swing points" },
  { id: "london_high", label: "London high" },
  { id: "london_low", label: "London low" },
  { id: "asia_high", label: "Asia high" },
  { id: "asia_low", label: "Asia low" },
  { id: "intraday", label: "Intraday liquidity" },
] as const;

export type LiquiditySweepType = (typeof LIQUIDITY_SWEEP_TYPES)[number]["id"];

export const MAX_CONFLUENCE_SCORE = 6;
/** Pre-checklist trades used a 1–5 slider. */
export const LEGACY_MAX_CONFLUENCE_SCORE = 5;

export interface ConfluenceChecklist {
  /** 4 — Bounce from a higher-timeframe fair value gap. */
  htfFvgBounce: boolean;
  /** 6 — Strong momentum while closing the IFVG. */
  ifvgMomentum: boolean;
  /** 3 — SMT divergence vs the other micro (MNQ↔MES). */
  smtDivergence: boolean;
  /** 1 — Price swept liquidity before the entry. */
  sweptLiquidity: boolean;
  /** Which pools were swept (required when sweptLiquidity is true). */
  sweptLiquidityTypes: LiquiditySweepType[];
  /** 2 — Solid liquidity sitting at the target area. */
  targetLiquidity: boolean;
  /** 5 — Tempo (Discord livestream) took the same idea. */
  tempoTookIt: boolean;
}

export const DEFAULT_CONFLUENCE_CHECKLIST: ConfluenceChecklist = {
  htfFvgBounce: false,
  ifvgMomentum: false,
  smtDivergence: false,
  sweptLiquidity: false,
  sweptLiquidityTypes: [],
  targetLiquidity: false,
  tempoTookIt: false,
};

const SWEEP_TYPE_IDS = new Set<string>(
  LIQUIDITY_SWEEP_TYPES.map((item) => item.id)
);

function isLiquiditySweepType(value: unknown): value is LiquiditySweepType {
  return typeof value === "string" && SWEEP_TYPE_IDS.has(value);
}

/** +1 point per main item. Swept liquidity only counts when a type is selected. */
export function scoreConfluence(checklist: ConfluenceChecklist): number {
  let score = 0;
  if (checklist.sweptLiquidity && checklist.sweptLiquidityTypes.length > 0) {
    score += 1;
  }
  if (checklist.targetLiquidity) {
    score += 1;
  }
  if (checklist.smtDivergence) {
    score += 1;
  }
  if (checklist.htfFvgBounce) {
    score += 1;
  }
  if (checklist.tempoTookIt) {
    score += 1;
  }
  if (checklist.ifvgMomentum) {
    score += 1;
  }
  return score;
}

/**
 * Structural validation before save.
 * Returns an error message, or null when the checklist is ok.
 */
export function validateConfluenceChecklist(
  checklist: ConfluenceChecklist
): string | null {
  if (checklist.sweptLiquidity && checklist.sweptLiquidityTypes.length === 0) {
    return "Select which liquidity was swept (1H/4H swings, London, Asia, or intraday).";
  }
  for (const type of checklist.sweptLiquidityTypes) {
    if (!isLiquiditySweepType(type)) {
      return "Invalid liquidity sweep type.";
    }
  }
  return null;
}

export function smtCounterpart(ticker: Ticker): Ticker {
  return ticker === "MNQ" ? "MES" : "MNQ";
}

export function smtDivergenceLabel(ticker: Ticker): string {
  return `SMT divergence with ${smtCounterpart(ticker)}`;
}

export function liquiditySweepTypeLabel(id: LiquiditySweepType): string {
  return LIQUIDITY_SWEEP_TYPES.find((item) => item.id === id)?.label ?? id;
}

/** Human-readable rows for trade detail (checked items only). */
export function listCheckedConfluenceItems(
  checklist: ConfluenceChecklist,
  ticker: Ticker
): { detail?: string; label: string }[] {
  const items: { detail?: string; label: string }[] = [];

  if (checklist.sweptLiquidity && checklist.sweptLiquidityTypes.length > 0) {
    items.push({
      detail: checklist.sweptLiquidityTypes
        .map((id) => liquiditySweepTypeLabel(id))
        .join(" · "),
      label: "Swept liquidity",
    });
  }
  if (checklist.targetLiquidity) {
    items.push({ label: "Good liquidity at target" });
  }
  if (checklist.smtDivergence) {
    items.push({ label: smtDivergenceLabel(ticker) });
  }
  if (checklist.htfFvgBounce) {
    items.push({ label: "Bounce from HTF FVG" });
  }
  if (checklist.tempoTookIt) {
    items.push({ label: "Tempo took it" });
  }
  if (checklist.ifvgMomentum) {
    items.push({ label: "Good momentum closing IFVG" });
  }

  return items;
}

export function serializeConfluenceChecklist(
  checklist: ConfluenceChecklist
): string {
  return JSON.stringify({
    htfFvgBounce: Boolean(checklist.htfFvgBounce),
    ifvgMomentum: Boolean(checklist.ifvgMomentum),
    smtDivergence: Boolean(checklist.smtDivergence),
    sweptLiquidity: Boolean(checklist.sweptLiquidity),
    sweptLiquidityTypes:
      checklist.sweptLiquidityTypes.filter(isLiquiditySweepType),
    targetLiquidity: Boolean(checklist.targetLiquidity),
    tempoTookIt: Boolean(checklist.tempoTookIt),
  } satisfies ConfluenceChecklist);
}

export function parseConfluenceChecklist(
  raw: string | null | undefined
): ConfluenceChecklist | null {
  if (!raw) {
    return null;
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return null;
    }
    const record = data as Partial<ConfluenceChecklist>;
    const types = Array.isArray(record.sweptLiquidityTypes)
      ? record.sweptLiquidityTypes.filter(isLiquiditySweepType)
      : [];
    return {
      htfFvgBounce: Boolean(record.htfFvgBounce),
      ifvgMomentum: Boolean(record.ifvgMomentum),
      smtDivergence: Boolean(record.smtDivergence),
      sweptLiquidity: Boolean(record.sweptLiquidity),
      sweptLiquidityTypes: types,
      targetLiquidity: Boolean(record.targetLiquidity),
      tempoTookIt: Boolean(record.tempoTookIt),
    };
  } catch {
    return null;
  }
}

export function areConfluenceChecklistsEqual(
  a: ConfluenceChecklist,
  b: ConfluenceChecklist
): boolean {
  if (
    a.sweptLiquidity !== b.sweptLiquidity ||
    a.targetLiquidity !== b.targetLiquidity ||
    a.smtDivergence !== b.smtDivergence ||
    a.htfFvgBounce !== b.htfFvgBounce ||
    a.tempoTookIt !== b.tempoTookIt ||
    a.ifvgMomentum !== b.ifvgMomentum
  ) {
    return false;
  }
  if (a.sweptLiquidityTypes.length !== b.sweptLiquidityTypes.length) {
    return false;
  }
  const aSorted = [...a.sweptLiquidityTypes].sort();
  const bSorted = [...b.sweptLiquidityTypes].sort();
  return aSorted.every((id, index) => id === bSorted[index]);
}

export function toggleLiquiditySweepType(
  checklist: ConfluenceChecklist,
  type: LiquiditySweepType
): ConfluenceChecklist {
  const has = checklist.sweptLiquidityTypes.includes(type);
  const sweptLiquidityTypes = has
    ? checklist.sweptLiquidityTypes.filter((id) => id !== type)
    : [...checklist.sweptLiquidityTypes, type];
  return {
    ...checklist,
    sweptLiquidity: sweptLiquidityTypes.length > 0 || checklist.sweptLiquidity,
    sweptLiquidityTypes,
  };
}

export function setSweptLiquidity(
  checklist: ConfluenceChecklist,
  swept: boolean
): ConfluenceChecklist {
  if (!swept) {
    return {
      ...checklist,
      sweptLiquidity: false,
      sweptLiquidityTypes: [],
    };
  }
  return {
    ...checklist,
    sweptLiquidity: true,
  };
}

export function confluenceScoreMax(
  checklist: ConfluenceChecklist | null | undefined
): number {
  return checklist ? MAX_CONFLUENCE_SCORE : LEGACY_MAX_CONFLUENCE_SCORE;
}

export function formatConfluenceScore(
  score: number,
  checklist: ConfluenceChecklist | null | undefined
): string {
  return `${score}/${confluenceScoreMax(checklist)}`;
}
