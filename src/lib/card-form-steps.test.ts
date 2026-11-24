import { describe, expect, it } from "vitest";
import {
  CARD_FORM_STEP_FIELDS,
  CARD_FORM_STEPS,
  stepOfField,
  validateCardForm,
  validateCardFormStep,
} from "@/lib/card-form-steps";
import { cardCreateSchema } from "@/lib/card-schema";

describe("CARD_FORM_STEP_FIELDS", () => {
  it("puts every card field on exactly one step", () => {
    const assigned = CARD_FORM_STEPS.flatMap((step) => CARD_FORM_STEP_FIELDS[step]);
    expect(new Set(assigned).size).toBe(assigned.length);
    expect([...assigned].sort()).toEqual(Object.keys(cardCreateSchema.shape).sort());
  });

  it("locates a field on its step", () => {
    expect(stepOfField("player")).toBe("identity");
    expect(stepOfField("serialNumber")).toBe("catalog");
    expect(stepOfField("notes")).toBe("condition");
  });
});

describe("validateCardFormStep", () => {
  it("only checks the fields of the current step", () => {
    const form = { player: "", year: "not a year" };
    expect(validateCardFormStep("photos", form, "")).toBeNull();
    expect(validateCardFormStep("catalog", form, "")).toBeNull();
    expect(validateCardFormStep("identity", form, "")).toEqual({
      step: "identity",
      field: "player",
      messageKey: "errors.playerRequired",
    });
  });

  it("reuses the schema messages", () => {
    expect(validateCardFormStep("identity", { player: "A", year: "2004/5" }, "")).toEqual({
      step: "identity",
      field: "year",
      messageKey: "errors.yearInvalid",
    });
  });

  it("rejects a serial mangled by a spreadsheet on the catalog step", () => {
    expect(validateCardFormStep("catalog", { serialNumber: "45658" }, "")).toEqual({
      step: "catalog",
      field: "serialNumber",
      messageKey: "errors.invalidSerialFormat",
    });
    expect(validateCardFormStep("catalog", { serialNumber: "12/99" }, "")).toBeNull();
  });

  it("flags over-long values without a dedicated message", () => {
    expect(validateCardFormStep("condition", { notes: "x".repeat(2001) }, "")).toEqual({
      step: "condition",
      field: "notes",
      messageKey: null,
    });
  });
});

describe("purchase price validation", () => {
  it("belongs to the condition step", () => {
    expect(stepOfField("purchasePriceCents")).toBe("condition");
    expect(stepOfField("purchaseCurrency")).toBe("condition");
  });

  it("rejects an unparseable amount on the condition step", () => {
    expect(
      validateCardFormStep("condition", { purchasePriceCents: Number.NaN }, "")
    ).toEqual({
      step: "condition",
      field: "purchasePriceCents",
      messageKey: "errors.purchasePriceInvalid",
    });
  });

  it("accepts a valid price or no price", () => {
    expect(
      validateCardFormStep(
        "condition",
        { purchasePriceCents: 1250, purchaseCurrency: "USD" },
        ""
      )
    ).toBeNull();
    expect(validateCardFormStep("condition", { purchasePriceCents: null }, "")).toBeNull();
  });

  it("rejects an invalid currency", () => {
    expect(
      validateCardFormStep(
        "condition",
        { purchasePriceCents: 1250, purchaseCurrency: "EURO" },
        ""
      )?.messageKey
    ).toBe("errors.purchaseCurrencyInvalid");
  });
});

describe("validateCardForm", () => {
  it("returns the first invalid step in order", () => {
    const error = validateCardForm({ player: "", serialNumber: "45658" }, "");
    expect(error?.step).toBe("identity");
  });

  it("accepts a minimal card", () => {
    expect(validateCardForm({ player: "LeBron James" }, "")).toBeNull();
  });
});
