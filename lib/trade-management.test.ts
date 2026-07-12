import { describe, expect, test } from "bun:test";

import {
  isValidFullExitPath,
  validateTradeManagement,
} from "@/lib/trade-management";

const OUTCOME_RE = /outcome/i;
const STYLE_RE = /full exit|partials/i;
const TP1_RE = /TP1/i;

describe("validateTradeManagement", () => {
  test("full exit with outcome only is valid (optional partials path)", () => {
    expect(
      validateTradeManagement({
        exitOutcome: "full_tp",
        managementStyle: "full",
      })
    ).toBeNull();
    expect(isValidFullExitPath("full", "full_tp")).toBe(true);
    expect(
      validateTradeManagement({
        afterTp1Stop: null,
        exitOutcome: "sl_initial",
        managementStyle: "full",
        tp1Contracts: null,
      })
    ).toBeNull();
  });

  test("requires outcome and style", () => {
    expect(
      validateTradeManagement({
        exitOutcome: null,
        managementStyle: "full",
      })
    ).toMatch(OUTCOME_RE);
    expect(
      validateTradeManagement({
        exitOutcome: "full_tp",
        managementStyle: null,
      })
    ).toMatch(STYLE_RE);
  });

  test("partials allow optional tp1 size and after-TP1 stop", () => {
    expect(
      validateTradeManagement({
        afterTp1Stop: "breakeven",
        exitOutcome: "tp1_be_sl",
        managementStyle: "partials",
        tp1Contracts: 2,
      })
    ).toBeNull();
    expect(
      validateTradeManagement({
        exitOutcome: "tp1_then_sl",
        managementStyle: "partials",
      })
    ).toBeNull();
  });

  test("rejects non-positive tp1 contracts when set", () => {
    expect(
      validateTradeManagement({
        exitOutcome: "tp1_tp2",
        managementStyle: "partials",
        tp1Contracts: 0,
      })
    ).toMatch(TP1_RE);
  });
});
