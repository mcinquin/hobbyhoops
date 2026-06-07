import { describe, expect, it } from "vitest";
import {
  createEmptyReferences,
  syncCardAttributeReferences,
  syncReferencesFromCard,
} from "./reference-mutations";
import type { References } from "./types";

function emptyRefs(): References {
  return createEmptyReferences();
}

describe("syncCardAttributeReferences", () => {
  it("adds grading company, protection and storage from card values", () => {
    const refs = emptyRefs();
    syncCardAttributeReferences(refs, {
      grading: 'PSA, 10',
      protection: "Sleeve",
      storage: "Trade - Sleeve Binder",
    });

    expect(refs.gradings).toContain("PSA");
    expect(refs.protections).toEqual(["Sleeve"]);
    expect(refs.storages).toEqual(["Trade - Sleeve Binder"]);
  });

  it("ignores empty protection and storage", () => {
    const refs = emptyRefs();
    syncCardAttributeReferences(refs, {
      grading: "Ungraded",
      protection: "  ",
      storage: "",
    });

    expect(refs.gradings).toContain("Ungraded");
    expect(refs.protections).toEqual([]);
    expect(refs.storages).toEqual([]);
  });
});

describe("syncReferencesFromCard", () => {
  it("syncs card attributes together with player metadata", () => {
    const refs = emptyRefs();
    syncReferencesFromCard(refs, {
      player: "LeBron James",
      team: "Lakers",
      year: "2024",
      brand: "Panini",
      set: "Prizm",
      variation: "Base",
      grading: "BGS, 9.5",
      protection: "Toploader",
      storage: "Personal Box",
    });

    expect(refs.players).toContain("LeBron James");
    expect(refs.gradings).toContain("BGS");
    expect(refs.protections).toContain("Toploader");
    expect(refs.storages).toContain("Personal Box");
  });
});
