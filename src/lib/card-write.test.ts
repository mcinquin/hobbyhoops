import { describe, expect, it } from "vitest";
import { prepareCardWriteInput } from "./card-write";

describe("prepareCardWriteInput", () => {
  it("normalizes variation labels on write", () => {
    const payload = prepareCardWriteInput({
      player: "Test Player",
      variation: "Base SIlver Prizm",
    });
    expect(payload.variation).toBe("Base Silver Prizm");
  });
});
