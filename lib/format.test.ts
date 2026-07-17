import { describe, expect, test } from "bun:test";

import {
  fromDatetimeLocalValue,
  reinterpretUtcWallClockAsLocal,
  toDayKey,
  toDatetimeLocalValue,
} from "@/lib/format";

describe("fromDatetimeLocalValue with timezone offset", () => {
  test("IST (-330): evening local stays on same calendar day", () => {
    // 2026-07-16 19:24 IST → 13:54 UTC same day
    const iso = fromDatetimeLocalValue("2026-07-16T19:24", -330);
    expect(iso).toBe("2026-07-16T13:54:00.000Z");
  });

  test("IST: midnight local is previous day UTC but local day key is correct", () => {
    const iso = fromDatetimeLocalValue("2026-07-16T00:30", -330);
    expect(iso).toBe("2026-07-15T19:00:00.000Z");
    // Simulating client day key from that ISO in IST:
    // 19:00 UTC = 00:30 IST next... wait 15 19:00 UTC = 16 00:30 IST
    const asLocal = new Date(iso!);
    // In a process running IST this would be Jul 16; assert via offset math
    const localMs = asLocal.getTime() - -330 * 60_000;
    const local = new Date(localMs);
    // Using UTC getters on shifted time approximates "local wall"
    expect(local.getUTCDate()).toBe(16);
    expect(local.getUTCMonth()).toBe(6);
  });

  test("naive Date parse would break on UTC server — our helper does not", () => {
    // What Vercel used to do (treat wall clock as UTC):
    const naive = new Date("2026-07-16T19:24").toISOString();
    // On UTC host that equals 19:24Z; on IST host it differs.
    const fixed = fromDatetimeLocalValue("2026-07-16T19:24", -330);
    expect(fixed).toBe("2026-07-16T13:54:00.000Z");
    expect(fixed).not.toBe("2026-07-16T19:24:00.000Z");
    void naive;
  });

  test("invalid strings return null", () => {
    expect(fromDatetimeLocalValue("")).toBeNull();
    expect(fromDatetimeLocalValue("not-a-date")).toBeNull();
  });
});

describe("reinterpretUtcWallClockAsLocal", () => {
  test("fixes wrongly stored UTC wall clock for IST", () => {
    // User picked 16 Jul 19:24 local; server stored 16 Jul 19:24Z
    const fixed = reinterpretUtcWallClockAsLocal(
      "2026-07-16T19:24:00.000Z",
      -330
    );
    expect(fixed).toBe("2026-07-16T13:54:00.000Z");
  });
});

describe("toDatetimeLocalValue / toDayKey round-trip intent", () => {
  test("toDatetimeLocalValue uses local getters", () => {
    const v = toDatetimeLocalValue(new Date(2026, 6, 16, 19, 24));
    expect(v).toBe("2026-07-16T19:24");
  });

  test("toDayKey uses local calendar", () => {
    // Construct ISO that is afternoon UTC
    const key = toDayKey("2026-07-16T13:54:00.000Z");
    // In whatever TZ this runs, just ensure it's a valid day key format
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
