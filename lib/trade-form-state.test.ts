import { describe, expect, test } from "bun:test";

import { DEFAULT_CONFLUENCE_CHECKLIST } from "./confluence";
import {
  DEFAULT_TRADE_FORM,
  isChartStepComplete,
  isManagementStepComplete,
  isResultStepComplete,
  isTradeFormDirty,
  type TradeFormSnapshot,
} from "./trade-form-state";

describe("isTradeFormDirty", () => {
  test("pristine default is not dirty", () => {
    expect(isTradeFormDirty(DEFAULT_TRADE_FORM)).toBe(false);
  });

  test("whitespace-only notes does not count as dirty", () => {
    const state: TradeFormSnapshot = {
      ...DEFAULT_TRADE_FORM,
      notesText: "   \n  ",
    };
    expect(isTradeFormDirty(state)).toBe(false);
  });

  test("any field change marks dirty", () => {
    expect(isTradeFormDirty({ ...DEFAULT_TRADE_FORM, ticker: "MES" })).toBe(
      true
    );
    expect(isTradeFormDirty({ ...DEFAULT_TRADE_FORM, pnl: "10" })).toBe(true);
    expect(isTradeFormDirty({ ...DEFAULT_TRADE_FORM, positionSize: "2" })).toBe(
      true
    );
    expect(
      isTradeFormDirty({
        ...DEFAULT_TRADE_FORM,
        confluenceChecklist: {
          ...DEFAULT_CONFLUENCE_CHECKLIST,
          tempoTookIt: true,
        },
      })
    ).toBe(true);
    expect(isTradeFormDirty({ ...DEFAULT_TRADE_FORM, anxietyLevel: 8 })).toBe(
      true
    );
    expect(
      isTradeFormDirty({
        ...DEFAULT_TRADE_FORM,
        chartImage: "data:image/png;base64,abc",
      })
    ).toBe(true);
    expect(
      isTradeFormDirty({
        ...DEFAULT_TRADE_FORM,
        chartMode: "entry_exit",
      })
    ).toBe(true);
    expect(
      isTradeFormDirty({
        ...DEFAULT_TRADE_FORM,
        exitImage: "data:image/jpeg;base64,xyz",
      })
    ).toBe(true);
    expect(
      isTradeFormDirty({ ...DEFAULT_TRADE_FORM, notesText: "setup" })
    ).toBe(true);
    expect(
      isTradeFormDirty({
        ...DEFAULT_TRADE_FORM,
        voiceNote: "data:audio/webm;base64,xyz",
      })
    ).toBe(true);
    expect(
      isTradeFormDirty({ ...DEFAULT_TRADE_FORM, accountId: "lucid_b" })
    ).toBe(true);
    expect(
      isTradeFormDirty({ ...DEFAULT_TRADE_FORM, direction: "short" })
    ).toBe(true);
    expect(
      isTradeFormDirty({ ...DEFAULT_TRADE_FORM, exitOutcome: "sl_initial" })
    ).toBe(true);
  });

  test("matching custom defaults is not dirty", () => {
    const custom: TradeFormSnapshot = {
      ...DEFAULT_TRADE_FORM,
      anxietyLevel: 4,
      ticker: "MES",
    };
    expect(isTradeFormDirty(custom, custom)).toBe(false);
  });
});

describe("isChartStepComplete", () => {
  test("single mode needs only primary chart", () => {
    expect(
      isChartStepComplete({
        chartImage: null,
        chartMode: "single",
        exitImage: null,
      })
    ).toBe(false);
    expect(
      isChartStepComplete({
        chartImage: "data:image/png;base64,a",
        chartMode: "single",
        exitImage: null,
      })
    ).toBe(true);
  });

  test("entry_exit mode needs both images", () => {
    expect(
      isChartStepComplete({
        chartImage: "data:image/png;base64,a",
        chartMode: "entry_exit",
        exitImage: null,
      })
    ).toBe(false);
    expect(
      isChartStepComplete({
        chartImage: "data:image/png;base64,a",
        chartMode: "entry_exit",
        exitImage: "data:image/png;base64,b",
      })
    ).toBe(true);
  });
});

describe("result and management steps", () => {
  test("result needs direction pnl size and trade date", () => {
    expect(
      isResultStepComplete({
        direction: "long",
        pnl: "",
        positionSize: "1",
        tradeDate: "2026-07-14T10:00",
      })
    ).toBe(false);
    expect(
      isResultStepComplete({
        direction: "short",
        pnl: "10",
        positionSize: "2",
        tradeDate: "",
      })
    ).toBe(false);
    expect(
      isResultStepComplete({
        direction: "short",
        pnl: "10",
        positionSize: "2",
        tradeDate: "2026-07-14T10:00",
      })
    ).toBe(true);
  });

  test("full exit management is complete with outcome only", () => {
    expect(
      isManagementStepComplete({
        afterTp1Stop: null,
        exitOutcome: "full_tp",
        managementStyle: "full",
        tp1Contracts: "",
      })
    ).toBe(true);
  });

  test("partials path still valid without tp1 fields", () => {
    expect(
      isManagementStepComplete({
        afterTp1Stop: "breakeven",
        exitOutcome: "tp1_be_sl",
        managementStyle: "partials",
        tp1Contracts: "",
      })
    ).toBe(true);
  });
});
