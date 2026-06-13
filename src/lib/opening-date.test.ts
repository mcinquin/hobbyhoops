import { describe, expect, it } from "vitest";
import {
  formatOpeningDateForInput,
  formatOpeningDateLabel,
  normalizeOpeningDate,
  parseOpeningDateInput,
} from "./opening-date";

describe("normalizeOpeningDate", () => {
  it("accepts French dates", () => {
    expect(normalizeOpeningDate("15/03/2024")).toBe("15/03/2024");
  });

  it("accepts ISO dates", () => {
    expect(normalizeOpeningDate("2024-03-15")).toBe("15/03/2024");
  });

  it("rejects invalid dates", () => {
    expect(normalizeOpeningDate("31/02/2025")).toBeNull();
  });
});

describe("formatOpeningDateLabel", () => {
  it("formats dates for French locale", () => {
    expect(formatOpeningDateLabel("15/03/2024", "fr")).toBe("15/03/2024");
  });

  it("formats dates for English locale", () => {
    expect(formatOpeningDateLabel("15/03/2024", "en")).toBe("03/15/2024");
  });
});

describe("parseOpeningDateInput", () => {
  it("parses French slash dates", () => {
    expect(parseOpeningDateInput("15/03/2024", "fr")).toBe("15/03/2024");
  });

  it("parses English slash dates", () => {
    expect(parseOpeningDateInput("03/15/2024", "en")).toBe("15/03/2024");
  });
});

describe("formatOpeningDateForInput", () => {
  it("returns empty string for missing values", () => {
    expect(formatOpeningDateForInput(null, "fr")).toBe("");
  });

  it("formats stored French dates for English input", () => {
    expect(formatOpeningDateForInput("15/03/2024", "en")).toBe("03/15/2024");
  });
});
