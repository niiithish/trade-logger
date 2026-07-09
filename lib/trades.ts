import { ensureSchema, getDb } from "@/lib/db";
import { toDayKey } from "@/lib/format";
import type {
  DaySummary,
  Ticker,
  Trade,
  TradeInput,
  TradeStats,
} from "@/lib/types";

interface TradeRow {
  anxiety_level: number;
  chart_image: string;
  confluence_score: number;
  created_at: string;
  id: string;
  notes_text: string | null;
  pnl: number;
  position_size: number;
  ticker: string;
  voice_note: string | null;
  voice_note_mime: string | null;
}

interface StatsRow {
  avg_anxiety: number;
  avg_confluence: number;
  avg_pnl: number;
  losers: number;
  total_pnl: number;
  total_trades: number;
  winners: number;
}

function mapTrade(row: TradeRow): Trade {
  return {
    anxietyLevel: row.anxiety_level,
    chartImage: row.chart_image,
    confluenceScore: row.confluence_score,
    createdAt: row.created_at,
    id: row.id,
    notesText: row.notes_text,
    pnl: row.pnl,
    positionSize: row.position_size,
    ticker: row.ticker as Ticker,
    voiceNote: row.voice_note,
    voiceNoteMime: row.voice_note_mime,
  };
}

export async function listTrades(): Promise<Trade[]> {
  await ensureSchema();
  const result = await getDb().execute(
    "SELECT * FROM trades ORDER BY created_at DESC"
  );
  return result.rows.map((row) => mapTrade(row as unknown as TradeRow));
}

export async function getTrade(id: string): Promise<Trade | null> {
  await ensureSchema();
  const result = await getDb().execute({
    args: [id],
    sql: "SELECT * FROM trades WHERE id = ?",
  });
  const [row] = result.rows;
  return row ? mapTrade(row as unknown as TradeRow) : null;
}

export async function createTrade(input: TradeInput): Promise<Trade> {
  await ensureSchema();

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await getDb().execute({
    args: [
      id,
      input.ticker,
      input.pnl,
      input.positionSize,
      input.confluenceScore,
      input.anxietyLevel,
      input.chartImage,
      input.notesText ?? null,
      input.voiceNote ?? null,
      input.voiceNoteMime ?? null,
      createdAt,
    ],
    sql: `
      INSERT INTO trades (
        id, ticker, pnl, position_size, confluence_score, anxiety_level,
        chart_image, notes_text, voice_note, voice_note_mime, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  });

  return {
    anxietyLevel: input.anxietyLevel,
    chartImage: input.chartImage,
    confluenceScore: input.confluenceScore,
    createdAt,
    id,
    notesText: input.notesText ?? null,
    pnl: input.pnl,
    positionSize: input.positionSize,
    ticker: input.ticker,
    voiceNote: input.voiceNote ?? null,
    voiceNoteMime: input.voiceNoteMime ?? null,
  };
}

export async function deleteTrade(id: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    args: [id],
    sql: "DELETE FROM trades WHERE id = ?",
  });
}

export async function getTradeStats(): Promise<TradeStats> {
  await ensureSchema();
  const result = await getDb().execute(`
    SELECT
      COUNT(*) as total_trades,
      COALESCE(SUM(pnl), 0) as total_pnl,
      COALESCE(AVG(pnl), 0) as avg_pnl,
      COALESCE(AVG(anxiety_level), 0) as avg_anxiety,
      COALESCE(AVG(confluence_score), 0) as avg_confluence,
      SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winners,
      SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losers
    FROM trades
  `);

  const [raw] = result.rows;
  const row = raw as unknown as StatsRow;
  const totalTrades = Number(row.total_trades);
  const winners = Number(row.winners);

  return {
    avgAnxiety: Number(row.avg_anxiety),
    avgConfluence: Number(row.avg_confluence),
    avgPnl: Number(row.avg_pnl),
    losers: Number(row.losers),
    totalPnl: Number(row.total_pnl),
    totalTrades,
    winners,
    winRate: totalTrades > 0 ? (winners / totalTrades) * 100 : 0,
  };
}

export async function getDaySummaries(): Promise<DaySummary[]> {
  const trades = await listTrades();
  const map = new Map<
    string,
    {
      anxietySum: number;
      losers: number;
      totalPnl: number;
      tradeCount: number;
      winners: number;
    }
  >();

  for (const trade of trades) {
    const dayKey = toDayKey(trade.createdAt);
    const current = map.get(dayKey) ?? {
      anxietySum: 0,
      losers: 0,
      totalPnl: 0,
      tradeCount: 0,
      winners: 0,
    };
    current.tradeCount += 1;
    current.totalPnl += trade.pnl;
    current.anxietySum += trade.anxietyLevel;
    if (trade.pnl > 0) {
      current.winners += 1;
    }
    if (trade.pnl < 0) {
      current.losers += 1;
    }
    map.set(dayKey, current);
  }

  return [...map.entries()]
    .map(([dayKey, value]) => ({
      avgAnxiety:
        value.tradeCount > 0 ? value.anxietySum / value.tradeCount : 0,
      dayKey,
      losers: value.losers,
      totalPnl: value.totalPnl,
      tradeCount: value.tradeCount,
      winners: value.winners,
    }))
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey));
}

export async function listTradesForDay(dayKey: string): Promise<Trade[]> {
  const trades = await listTrades();
  return trades.filter((trade) => toDayKey(trade.createdAt) === dayKey);
}
