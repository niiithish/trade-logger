import {
  type AccountId,
  DEFAULT_ACCOUNT_ID,
  isAccountId,
} from "@/lib/accounts";
import {
  areConfluenceChecklistsEqual,
  type ConfluenceChecklist,
  DEFAULT_CONFLUENCE_CHECKLIST,
  scoreConfluence,
} from "@/lib/confluence";
import {
  type AfterTp1Stop,
  type Direction,
  type ExitOutcome,
  isDirection,
  isExitOutcome,
  isManagementStyle,
  type ManagementStyle,
  type MistakeTag,
  validateTradeManagement,
} from "@/lib/trade-management";
import { toDatetimeLocalValue } from "@/lib/format";
import type { ChartImageMode, Ticker } from "@/lib/types";

/** Snapshot of log-trade form fields used for dirty detection and reset. */
export interface TradeFormSnapshot {
  accountId: AccountId;
  afterTp1Stop: AfterTp1Stop | null;
  anxietyLevel: number;
  chartImage: string | null;
  chartMode: ChartImageMode;
  confluenceChecklist: ConfluenceChecklist;
  /** datetime-local string for trade time (local timezone). */
  tradeDate: string;
  direction: Direction;
  exitImage: string | null;
  exitOutcome: ExitOutcome;
  managementStyle: ManagementStyle;
  mistakeTags: MistakeTag[];
  notesText: string;
  plannedR: string;
  pnl: string;
  positionSize: string;
  realizedR: string;
  ticker: Ticker;
  tp1Contracts: string;
  voiceNote: string | null;
}

export function defaultTradeDateValue(): string {
  return toDatetimeLocalValue(new Date());
}

export const DEFAULT_TRADE_FORM: TradeFormSnapshot = {
  accountId: DEFAULT_ACCOUNT_ID,
  afterTp1Stop: null,
  anxietyLevel: 3,
  chartImage: null,
  chartMode: "single",
  confluenceChecklist: DEFAULT_CONFLUENCE_CHECKLIST,
  tradeDate: "",
  direction: "long",
  exitImage: null,
  exitOutcome: "full_tp",
  managementStyle: "full",
  mistakeTags: [],
  notesText: "",
  plannedR: "",
  pnl: "",
  positionSize: "",
  realizedR: "",
  ticker: "MNQ",
  tp1Contracts: "",
  voiceNote: null,
};

/**
 * True when the form differs from the pristine default snapshot.
 * Used to gate Reset behind a confirmation modal (via beginFormReset).
 */
export function isTradeFormDirty(
  state: TradeFormSnapshot,
  defaults: TradeFormSnapshot = DEFAULT_TRADE_FORM
): boolean {
  if (
    state.accountId !== defaults.accountId ||
    state.ticker !== defaults.ticker ||
    state.direction !== defaults.direction ||
    state.tradeDate !== defaults.tradeDate ||
    state.pnl !== defaults.pnl ||
    state.positionSize !== defaults.positionSize ||
    state.managementStyle !== defaults.managementStyle ||
    state.exitOutcome !== defaults.exitOutcome ||
    state.afterTp1Stop !== defaults.afterTp1Stop ||
    state.tp1Contracts !== defaults.tp1Contracts ||
    state.plannedR !== defaults.plannedR ||
    state.realizedR !== defaults.realizedR ||
    !areConfluenceChecklistsEqual(
      state.confluenceChecklist,
      defaults.confluenceChecklist
    ) ||
    state.anxietyLevel !== defaults.anxietyLevel ||
    state.chartMode !== defaults.chartMode ||
    state.chartImage !== defaults.chartImage ||
    state.exitImage !== defaults.exitImage ||
    state.notesText.trim() !== defaults.notesText.trim() ||
    state.voiceNote !== defaults.voiceNote
  ) {
    return true;
  }
  if (state.mistakeTags.length !== defaults.mistakeTags.length) {
    return true;
  }
  const a = [...state.mistakeTags].sort();
  const b = [...defaults.mistakeTags].sort();
  return a.some((tag, i) => tag !== b[i]);
}

/** Whether the chart step has everything required for the selected mode. */
export function isChartStepComplete(
  state: Pick<TradeFormSnapshot, "chartImage" | "chartMode" | "exitImage">
): boolean {
  if (!state.chartImage) {
    return false;
  }
  if (state.chartMode === "entry_exit") {
    return Boolean(state.exitImage);
  }
  return true;
}

export function confluenceScoreFromSnapshot(
  state: Pick<TradeFormSnapshot, "confluenceChecklist">
): number {
  return scoreConfluence(state.confluenceChecklist);
}

export function isResultStepComplete(
  state: Pick<
    TradeFormSnapshot,
    "pnl" | "positionSize" | "direction" | "tradeDate"
  >
): boolean {
  return (
    state.pnl.trim().length > 0 &&
    state.positionSize.trim().length > 0 &&
    isDirection(state.direction) &&
    state.tradeDate.trim().length > 0
  );
}

export function isManagementStepComplete(
  state: Pick<
    TradeFormSnapshot,
    "managementStyle" | "exitOutcome" | "afterTp1Stop" | "tp1Contracts"
  >
): boolean {
  const tp1 =
    state.tp1Contracts.trim() === "" ? null : Number(state.tp1Contracts);
  return (
    validateTradeManagement({
      afterTp1Stop: state.afterTp1Stop,
      exitOutcome: state.exitOutcome,
      managementStyle: state.managementStyle,
      tp1Contracts: Number.isFinite(tp1 as number) ? tp1 : null,
    }) === null
  );
}

export function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function tradeFormSnapshotFromTrade(input: {
  accountId: AccountId | null;
  afterTp1Stop: AfterTp1Stop | null;
  anxietyLevel: number;
  chartImage: string;
  confluenceChecklist: ConfluenceChecklist | null;
  createdAt?: string;
  direction: Direction | null;
  exitImage: string | null;
  exitOutcome: ExitOutcome | null;
  managementStyle: ManagementStyle | null;
  mistakeTags: MistakeTag[];
  notesText: string | null;
  plannedR: number | null;
  pnl: number;
  positionSize: number;
  realizedR: number | null;
  ticker: Ticker;
  tp1Contracts: number | null;
}): TradeFormSnapshot {
  return {
    accountId: isAccountId(input.accountId)
      ? input.accountId
      : DEFAULT_ACCOUNT_ID,
    afterTp1Stop: input.afterTp1Stop,
    anxietyLevel: input.anxietyLevel,
    chartImage: input.chartImage,
    chartMode: input.exitImage ? "entry_exit" : "single",
    confluenceChecklist:
      input.confluenceChecklist ?? DEFAULT_CONFLUENCE_CHECKLIST,
    tradeDate: input.createdAt
      ? toDatetimeLocalValue(input.createdAt)
      : defaultTradeDateValue(),
    direction: input.direction ?? "long",
    exitImage: input.exitImage,
    exitOutcome: isExitOutcome(input.exitOutcome) ? input.exitOutcome : "other",
    managementStyle: isManagementStyle(input.managementStyle)
      ? input.managementStyle
      : "full",
    mistakeTags: input.mistakeTags,
    notesText: input.notesText ?? "",
    plannedR: input.plannedR === null ? "" : String(input.plannedR),
    pnl: String(input.pnl),
    positionSize: String(input.positionSize),
    realizedR: input.realizedR === null ? "" : String(input.realizedR),
    ticker: input.ticker,
    tp1Contracts: input.tp1Contracts === null ? "" : String(input.tp1Contracts),
    voiceNote: null,
  };
}
