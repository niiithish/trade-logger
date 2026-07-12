import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from "date-fns";

import type { AccountId } from "@/lib/accounts";
import { dateToDayKey, dayKeyToDate, toDayKey } from "@/lib/format";
import type {
  AccountFilter,
  DateRangePreset,
  DaySummary,
  Ticker,
  Trade,
} from "@/lib/types";

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

export interface PeriodSnapshot {
  avgAnxiety: number;
  label: string;
  totalPnl: number;
  tradeCount: number;
  winRate: number;
}

export interface PeriodPulse {
  deltas: {
    avgAnxiety: number | null;
    totalPnl: number | null;
    tradeCount: number | null;
    winRate: number | null;
  };
  lastWeek: PeriodSnapshot;
  thisWeek: PeriodSnapshot;
}

export interface TodayStrip {
  dayKey: string;
  totalPnl: number;
  tradeCount: number;
  winRate: number;
}

export interface BreakdownRow {
  avgPnl: number;
  id: string;
  label: string;
  totalPnl: number;
  tradeCount: number;
  winRate: number;
}

export interface TradeInsight {
  kind: "strength" | "weakness";
  text: string;
}

export interface DrawdownPoint {
  cumulative: number;
  date: string;
  drawdown: number;
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

/** Calendar weeks start on Sunday to match `buildMonthGrid`. */
export const WEEK_STARTS_ON = 0 as const;

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
  const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });

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

  const winRateScore = clamp(winRate);
  const maxDrawdownScore = clamp(100 - ddPct);
  const consistency = clamp(
    100 - avgAnxiety * 6 + Math.min(20, avgConfluence * 4)
  );
  const pfScore = clamp((Math.min(profitFactor, 3) / 3) * 100);
  const awlScore = clamp((Math.min(avgWinLossRatio, 3) / 3) * 100);
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

/** Filter trades by account (all = no filter). */
export function filterTradesByAccount(
  trades: Trade[],
  account: AccountFilter
): Trade[] {
  if (account === "all") {
    return trades;
  }
  return trades.filter((t) => t.accountId === account);
}

export function getWeekBounds(
  reference: Date,
  weekStartsOn: 0 | 1 = WEEK_STARTS_ON
): { end: Date; start: Date } {
  return {
    end: endOfWeek(reference, { weekStartsOn }),
    start: startOfWeek(reference, { weekStartsOn }),
  };
}

export function getDateRangeBounds(
  preset: DateRangePreset,
  now: Date = new Date()
): { end: Date | null; start: Date | null } {
  if (preset === "all") {
    return { end: null, start: null };
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  if (preset === "today") {
    return { end: todayEnd, start: todayStart };
  }

  if (preset === "mtd") {
    return { end: todayEnd, start: startOfMonth(now) };
  }

  if (preset === "this_week") {
    const { end, start } = getWeekBounds(now);
    return { end: end > todayEnd ? todayEnd : end, start };
  }

  // last_week
  const lastWeekRef = subWeeks(now, 1);
  return getWeekBounds(lastWeekRef);
}

export function filterTradesByDateRange(
  trades: Trade[],
  preset: DateRangePreset,
  now: Date = new Date()
): Trade[] {
  const { end, start } = getDateRangeBounds(preset, now);
  if (!(start && end)) {
    return trades;
  }
  const startMs = start.getTime();
  const endMs = end.getTime();
  return trades.filter((t) => {
    const ms = new Date(t.createdAt).getTime();
    return ms >= startMs && ms <= endMs;
  });
}

export function filterTrades(
  trades: Trade[],
  options: {
    account?: AccountFilter;
    dateRange?: DateRangePreset;
    direction?: "all" | "long" | "short";
    exitOutcome?: string | "all";
    now?: Date;
    ticker?: "all" | Ticker;
  }
): Trade[] {
  let result = trades;
  if (options.account) {
    result = filterTradesByAccount(result, options.account);
  }
  if (options.dateRange) {
    result = filterTradesByDateRange(result, options.dateRange, options.now);
  }
  if (options.ticker && options.ticker !== "all") {
    result = result.filter((t) => t.ticker === options.ticker);
  }
  if (options.direction && options.direction !== "all") {
    result = result.filter((t) => t.direction === options.direction);
  }
  if (options.exitOutcome && options.exitOutcome !== "all") {
    result = result.filter((t) => t.exitOutcome === options.exitOutcome);
  }
  return result;
}

function periodSnapshot(trades: Trade[], label: string): PeriodSnapshot {
  const tradeCount = trades.length;
  const winners = trades.filter((t) => t.pnl > 0).length;
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const avgAnxiety = tradeCount
    ? trades.reduce((s, t) => s + t.anxietyLevel, 0) / tradeCount
    : 0;
  return {
    avgAnxiety,
    label,
    totalPnl,
    tradeCount,
    winRate: tradeCount ? (winners / tradeCount) * 100 : 0,
  };
}

function deltaOrNull(current: number, previous: number, bothEmpty: boolean) {
  if (bothEmpty) {
    return null;
  }
  return current - previous;
}

/** This calendar week vs previous calendar week (Sun–Sat). */
export function computePeriodPulse(
  trades: Trade[],
  now: Date = new Date()
): PeriodPulse {
  const thisWeekTrades = filterTradesByDateRange(trades, "this_week", now);
  const lastWeekTrades = filterTradesByDateRange(trades, "last_week", now);
  const thisWeek = periodSnapshot(thisWeekTrades, "This week");
  const lastWeek = periodSnapshot(lastWeekTrades, "Last week");
  const bothEmpty = thisWeek.tradeCount === 0 && lastWeek.tradeCount === 0;

  return {
    deltas: {
      avgAnxiety: deltaOrNull(
        thisWeek.avgAnxiety,
        lastWeek.avgAnxiety,
        bothEmpty
      ),
      totalPnl: deltaOrNull(thisWeek.totalPnl, lastWeek.totalPnl, bothEmpty),
      tradeCount: deltaOrNull(
        thisWeek.tradeCount,
        lastWeek.tradeCount,
        bothEmpty
      ),
      winRate: deltaOrNull(thisWeek.winRate, lastWeek.winRate, bothEmpty),
    },
    lastWeek,
    thisWeek,
  };
}

export function computeTodayStrip(
  trades: Trade[],
  now: Date = new Date()
): TodayStrip {
  const dayKey = dateToDayKey(now);
  const todayTrades = trades.filter((t) => toDayKey(t.createdAt) === dayKey);
  const tradeCount = todayTrades.length;
  const winners = todayTrades.filter((t) => t.pnl > 0).length;
  return {
    dayKey,
    totalPnl: todayTrades.reduce((s, t) => s + t.pnl, 0),
    tradeCount,
    winRate: tradeCount ? (winners / tradeCount) * 100 : 0,
  };
}

function breakdownFromGroups(
  groups: Map<string, Trade[]>,
  labelFor: (id: string) => string
): BreakdownRow[] {
  const rows: BreakdownRow[] = [];
  for (const [id, group] of groups) {
    const tradeCount = group.length;
    const winners = group.filter((t) => t.pnl > 0).length;
    const totalPnl = group.reduce((s, t) => s + t.pnl, 0);
    rows.push({
      avgPnl: tradeCount ? totalPnl / tradeCount : 0,
      id,
      label: labelFor(id),
      totalPnl,
      tradeCount,
      winRate: tradeCount ? (winners / tradeCount) * 100 : 0,
    });
  }
  return rows.sort((a, b) => b.totalPnl - a.totalPnl);
}

export function breakdownByTicker(trades: Trade[]): BreakdownRow[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const list = map.get(t.ticker) ?? [];
    list.push(t);
    map.set(t.ticker, list);
  }
  // Ensure both instruments appear when empty filter still wants labels
  if (!map.has("MNQ")) {
    map.set("MNQ", []);
  }
  if (!map.has("MES")) {
    map.set("MES", []);
  }
  return breakdownFromGroups(map, (id) => id);
}

export function breakdownByDirection(trades: Trade[]): BreakdownRow[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const key = t.direction ?? "unknown";
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }
  return breakdownFromGroups(map, (id) => {
    if (id === "long") {
      return "Long";
    }
    if (id === "short") {
      return "Short";
    }
    return "Unknown";
  });
}

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function breakdownByWeekday(trades: Trade[]): BreakdownRow[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const day = dayKeyToDate(toDayKey(t.createdAt)).getDay();
    const key = String(day);
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }
  return breakdownFromGroups(
    map,
    (id) => WEEKDAY_LABELS[Number(id)] ?? id
  ).sort((a, b) => Number(a.id) - Number(b.id));
}

export function breakdownByConfluenceBand(trades: Trade[]): BreakdownRow[] {
  const map = new Map<string, Trade[]>([
    ["0-2", []],
    ["3-4", []],
    ["5-6", []],
  ]);
  for (const t of trades) {
    let band = "0-2";
    if (t.confluenceScore >= 5) {
      band = "5-6";
    } else if (t.confluenceScore >= 3) {
      band = "3-4";
    }
    map.get(band)?.push(t);
  }
  return breakdownFromGroups(map, (id) => `Confluence ${id}`);
}

export function breakdownByAnxietyBand(trades: Trade[]): BreakdownRow[] {
  const map = new Map<string, Trade[]>([
    ["calm", []],
    ["elevated", []],
    ["high", []],
  ]);
  for (const t of trades) {
    let band = "calm";
    if (t.anxietyLevel >= 7) {
      band = "high";
    } else if (t.anxietyLevel >= 4) {
      band = "elevated";
    }
    map.get(band)?.push(t);
  }
  return breakdownFromGroups(map, (id) => {
    if (id === "calm") {
      return "Calm (1–3)";
    }
    if (id === "elevated") {
      return "Elevated (4–6)";
    }
    return "High (7–10)";
  });
}

export function breakdownByExitOutcome(trades: Trade[]): BreakdownRow[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const key = t.exitOutcome ?? "unknown";
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }
  return breakdownFromGroups(map, (id) => id);
}

export function computeDrawdownSeries(trades: Trade[]): DrawdownPoint[] {
  const metrics = computeDashboardMetrics(trades);
  let peak = 0;
  return metrics.equityCurve.map((p) => {
    if (p.cumulative > peak) {
      peak = p.cumulative;
    }
    return {
      cumulative: p.cumulative,
      date: p.date,
      drawdown: peak - p.cumulative,
    };
  });
}

/** Minimum trades before rule-based insights are shown. */
export const INSIGHT_MIN_TRADES = 8;

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: multi-rule insight builder
export function insightsFromTrades(
  trades: Trade[],
  minN: number = INSIGHT_MIN_TRADES
): TradeInsight[] {
  if (trades.length < minN) {
    return [];
  }

  const insights: TradeInsight[] = [];
  const highConf = trades.filter((t) => t.confluenceScore >= 4);
  const lowConf = trades.filter((t) => t.confluenceScore <= 2);
  if (highConf.length >= 3 && lowConf.length >= 3) {
    const highWr =
      (highConf.filter((t) => t.pnl > 0).length / highConf.length) * 100;
    const lowWr =
      (lowConf.filter((t) => t.pnl > 0).length / lowConf.length) * 100;
    if (highWr > lowWr + 5) {
      insights.push({
        kind: "strength",
        text: `Higher confluence (≥4) wins ${highWr.toFixed(0)}% vs ${lowWr.toFixed(0)}% on low confluence — trust the checklist.`,
      });
    } else if (lowWr > highWr + 5) {
      insights.push({
        kind: "weakness",
        text: `Low-confluence trades are outperforming high-confluence setups (${lowWr.toFixed(0)}% vs ${highWr.toFixed(0)}%) — review what “high confluence” means in practice.`,
      });
    }
  }

  const highAnxiety = trades.filter((t) => t.anxietyLevel >= 7);
  if (highAnxiety.length >= 3) {
    const avg = highAnxiety.reduce((s, t) => s + t.pnl, 0) / highAnxiety.length;
    if (avg < 0) {
      insights.push({
        kind: "weakness",
        text: `Anxiety ≥7 averages ${avg.toFixed(0)} across ${highAnxiety.length} trades — size down when the Heart Rate Index is elevated.`,
      });
    }
  }

  const longs = trades.filter((t) => t.direction === "long");
  const shorts = trades.filter((t) => t.direction === "short");
  if (longs.length >= 3 && shorts.length >= 3) {
    const longExp = longs.reduce((s, t) => s + t.pnl, 0) / longs.length;
    const shortExp = shorts.reduce((s, t) => s + t.pnl, 0) / shorts.length;
    if (longExp > shortExp + 10) {
      insights.push({
        kind: "strength",
        text: `Long expectancy (${longExp.toFixed(0)}) beats short (${shortExp.toFixed(0)}) — bias size toward the stronger side.`,
      });
    } else if (shortExp > longExp + 10) {
      insights.push({
        kind: "strength",
        text: `Short expectancy (${shortExp.toFixed(0)}) beats long (${longExp.toFixed(0)}).`,
      });
    } else if (shortExp < 0 && longExp > 0) {
      insights.push({
        kind: "weakness",
        text: `Short side is leaking (${shortExp.toFixed(0)} avg) while longs are positive — review short management.`,
      });
    }
  }

  const beStops = trades.filter((t) => t.exitOutcome === "tp1_be_sl");
  if (beStops.length >= 3) {
    const avg = beStops.reduce((s, t) => s + t.pnl, 0) / beStops.length;
    insights.push({
      kind: avg >= 0 ? "strength" : "weakness",
      text: `After TP1 → BE: ${beStops.length} trades, avg ${avg >= 0 ? "+" : ""}${avg.toFixed(0)} — ${avg >= 0 ? "locking risk free is paying you" : "BE stops may be cutting winners early"}.`,
    });
  }

  const weekdays = breakdownByWeekday(trades).filter((r) => r.tradeCount >= 2);
  if (weekdays.length >= 2) {
    const best = weekdays.reduce((a, b) => (a.totalPnl >= b.totalPnl ? a : b));
    const worst = weekdays.reduce((a, b) => (a.totalPnl <= b.totalPnl ? a : b));
    if (best.id !== worst.id) {
      insights.push({
        kind: "strength",
        text: `Most profitable weekday: ${best.label} (${best.totalPnl >= 0 ? "+" : ""}${best.totalPnl.toFixed(0)}). Softest: ${worst.label}.`,
      });
    }
  }

  return insights.slice(0, 6);
}

export function evalProgressForAccount(
  trades: Trade[],
  accountId: AccountId,
  startingBalance: number,
  manualCurrentBalance: number | null
): {
  accountId: AccountId;
  loggedNetPnl: number;
  manualCurrentBalance: number | null;
  impliedBalance: number;
  startingBalance: number;
} {
  const accountTrades = trades.filter((t) => t.accountId === accountId);
  const loggedNetPnl = accountTrades.reduce((s, t) => s + t.pnl, 0);
  return {
    accountId,
    impliedBalance: startingBalance + loggedNetPnl,
    loggedNetPnl,
    manualCurrentBalance,
    startingBalance,
  };
}
