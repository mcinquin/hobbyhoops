import { describe, expect, it } from "vitest";
import {
  formatCentsAsAmount,
  formatMoney,
  normalizeCurrency,
  parseAmountToCents,
} from "./money";

describe("parseAmountToCents", () => {
  it("parses dot and comma decimals", () => {
    expect(parseAmountToCents("12")).toBe(1200);
    expect(parseAmountToCents("12.5")).toBe(1250);
    expect(parseAmountToCents("12,50")).toBe(1250);
    expect(parseAmountToCents(" 1 299,99 ")).toBe(129_999);
    expect(parseAmountToCents("0.07")).toBe(7);
  });

  it("returns null for empty input", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("   ")).toBeNull();
    expect(parseAmountToCents(null)).toBeNull();
  });

  it("returns NaN for invalid amounts", () => {
    expect(parseAmountToCents("abc")).toBeNaN();
    expect(parseAmountToCents("-5")).toBeNaN();
    expect(parseAmountToCents("12.345")).toBeNaN();
    expect(parseAmountToCents("1e3")).toBeNaN();
  });
});

describe("formatCentsAsAmount", () => {
  it("formats cents as a plain decimal amount", () => {
    expect(formatCentsAsAmount(1250)).toBe("12.50");
    expect(formatCentsAsAmount(7)).toBe("0.07");
    expect(formatCentsAsAmount(null)).toBe("");
    expect(formatCentsAsAmount(Number.NaN)).toBe("");
  });

  it("round-trips with parseAmountToCents", () => {
    for (const cents of [0, 1, 99, 1250, 123_456]) {
      expect(parseAmountToCents(formatCentsAsAmount(cents))).toBe(cents);
    }
  });
});

describe("normalizeCurrency", () => {
  it("upper-cases and drops empty values", () => {
    expect(normalizeCurrency(" usd ")).toBe("USD");
    expect(normalizeCurrency("")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats with the currency symbol", () => {
    expect(formatMoney(1250, "USD", "en")).toBe("$12.50");
    expect(formatMoney(1250, "EUR", "fr")?.replace(/\s/g, " ")).toBe("12,50 €");
  });

  it("returns null without an amount", () => {
    expect(formatMoney(null, "EUR")).toBeNull();
  });

  it("defaults to EUR without a currency", () => {
    expect(formatMoney(100, null, "en")).toBe("€1.00");
  });
});
