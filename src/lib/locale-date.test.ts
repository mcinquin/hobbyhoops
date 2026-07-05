import { describe, expect, it } from "vitest";
import {
  autoFormatSlashedDateInput,
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

describe("autoFormatSlashedDateInput", () => {
  it("inserts slashes while typing digits", () => {
    expect(autoFormatSlashedDateInput("1")).toBe("1");
    expect(autoFormatSlashedDateInput("15", { appendTrailingSlash: true })).toBe(
      "15/"
    );
    expect(autoFormatSlashedDateInput("150")).toBe("15/0");
    expect(
      autoFormatSlashedDateInput("1506", { appendTrailingSlash: true })
    ).toBe("15/06/");
    expect(autoFormatSlashedDateInput("15062025")).toBe("15/06/2025");
  });

  it("reformats pasted values with separators", () => {
    expect(autoFormatSlashedDateInput("15/06/2025")).toBe("15/06/2025");
  });

  it("does not add trailing slash when deleting", () => {
    expect(autoFormatSlashedDateInput("15/0")).toBe("15/0");
    expect(autoFormatSlashedDateInput("15/")).toBe("15");
    expect(autoFormatSlashedDateInput("15")).toBe("15");
  });

  it("limits input to eight digits", () => {
    expect(autoFormatSlashedDateInput("150620251234")).toBe("15/06/2025");
  });
});
