import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { dateToDayKey, toDayKey } from "@/lib/format";
import type { DaySummary, Trade } from "@/lib/types";

export interface DayStats extends DaySummary {
  winRate: number;
}

export interface WeekStats {
  label: string;
  totalPnl: number;
  tradeCount: number;
  tradingDays: number;
  weekIndex: number;
}

export interface DashboardMetrics {
  avgAnxiety: number;
  avgConfluence: number;
  avgWinLossChangePct: number | null;
  avgWinLossRatio: number;
  // compass 0-100
  compass: {
    avgWinLoss: number;
    consistency: number;
    maxDrawdown: number;
    profitFactor: number;
    recovery: number;
    score: number;
    winRate: number;
  };
  equityCurve: { date: string; daily: number; cumulative: number }[];
  losers: number;
  // vs previous trading day
  pnlChangePct: number | null;
  profitFactor: number;
  profitFactorChangePct: number | null;
  totalPnl: number;
  totalTrades: number;
  winners: number;
  winRate: number;
  winRateChangePct: number | null;
}

interface ChangeMetrics {
  avgWinLossChangePct: number | null;
  pnlChangePct: number | null;
  profitFactorChangePct: number | null;
  winRateChangePct: number | null;
}

function groupByDay(trades: Trade[]): Map<string, Trade[]> {
  const map = new Map<string, Trade[]>();
  for (const trade of trades) {
    const key = toDayKey(trade.createdAt);
    const list = map.get(key) ?? [];
    list.push(trade);
    map.set(key, list);
  }
  return map;
}

export function computeDayStats(trades: Trade[]): Map<string, DayStats> {
  const byDay = groupByDay(trades);
  const map = new Map<string, DayStats>();

  for (const [dayKey, dayTrades] of byDay) {
    const winners = dayTrades.filter((t) => t.pnl > 0).length;
    const losers = dayTrades.filter((t) => t.pnl < 0).length;
    const totalPnl = dayTrades.reduce((s, t) => s + t.pnl, 0);
    const anxietySum = dayTrades.reduce((s, t) => s + t.anxietyLevel, 0);
    const tradeCount = dayTrades.length;

    map.set(dayKey, {
      avgAnxiety: tradeCount ? anxietySum / tradeCount : 0,
      dayKey,
      losers,
      totalPnl,
      tradeCount,
      winners,
      winRate: tradeCount ? (winners / tradeCount) * 100 : 0,
    });
  }

  return map;
}

export function buildMonthGrid(month: Date, dayStats: Map<string, DayStats>) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ end: gridEnd, start: gridStart }).map(
    (date) => {
      const dayKey = dateToDayKey(date);
      const stats = dayStats.get(dayKey) ?? null;
      return {
        date,
        dayKey,
        dayNumber: date.getDate(),
        inMonth: isSameMonth(date, month),
        stats,
      };
    }
  );

  // chunk into weeks of 7
  const weeks: (typeof days)[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const weekSummaries: WeekStats[] = weeks.map((week, index) => {
    const tradingDays = week.filter((d) => d.inMonth && d.stats);
    const totalPnl = tradingDays.reduce(
      (s, d) => s + (d.stats?.totalPnl ?? 0),
      0
    );
    const tradeCount = tradingDays.reduce(
      (s, d) => s + (d.stats?.tradeCount ?? 0),
      0
    );
    return {
      label: `Week ${index + 1}`,
      totalPnl,
      tradeCount,
      tradingDays: tradingDays.length,
      weekIndex: index + 1,
    };
  });

  return {
    monthLabel: format(month, "MMM yyyy"),
    weekSummaries,
    weeks,
  };
}

function grossWinsLosses(trades: Trade[]) {
  let grossWin = 0;
  let grossLoss = 0;
  for (const t of trades) {
    if (t.pnl > 0) {
      grossWin += t.pnl;
    }
    if (t.pnl < 0) {
      grossLoss += Math.abs(t.pnl);
    }
  }
  return { grossLoss, grossWin };
}

function avgWinAndLoss(trades: Trade[]) {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const avgWin = wins.length
    ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length
    : 0;
  const avgLoss = losses.length
    ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length)
    : 0;
  return { avgLoss, avgWin, ratio: ratioWithFallback(avgWin, avgLoss) };
}

function ratioWithFallback(numerator: number, denominator: number): number {
  if (denominator > 0) {
    return numerator / denominator;
  }
  if (numerator > 0) {
    return numerator;
  }
  return 0;
}

function percentChange(current: number, previous: number): number {
  if (previous !== 0) {
    return ((current - previous) / Math.abs(previous)) * 100;
  }
  return current === 0 ? 0 : 100;
}

function profitFactorForTrades(trades: Trade[]): number {
  const { grossLoss, grossWin } = grossWinsLosses(trades);
  return ratioWithFallback(grossWin, grossLoss);
}

function maxDrawdownPct(equity: number[]): number {
  if (equity.length === 0) {
    return 0;
  }
  const [firstValue] = equity;
  let peak = firstValue ?? 0;
  let maxDd = 0;
  for (const v of equity) {
    if (v > peak) {
      peak = v;
    }
    const dd = peak - v;
    if (dd > maxDd) {
      maxDd = dd;
    }
  }
  // score against peak magnitude; if flat, 0 drawdown
  if (peak <= 0) {
    return maxDd > 0 ? 100 : 0;
  }
  return Math.min(100, (maxDd / Math.max(peak, 1)) * 100);
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function computeChangeMetrics(
  sorted: Trade[],
  dayMap: Map<string, DayStats>,
  dayKeys: string[]
): ChangeMetrics {
  const last = dayKeys.at(-1);
  const prev = dayKeys.at(-2);
  if (!(last && prev)) {
    return {
      avgWinLossChangePct: null,
      pnlChangePct: null,
      profitFactorChangePct: null,
      winRateChangePct: null,
    };
  }

  const lastStats = dayMap.get(last);
  const prevStats = dayMap.get(prev);
  if (!(lastStats && prevStats)) {
    return {
      avgWinLossChangePct: null,
      pnlChangePct: null,
      profitFactorChangePct: null,
      winRateChangePct: null,
    };
  }

  const lastTrades = sorted.filter((t) => toDayKey(t.createdAt) === last);
  const prevTrades = sorted.filter((t) => toDayKey(t.createdAt) === prev);
  const lastPf = profitFactorForTrades(lastTrades);
  const prevPf = profitFactorForTrades(prevTrades);
  const lastRatio = avgWinAndLoss(lastTrades).ratio;
  const prevRatio = avgWinAndLoss(prevTrades).ratio;

  return {
    avgWinLossChangePct: percentChange(lastRatio, prevRatio),
    pnlChangePct: percentChange(lastStats.totalPnl, prevStats.totalPnl),
    profitFactorChangePct: percentChange(lastPf, prevPf),
    winRateChangePct: lastStats.winRate - prevStats.winRate,
  };
}

export function computeDashboardMetrics(trades: Trade[]): DashboardMetrics {
  const sorted = [...trades].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const winners = sorted.filter((t) => t.pnl > 0);
  const losers = sorted.filter((t) => t.pnl < 0);
  const totalPnl = sorted.reduce((s, t) => s + t.pnl, 0);
  const winRate = sorted.length ? (winners.length / sorted.length) * 100 : 0;
  const profitFactor = profitFactorForTrades(sorted);
  const { ratio: avgWinLossRatio } = avgWinAndLoss(sorted);
  const avgAnxiety = sorted.length
    ? sorted.reduce((s, t) => s + t.anxietyLevel, 0) / sorted.length
    : 0;
  const avgConfluence = sorted.length
    ? sorted.reduce((s, t) => s + t.confluenceScore, 0) / sorted.length
    : 0;

  // Equity curve by day
  const dayMap = computeDayStats(sorted);
  const dayKeys = [...dayMap.keys()].sort();
  let cumulative = 0;
  const equityCurve = dayKeys.map((dayKey) => {
    const daily = dayMap.get(dayKey)?.totalPnl ?? 0;
    cumulative += daily;
    return {
      cumulative,
      daily,
      date: dayKey,
    };
  });

  const {
    avgWinLossChangePct,
    pnlChangePct,
    profitFactorChangePct,
    winRateChangePct,
  } = computeChangeMetrics(sorted, dayMap, dayKeys);

  const equityValues = equityCurve.map((p) => p.cumulative);
  const ddPct = maxDrawdownPct(equityValues);

  // Compass component scores 0-100 (higher better)
  const winRateScore = clamp(winRate);
  const maxDrawdownScore = clamp(100 - ddPct); // lower DD is better
  // consistency: inverse of anxiety + win rate stability proxy
  const consistency = clamp(
    100 - avgAnxiety * 6 + Math.min(20, avgConfluence * 4)
  );
  const pfScore = clamp((Math.min(profitFactor, 3) / 3) * 100);
  const awlScore = clamp((Math.min(avgWinLossRatio, 3) / 3) * 100);
  // recovery: how well equity recovered from max DD
  const peak = Math.max(0, ...equityValues, 0);
  const end = equityValues.at(-1) ?? 0;
  let recovery = 50;
  if (peak > 0) {
    recovery = clamp((end / peak) * 100);
  } else if (end < 0) {
    recovery = 0;
  }

  const compassScore = Math.round(
    (winRateScore +
      maxDrawdownScore +
      consistency +
      pfScore +
      awlScore +
      recovery) /
      6
  );

  return {
    avgAnxiety,
    avgConfluence,
    avgWinLossChangePct,
    avgWinLossRatio,
    compass: {
      avgWinLoss: Math.round(awlScore),
      consistency: Math.round(consistency),
      maxDrawdown: Math.round(maxDrawdownScore),
      profitFactor: Math.round(pfScore),
      recovery: Math.round(recovery),
      score: compassScore,
      winRate: Math.round(winRateScore),
    },
    equityCurve,
    losers: losers.length,
    pnlChangePct,
    profitFactor,
    profitFactorChangePct,
    totalPnl,
    totalTrades: sorted.length,
    winners: winners.length,
    winRate,
    winRateChangePct,
  };
}
