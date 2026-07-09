export type Ticker = "MNQ" | "MES";

export interface Trade {
  anxietyLevel: number;
  chartImage: string;
  confluenceScore: number;
  createdAt: string;
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
  confluenceScore: number;
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
