import { describe, expect, it } from "vitest";
import type { RecognizedCard } from "@/lib/card-recognition/types";
import { buildCardSuggestion } from "@/lib/recognition-match";
import type { References } from "@/lib/types";

const references: References = {
  players: ["Victor Wembanyama", "Bilal Coulibaly"],
  teams: ["San Antonio Spurs"],
  years: ["2023-24", "2022-23"],
  brands: ["Panini", "Topps"],
  sets: ["Prizm", "Donruss"],
  brandSets: { Panini: ["Prizm", "Donruss"], Topps: [] },
  setVariations: { Prizm: ["Silver", "Emergent"] },
  variations: ["Silver", "Emergent", "Holo"],
  gradings: ["Ungraded"],
  protections: [],
  storages: [],
};

function recognized(overrides: Partial<RecognizedCard> = {}): RecognizedCard {
  return {
    player: "victor wembanyama",
    year: "2023",
    brand: "PANINI",
    set: "prizm",
    variation: "silver",
    cardNumber: "136",
    serialTotal: null,
    rookie: true,
    autograph: false,
    memorabilia: false,
    confidence: "high",
    variationUncertain: false,
    warnings: [],
    ...overrides,
  };
}

describe("buildCardSuggestion", () => {
  it("canonise joueur, marque, set et variation via les références", () => {
    const suggestion = buildCardSuggestion(recognized(), references);
    expect(suggestion.player).toBe("Victor Wembanyama");
    expect(suggestion.brand).toBe("Panini");
    expect(suggestion.set).toBe("Prizm");
    expect(suggestion.variation).toBe("Silver");
    expect(suggestion.matched).toEqual({
      player: true,
      year: true,
      brand: true,
      set: true,
      variation: true,
    });
  });

  it("mappe l'année 2023 sur le libellé 2023-24", () => {
    const suggestion = buildCardSuggestion(recognized({ year: "2023" }), references);
    expect(suggestion.year).toBe("2023-24");
    expect(suggestion.matched.year).toBe(true);
  });

  it("garde la valeur brute quand rien ne correspond", () => {
    const suggestion = buildCardSuggestion(
      recognized({
        player: "Rookie Inconnu",
        brand: "Upper Deck",
        set: "Exquisite",
        variation: "Gold Refractor",
        year: "1997",
      }),
      references
    );
    expect(suggestion.player).toBe("Rookie Inconnu");
    expect(suggestion.brand).toBe("Upper Deck");
    expect(suggestion.set).toBe("Exquisite");
    expect(suggestion.variation).toBe("Gold Refractor");
    expect(suggestion.year).toBe("1997");
    expect(suggestion.matched).toEqual({
      player: false,
      year: false,
      brand: false,
      set: false,
      variation: false,
    });
  });

  it("cherche le set hors de la marque si absent des sets liés", () => {
    const withDisjointBrand: References = {
      ...references,
      brandSets: { ...references.brandSets, Topps: ["Chrome"] },
      sets: ["Prizm", "Donruss", "Chrome"],
    };
    const suggestion = buildCardSuggestion(
      recognized({ brand: "Panini", set: "chrome" }),
      withDisjointBrand
    );
    expect(suggestion.set).toBe("Chrome");
    expect(suggestion.matched.set).toBe(true);
  });

  it("ne matche pas une année sur un simple préfixe numérique", () => {
    const suggestion = buildCardSuggestion(recognized({ year: "202" }), references);
    expect(suggestion.year).toBe("202");
    expect(suggestion.matched.year).toBe(false);
  });

  it("préserve les champs non textuels du résultat", () => {
    const suggestion = buildCardSuggestion(
      recognized({ serialTotal: 25, variationUncertain: true, confidence: "medium" }),
      references
    );
    expect(suggestion.serialTotal).toBe(25);
    expect(suggestion.variationUncertain).toBe(true);
    expect(suggestion.confidence).toBe("medium");
    expect(suggestion.rookie).toBe(true);
  });
});
