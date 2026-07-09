import type { Ticker } from "@/lib/types";

/** Snapshot of log-trade form fields used for dirty detection and reset. */
export interface TradeFormSnapshot {
  anxietyLevel: number;
  chartImage: string | null;
  confluenceScore: number;
  notesText: string;
  pnl: string;
  positionSize: string;
  ticker: Ticker;
  voiceNote: string | null;
}

export const DEFAULT_TRADE_FORM: TradeFormSnapshot = {
  anxietyLevel: 3,
  chartImage: null,
  confluenceScore: 3,
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
    state.confluenceScore !== defaults.confluenceScore ||
    state.anxietyLevel !== defaults.anxietyLevel ||
    state.chartImage !== defaults.chartImage ||
    state.notesText.trim() !== defaults.notesText.trim() ||
    state.voiceNote !== defaults.voiceNote
  );
}
