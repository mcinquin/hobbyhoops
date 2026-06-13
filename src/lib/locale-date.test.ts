import { describe, expect, it } from "vitest";
import {
  formatIsoDateForInput,
  formatIsoDateLabel,
  parseDateInputToIso,
} from "./locale-date";

describe("parseDateInputToIso", () => {
  it("parses French slash dates", () => {
    expect(parseDateInputToIso("15/06/2025", "fr")).toBe("2025-06-15");
  });

  it("parses English slash dates", () => {
    expect(parseDateInputToIso("06/15/2025", "en")).toBe("2025-06-15");
  });

  it("accepts ISO input in any locale", () => {
    expect(parseDateInputToIso("2025-06-15", "en")).toBe("2025-06-15");
  });
});

describe("formatIsoDateLabel", () => {
  it("formats dates for French locale", () => {
    expect(formatIsoDateLabel("2025-06-15", "fr")).toBe("15/06/2025");
  });

  it("formats dates for English locale", () => {
    expect(formatIsoDateLabel("2025-06-15", "en")).toBe("06/15/2025");
  });
});

describe("formatIsoDateForInput", () => {
  it("returns empty string for missing values", () => {
    expect(formatIsoDateForInput(null, "fr")).toBe("");
  });
});
