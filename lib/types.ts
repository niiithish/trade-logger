import type { ConfluenceChecklist } from "@/lib/confluence";

export type Ticker = "MNQ" | "MES";

/** How chart screenshots are attached on the log-trade form. */
export type ChartImageMode = "single" | "entry_exit";

export interface Trade {
  anxietyLevel: number;
  /** Primary/single chart, or entry chart when exitImage is present. */
  chartImage: string;
  /** Structured confluence answers; null for legacy slider-only trades. */
  confluenceChecklist: ConfluenceChecklist | null;
  confluenceScore: number;
  createdAt: string;
  /** Exit chart when the trade was logged with separate entry/exit images. */
  exitImage: string | null;
  id: string;
  notesText: string | null;
  pnl: number;
  positionSize: number;
  ticker: Ticker;
  voiceNote: string | null;
  voiceNoteMime: string | null;
}

export interface TradeInput {
  anxietyLevel: number;
  chartImage: string;
  confluenceChecklist: ConfluenceChecklist;
  confluenceScore: number;
  exitImage?: string | null;
  notesText?: string | null;
  pnl: number;
  positionSize: number;
  ticker: Ticker;
  voiceNote?: string | null;
  voiceNoteMime?: string | null;
}

export interface TradeStats {
  avgAnxiety: number;
  avgConfluence: number;
  avgPnl: number;
  losers: number;
  totalPnl: number;
  totalTrades: number;
  winners: number;
  winRate: number;
}

export interface DaySummary {
  avgAnxiety: number;
  dayKey: string;
  losers: number;
  totalPnl: number;
  tradeCount: number;
  winners: number;
}
