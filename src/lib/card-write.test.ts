import { describe, expect, it } from "vitest";
import { prepareCardWriteInput, validateCardSerialInput } from "./card-write";

describe("prepareCardWriteInput", () => {
  it("normalizes variation labels on write", () => {
    const payload = prepareCardWriteInput({
      player: "Test Player",
      variation: "Base SIlver Prizm",
    });
    expect(payload.variation).toBe("Base Silver Prizm");
  });
});

describe("validateCardSerialInput", () => {
  it("accepts empty and well-formed serials", () => {
    for (const value of [null, undefined, "", "  ", "12/99", "/25", "1 / 1", "SP"]) {
      expect(validateCardSerialInput(value)).toBeNull();
    }
  });

  it("rejects a serial turned into a spreadsheet date number", () => {
    expect(validateCardSerialInput("45658")).toBe("errors.invalidSerialFormat");
    expect(validateCardSerialInput(" 45658.5 ")).toBe("errors.invalidSerialFormat");
  });
});
