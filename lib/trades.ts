import { avg, count, desc, eq, sql, sum } from "drizzle-orm";

import {
  parseConfluenceChecklist,
  serializeConfluenceChecklist,
} from "@/lib/confluence";
import { db } from "@/lib/db";
import { trades } from "@/lib/db/schema";
import { toDayKey } from "@/lib/format";
import type {
  DaySummary,
  Ticker,
  Trade,
  TradeInput,
  TradeStats,
} from "@/lib/types";

function mapTrade(row: typeof trades.$inferSelect): Trade {
  return {
    anxietyLevel: row.anxietyLevel,
    chartImage: row.chartImage,
    confluenceChecklist: parseConfluenceChecklist(row.confluenceChecklist),
    confluenceScore: row.confluenceScore,
    createdAt: row.createdAt,
    exitImage: row.exitImage ?? null,
    id: row.id,
    notesText: row.notesText,
    pnl: row.pnl,
    positionSize: row.positionSize,
    ticker: row.ticker as Ticker,
    voiceNote: row.voiceNote,
    voiceNoteMime: row.voiceNoteMime,
  };
}

export async function listTrades(): Promise<Trade[]> {
  const rows = await db.select().from(trades).orderBy(desc(trades.createdAt));

  return rows.map(mapTrade);
}

export async function getTrade(id: string): Promise<Trade | null> {
  const [row] = await db
    .select()
    .from(trades)
    .where(eq(trades.id, id))
    .limit(1);
  return row ? mapTrade(row) : null;
}

export async function createTrade(input: TradeInput): Promise<Trade> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const [row] = await db
    .insert(trades)
    .values({
      anxietyLevel: input.anxietyLevel,
      chartImage: input.chartImage,
      confluenceChecklist: serializeConfluenceChecklist(
        input.confluenceChecklist
      ),
      confluenceScore: input.confluenceScore,
      createdAt,
      exitImage: input.exitImage ?? null,
      id,
      notesText: input.notesText ?? null,
      pnl: input.pnl,
      positionSize: input.positionSize,
      ticker: input.ticker,
      voiceNote: input.voiceNote ?? null,
      voiceNoteMime: input.voiceNoteMime ?? null,
    })
    .returning();

  return mapTrade(row);
}

export async function deleteTrade(id: string): Promise<void> {
  await db.delete(trades).where(eq(trades.id, id));
}

export async function getTradeStats(): Promise<TradeStats> {
  const [row] = await db
    .select({
      avgAnxiety: sql<number>`coalesce(${avg(trades.anxietyLevel)}, 0)`,
      avgConfluence: sql<number>`coalesce(${avg(trades.confluenceScore)}, 0)`,
      avgPnl: sql<number>`coalesce(${avg(trades.pnl)}, 0)`,
      losers: sql<number>`coalesce(sum(case when ${trades.pnl} < 0 then 1 else 0 end), 0)`,
      totalPnl: sql<number>`coalesce(${sum(trades.pnl)}, 0)`,
      totalTrades: count(),
      winners: sql<number>`coalesce(sum(case when ${trades.pnl} > 0 then 1 else 0 end), 0)`,
    })
    .from(trades);

  const totalTrades = Number(row?.totalTrades ?? 0);
  const winners = Number(row?.winners ?? 0);

  return {
    avgAnxiety: Number(row?.avgAnxiety ?? 0),
    avgConfluence: Number(row?.avgConfluence ?? 0),
    avgPnl: Number(row?.avgPnl ?? 0),
    losers: Number(row?.losers ?? 0),
    totalPnl: Number(row?.totalPnl ?? 0),
    totalTrades,
    winners,
    winRate: totalTrades > 0 ? (winners / totalTrades) * 100 : 0,
  };
}

export async function getDaySummaries(): Promise<DaySummary[]> {
  const all = await listTrades();
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

  for (const trade of all) {
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
  const all = await listTrades();
  return all.filter((trade) => toDayKey(trade.createdAt) === dayKey);
}
