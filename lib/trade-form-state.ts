import {
  areConfluenceChecklistsEqual,
  type ConfluenceChecklist,
  DEFAULT_CONFLUENCE_CHECKLIST,
  scoreConfluence,
} from "@/lib/confluence";
import type { ChartImageMode, Ticker } from "@/lib/types";

/** Snapshot of log-trade form fields used for dirty detection and reset. */
export interface TradeFormSnapshot {
  anxietyLevel: number;
  chartImage: string | null;
  chartMode: ChartImageMode;
  confluenceChecklist: ConfluenceChecklist;
  exitImage: string | null;
  notesText: string;
  pnl: string;
  positionSize: string;
  ticker: Ticker;
  voiceNote: string | null;
}

export const DEFAULT_TRADE_FORM: TradeFormSnapshot = {
  anxietyLevel: 3,
  chartImage: null,
  chartMode: "single",
  confluenceChecklist: DEFAULT_CONFLUENCE_CHECKLIST,
  exitImage: null,
  notesText: "",
  pnl: "",
  positionSize: "",
  ticker: "MNQ",
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
  return (
    state.ticker !== defaults.ticker ||
    state.pnl !== defaults.pnl ||
    state.positionSize !== defaults.positionSize ||
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
  );
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
