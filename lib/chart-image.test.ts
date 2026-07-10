import { describe, expect, test } from "bun:test";

import {
  chartImageValidationError,
  isAllowedChartDataUrl,
  isAllowedChartMimeType,
} from "./chart-image";

describe("chart image helpers", () => {
  test("accepts png jpeg webp mime types", () => {
    expect(isAllowedChartMimeType("image/png")).toBe(true);
    expect(isAllowedChartMimeType("image/jpeg")).toBe(true);
    expect(isAllowedChartMimeType("image/webp")).toBe(true);
    expect(isAllowedChartMimeType("image/gif")).toBe(false);
  });

  test("accepts data URLs for supported formats", () => {
    expect(isAllowedChartDataUrl("data:image/png;base64,abc")).toBe(true);
    expect(isAllowedChartDataUrl("data:image/jpeg;base64,abc")).toBe(true);
    expect(isAllowedChartDataUrl("data:image/jpg;base64,abc")).toBe(true);
    expect(isAllowedChartDataUrl("data:image/webp;base64,abc")).toBe(true);
    expect(isAllowedChartDataUrl("data:image/gif;base64,abc")).toBe(false);
    expect(isAllowedChartDataUrl("not-an-image")).toBe(false);
  });

  test("validationError messages cover missing and invalid", () => {
    expect(chartImageValidationError("", "Entry chart image")).toContain(
      "required"
    );
    expect(
      chartImageValidationError("data:image/gif;base64,x", "Chart image")
    ).toContain("PNG, JPEG, or WebP");
    expect(
      chartImageValidationError("data:image/png;base64,ok", "Chart image")
    ).toBeNull();
  });
});
