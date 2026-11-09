import { describe, expect, it } from "vitest";
import {
  addSet,
  addVariation,
  brandSetKey,
  createEmptyReferences,
  migrateSetVariationsToBrandScope,
  removeSet,
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
    expect(refs.setVariations[brandSetKey("Panini", "Prizm")]).toContain("Base");
  });
});

describe("brand-scoped set variations", () => {
  it("keeps Panini Hoops and Topps Hoops variation catalogs separate", () => {
    const refs = emptyRefs();
    addVariation(refs, "Panini", "Hoops", "Hyper Pink");
    addVariation(refs, "Topps", "Hoops", "Refractor");

    expect(refs.setVariations[brandSetKey("Panini", "Hoops")]).toEqual([
      "Hyper Pink",
    ]);
    expect(refs.setVariations[brandSetKey("Topps", "Hoops")]).toEqual([
      "Refractor",
    ]);
    expect(refs.sets).toEqual(["Hoops"]);
  });

  it("does not wipe the other brand when removing one Hoops set", () => {
    const refs = emptyRefs();
    addVariation(refs, "Panini", "Hoops", "Hyper Pink");
    addVariation(refs, "Topps", "Hoops", "Refractor");

    removeSet(refs, "Panini", "Hoops");

    expect(refs.brandSets.Panini).toBeUndefined();
    expect(refs.brandSets.Topps).toEqual(["Hoops"]);
    expect(refs.sets).toEqual(["Hoops"]);
    expect(refs.setVariations[brandSetKey("Panini", "Hoops")]).toBeUndefined();
    expect(refs.setVariations[brandSetKey("Topps", "Hoops")]).toEqual([
      "Refractor",
    ]);
    expect(refs.variations).toEqual(["Refractor"]);
  });

  it("migrates legacy set-only variation keys onto each owning brand", () => {
    const refs = emptyRefs();
    addSet(refs, "Panini", "Hoops");
    addSet(refs, "Topps", "Hoops");
    refs.setVariations = { Hoops: ["Base", "Silver"] };

    const changed = migrateSetVariationsToBrandScope(refs);
    expect(changed).toBe(true);
    expect(refs.setVariations.Hoops).toBeUndefined();
    expect(refs.setVariations[brandSetKey("Panini", "Hoops")]).toEqual([
      "Base",
      "Silver",
    ]);
    expect(refs.setVariations[brandSetKey("Topps", "Hoops")]).toEqual([
      "Base",
      "Silver",
    ]);
  });
});
