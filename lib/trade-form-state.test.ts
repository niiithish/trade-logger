import { describe, expect, test } from "bun:test";

import { DEFAULT_CONFLUENCE_CHECKLIST } from "./confluence";
import {
  DEFAULT_TRADE_FORM,
  isChartStepComplete,
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
    expect(
      isChartStepComplete({
        chartImage: "data:image/png;base64,a",
        chartMode: "single",
        exitImage: "data:image/png;base64,b",
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
        chartImage: null,
        chartMode: "entry_exit",
        exitImage: "data:image/png;base64,b",
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
