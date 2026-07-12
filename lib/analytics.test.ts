import { describe, expect, test } from "bun:test";

import {
  breakdownByTicker,
  computePeriodPulse,
  filterTrades,
  filterTradesByAccount,
  filterTradesByDateRange,
  getDateRangeBounds,
  getWeekBounds,
  INSIGHT_MIN_TRADES,
  insightsFromTrades,
} from "@/lib/analytics";
import type { Trade } from "@/lib/types";

function makeTrade(
  partial: Partial<Trade> & Pick<Trade, "pnl" | "createdAt">
): Trade {
  return {
    accountId: "lucid_a",
    afterTp1Stop: null,
    anxietyLevel: 3,
    chartImage: "data:image/png;base64,x",
    confluenceChecklist: null,
    confluenceScore: 3,
    direction: "long",
    exitImage: null,
    exitOutcome: "full_tp",
    id: crypto.randomUUID(),
    managementStyle: "full",
    mistakeTags: [],
    notesText: "x",
    plannedR: null,
    positionSize: 1,
    realizedR: null,
    ticker: "MNQ",
    tp1Contracts: null,
    voiceNote: null,
    voiceNoteMime: null,
    ...partial,
  };
}

/** Fixed "now": Wednesday 2026-07-08 local noon. */
const NOW = new Date(2026, 6, 8, 12, 0, 0);

describe("week boundaries (Sunday start)", () => {
  test("this week is Sun Jul 5 – Sat Jul 11 around Jul 8", () => {
    const { start, end } = getWeekBounds(NOW, 0);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(6);
    expect(start.getDate()).toBe(5);
    expect(end.getDate()).toBe(11);
  });

  test("getDateRangeBounds this_week / last_week are adjacent", () => {
    const thisWeek = getDateRangeBounds("this_week", NOW);
    const lastWeek = getDateRangeBounds("last_week", NOW);
    expect(thisWeek.start?.getDate()).toBe(5);
    expect(lastWeek.start?.getDate()).toBe(28); // Jun 28
    expect(lastWeek.end?.getDate()).toBe(4); // Jul 4
  });
});

describe("filterTradesByDateRange", () => {
  test("assigns trades to this week vs last week correctly", () => {
    const trades = [
      makeTrade({
        createdAt: new Date(2026, 6, 6, 10).toISOString(),
        pnl: 100,
      }), // Mon this week
      makeTrade({
        createdAt: new Date(2026, 6, 1, 10).toISOString(),
        pnl: -50,
      }), // Wed last week
      makeTrade({
        createdAt: new Date(2026, 5, 20, 10).toISOString(),
        pnl: 10,
      }), // older
    ];
    const thisWeek = filterTradesByDateRange(trades, "this_week", NOW);
    const lastWeek = filterTradesByDateRange(trades, "last_week", NOW);
    expect(thisWeek).toHaveLength(1);
    expect(thisWeek[0]?.pnl).toBe(100);
    expect(lastWeek).toHaveLength(1);
    expect(lastWeek[0]?.pnl).toBe(-50);
  });
});

describe("account isolation", () => {
  test("filterTradesByAccount only includes matching account", () => {
    const trades = [
      makeTrade({
        accountId: "lucid_a",
        createdAt: NOW.toISOString(),
        pnl: 100,
      }),
      makeTrade({
        accountId: "lucid_b",
        createdAt: NOW.toISOString(),
        pnl: -200,
      }),
      makeTrade({
        accountId: null,
        createdAt: NOW.toISOString(),
        pnl: 5,
      }),
    ];
    const a = filterTradesByAccount(trades, "lucid_a");
    const b = filterTradesByAccount(trades, "lucid_b");
    const all = filterTradesByAccount(trades, "all");
    expect(a).toHaveLength(1);
    expect(a[0]?.pnl).toBe(100);
    expect(b).toHaveLength(1);
    expect(b[0]?.pnl).toBe(-200);
    expect(all).toHaveLength(3);
  });

  test("period pulse is account-scoped when pre-filtered", () => {
    const trades = [
      makeTrade({
        accountId: "lucid_a",
        createdAt: new Date(2026, 6, 6, 10).toISOString(),
        pnl: 200,
      }),
      makeTrade({
        accountId: "lucid_b",
        createdAt: new Date(2026, 6, 6, 11).toISOString(),
        pnl: -500,
      }),
      makeTrade({
        accountId: "lucid_a",
        createdAt: new Date(2026, 6, 1, 10).toISOString(),
        pnl: 50,
      }),
    ];
    const onlyA = filterTrades(trades, { account: "lucid_a" });
    const pulse = computePeriodPulse(onlyA, NOW);
    expect(pulse.thisWeek.totalPnl).toBe(200);
    expect(pulse.thisWeek.tradeCount).toBe(1);
    expect(pulse.lastWeek.totalPnl).toBe(50);
  });
});

describe("computePeriodPulse", () => {
  test("computes deltas between this week and last week", () => {
    const trades = [
      makeTrade({
        anxietyLevel: 2,
        createdAt: new Date(2026, 6, 7, 10).toISOString(),
        pnl: 100,
      }),
      makeTrade({
        anxietyLevel: 2,
        createdAt: new Date(2026, 6, 7, 11).toISOString(),
        pnl: 50,
      }),
      makeTrade({
        anxietyLevel: 5,
        createdAt: new Date(2026, 6, 2, 10).toISOString(),
        pnl: -20,
      }),
    ];
    const pulse = computePeriodPulse(trades, NOW);
    expect(pulse.thisWeek.totalPnl).toBe(150);
    expect(pulse.thisWeek.tradeCount).toBe(2);
    expect(pulse.thisWeek.winRate).toBe(100);
    expect(pulse.lastWeek.totalPnl).toBe(-20);
    expect(pulse.deltas.totalPnl).toBe(170);
    expect(pulse.deltas.tradeCount).toBe(1);
  });
});

describe("insights threshold", () => {
  test("suppresses insights below min-n", () => {
    const trades = Array.from({ length: INSIGHT_MIN_TRADES - 1 }, (_, i) =>
      makeTrade({
        confluenceScore: 5,
        createdAt: new Date(2026, 6, 1 + (i % 5), 10).toISOString(),
        pnl: i % 2 === 0 ? 50 : -30,
      })
    );
    expect(insightsFromTrades(trades)).toEqual([]);
  });

  test("emits insights at or above min-n when patterns exist", () => {
    const trades: Trade[] = [];
    for (const i of [0, 1, 2, 3, 4]) {
      trades.push(
        makeTrade({
          anxietyLevel: 2,
          confluenceScore: 5,
          createdAt: new Date(2026, 6, 1, 10 + i).toISOString(),
          direction: "long",
          pnl: 80,
        })
      );
    }
    for (const i of [0, 1, 2, 3, 4]) {
      trades.push(
        makeTrade({
          anxietyLevel: 8,
          confluenceScore: 1,
          createdAt: new Date(2026, 6, 2, 10 + i).toISOString(),
          direction: "short",
          pnl: -60,
        })
      );
    }
    const insights = insightsFromTrades(trades, 8);
    expect(insights.length).toBeGreaterThan(0);
    expect(
      insights.some((i) => i.kind === "strength" || i.kind === "weakness")
    ).toBe(true);
  });
});

describe("breakdownByTicker", () => {
  test("sums MNQ vs MES independently", () => {
    const trades = [
      makeTrade({ createdAt: NOW.toISOString(), pnl: 100, ticker: "MNQ" }),
      makeTrade({ createdAt: NOW.toISOString(), pnl: -40, ticker: "MES" }),
      makeTrade({ createdAt: NOW.toISOString(), pnl: 20, ticker: "MNQ" }),
    ];
    const rows = breakdownByTicker(trades);
    const mnq = rows.find((r) => r.id === "MNQ");
    const mes = rows.find((r) => r.id === "MES");
    expect(mnq?.totalPnl).toBe(120);
    expect(mnq?.tradeCount).toBe(2);
    expect(mes?.totalPnl).toBe(-40);
  });
});
