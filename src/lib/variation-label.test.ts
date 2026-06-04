import { describe, expect, it } from "vitest";
import { normalizeVariationLabel } from "./variation-label";

describe("normalizeVariationLabel", () => {
  it("fixes SIlver typo and collapses spaces", () => {
    expect(normalizeVariationLabel("Base SIlver Prizm")).toBe("Base Silver Prizm");
    expect(normalizeVariationLabel("RC HOOP la  Silver Prizm")).toBe(
      "RC HOOP la Silver Prizm"
    );
    expect(normalizeVariationLabel("Silver Prizm")).toBe("Silver Prizm");
  });
});
