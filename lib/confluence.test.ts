import { describe, expect, test } from "bun:test";

import {
  DEFAULT_CONFLUENCE_CHECKLIST,
  MAX_CONFLUENCE_SCORE,
  parseConfluenceChecklist,
  scoreConfluence,
  serializeConfluenceChecklist,
  setSweptLiquidity,
  smtDivergenceLabel,
  toggleLiquiditySweepType,
  validateConfluenceChecklist,
} from "./confluence";

const WHICH_LIQUIDITY_RE = /which liquidity/i;

describe("scoreConfluence", () => {
  test("empty checklist is 0", () => {
    expect(scoreConfluence(DEFAULT_CONFLUENCE_CHECKLIST)).toBe(0);
  });

  test("swept liquidity needs a type to count", () => {
    expect(
      scoreConfluence({
        ...DEFAULT_CONFLUENCE_CHECKLIST,
        sweptLiquidity: true,
      })
    ).toBe(0);
    expect(
      scoreConfluence({
        ...DEFAULT_CONFLUENCE_CHECKLIST,
        sweptLiquidity: true,
        sweptLiquidityTypes: ["london_high"],
      })
    ).toBe(1);
  });

  test("all six items score max", () => {
    const full = {
      htfFvgBounce: true,
      ifvgMomentum: true,
      smtDivergence: true,
      sweptLiquidity: true,
      sweptLiquidityTypes: ["swing_1h", "asia_low"] as const,
      targetLiquidity: true,
      tempoTookIt: true,
    };
    expect(
      scoreConfluence({
        ...full,
        sweptLiquidityTypes: [...full.sweptLiquidityTypes],
      })
    ).toBe(MAX_CONFLUENCE_SCORE);
  });
});

describe("validateConfluenceChecklist", () => {
  test("errors when swept is on without types", () => {
    expect(
      validateConfluenceChecklist({
        ...DEFAULT_CONFLUENCE_CHECKLIST,
        sweptLiquidity: true,
      })
    ).toMatch(WHICH_LIQUIDITY_RE);
  });

  test("ok when types present or swept off", () => {
    expect(
      validateConfluenceChecklist(DEFAULT_CONFLUENCE_CHECKLIST)
    ).toBeNull();
    expect(
      validateConfluenceChecklist({
        ...DEFAULT_CONFLUENCE_CHECKLIST,
        sweptLiquidity: true,
        sweptLiquidityTypes: ["intraday"],
      })
    ).toBeNull();
  });
});

describe("serialize/parse", () => {
  test("round-trips", () => {
    const original = {
      ...DEFAULT_CONFLUENCE_CHECKLIST,
      smtDivergence: true,
      sweptLiquidity: true,
      sweptLiquidityTypes: ["london_low" as const],
      tempoTookIt: true,
    };
    const parsed = parseConfluenceChecklist(
      serializeConfluenceChecklist(original)
    );
    expect(parsed).toEqual(original);
  });

  test("invalid json returns null", () => {
    expect(parseConfluenceChecklist("not-json")).toBeNull();
    expect(parseConfluenceChecklist(null)).toBeNull();
  });
});

describe("helpers", () => {
  test("smt label flips with ticker", () => {
    expect(smtDivergenceLabel("MNQ")).toContain("MES");
    expect(smtDivergenceLabel("MES")).toContain("MNQ");
  });

  test("setSweptLiquidity clears types when off", () => {
    const withTypes = {
      ...DEFAULT_CONFLUENCE_CHECKLIST,
      sweptLiquidity: true,
      sweptLiquidityTypes: ["swing_4h" as const],
    };
    expect(setSweptLiquidity(withTypes, false).sweptLiquidityTypes).toEqual([]);
  });

  test("toggleLiquiditySweepType adds and removes", () => {
    const added = toggleLiquiditySweepType(
      DEFAULT_CONFLUENCE_CHECKLIST,
      "asia_high"
    );
    expect(added.sweptLiquidityTypes).toEqual(["asia_high"]);
    expect(added.sweptLiquidity).toBe(true);
    const removed = toggleLiquiditySweepType(added, "asia_high");
    expect(removed.sweptLiquidityTypes).toEqual([]);
  });
});
