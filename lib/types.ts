import type { AccountId } from "@/lib/accounts";
import type { ConfluenceChecklist } from "@/lib/confluence";
import type {
  AfterTp1Stop,
  Direction,
  ExitOutcome,
  ManagementStyle,
  MistakeTag,
} from "@/lib/trade-management";

export type Ticker = "MNQ" | "MES";

/** How chart screenshots are attached on the log-trade form. */
export type ChartImageMode = "single" | "entry_exit";

export interface Trade {
  accountId: AccountId | null;
  afterTp1Stop: AfterTp1Stop | null;
  anxietyLevel: number;
  /** Primary/single chart, or entry chart when exitImage is present. */
  chartImage: string;
  /** Structured confluence answers; null for legacy slider-only trades. */
  confluenceChecklist: ConfluenceChecklist | null;
  confluenceScore: number;
  createdAt: string;
  direction: Direction | null;
  /** Exit chart when the trade was logged with separate entry/exit images. */
  exitImage: string | null;
  exitOutcome: ExitOutcome | null;
  id: string;
  managementStyle: ManagementStyle | null;
  mistakeTags: MistakeTag[];
  notesText: string | null;
  plannedR: number | null;
  pnl: number;
  positionSize: number;
  realizedR: number | null;
  ticker: Ticker;
  tp1Contracts: number | null;
  voiceNote: string | null;
  voiceNoteMime: string | null;
}

export interface TradeInput {
  accountId: AccountId;
  afterTp1Stop?: AfterTp1Stop | null;
  anxietyLevel: number;
  chartImage: string;
  confluenceChecklist: ConfluenceChecklist;
  confluenceScore: number;
  direction: Direction;
  exitImage?: string | null;
  exitOutcome: ExitOutcome;
  managementStyle: ManagementStyle;
  mistakeTags?: MistakeTag[];
  notesText?: string | null;
  plannedR?: number | null;
  pnl: number;
  positionSize: number;
  realizedR?: number | null;
  ticker: Ticker;
  tp1Contracts?: number | null;
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

export type DateRangePreset =
  | "today"
  | "this_week"
  | "last_week"
  | "mtd"
  | "all";

export type AccountFilter = "all" | AccountId;
