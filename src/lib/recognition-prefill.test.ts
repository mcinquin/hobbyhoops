import { describe, expect, it } from "vitest";
import type { CardRecognitionSuggestion } from "./card-recognition/types";
import { applyRecognitionSuggestion } from "./recognition-prefill";

const suggestion: CardRecognitionSuggestion = {
  player: "LeBron James",
  year: "2003-04",
  brand: "Topps",
  set: "Chrome",
  variation: "Refractor",
  cardNumber: "111",
  serialTotal: 99,
  rookie: true,
  autograph: false,
  memorabilia: true,
  confidence: "high",
  variationUncertain: false,
  warnings: [],
  matched: { player: true, year: true, brand: true, set: true, variation: false },
};

describe("applyRecognitionSuggestion", () => {
  it("fills every empty field and lists them in display order", () => {
    const { form, applied } = applyRecognitionSuggestion(
      { player: "", serialNumber: null, rookie: false },
      suggestion
    );
    expect(form).toMatchObject({
      player: "LeBron James",
      year: "2003-04",
      brand: "Topps",
      set: "Chrome",
      variation: "Refractor",
      cardNumber: "111",
      serialNumber: "/99",
      rookie: true,
      memorabilia: true,
    });
    expect(applied).toEqual([
      "player",
      "year",
      "brand",
      "set",
      "variation",
      "cardNumber",
      "serialNumber",
      "rookie",
      "memorabilia",
    ]);
  });

  it("never overwrites a filled field", () => {
    const filled = {
      player: "Typed",
      year: "2020-21",
      brand: "Panini",
      set: "Prizm",
      variation: "Silver",
      cardNumber: "1",
      serialNumber: "12/25",
      rookie: true,
      memorabilia: true,
    };
    const { form, applied } = applyRecognitionSuggestion(filled, suggestion);
    expect(form).toEqual(filled);
    expect(applied).toEqual([]);
  });

  it("treats whitespace-only text as empty and skips blank suggestions", () => {
    const { form, applied } = applyRecognitionSuggestion(
      { player: "  ", brand: "Panini" },
      { ...suggestion, year: "", serialTotal: null, rookie: false, memorabilia: false }
    );
    expect(form.player).toBe("LeBron James");
    expect(form.brand).toBe("Panini");
    expect(applied).toEqual(["player", "set", "variation", "cardNumber"]);
  });

  it("does not mutate the input form", () => {
    const input = { player: "" };
    applyRecognitionSuggestion(input, suggestion);
    expect(input).toEqual({ player: "" });
  });
});
