import { describe, expect, test } from "bun:test";

import {
  DEFAULT_TRADE_FORM,
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
      isTradeFormDirty({ ...DEFAULT_TRADE_FORM, confluenceScore: 5 })
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
      confluenceScore: 4,
      ticker: "MES",
    };
    expect(isTradeFormDirty(custom, custom)).toBe(false);
  });
});
