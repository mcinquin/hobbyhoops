import { describe, expect, it } from "vitest";
import {
  buildSetChartData,
  referenceBrandSets,
  setCollectionHref,
} from "./dashboard-chart-data";
import { parseCollectionSearchParams } from "./collection-query";
import type { References } from "./types";

describe("referenceBrandSets", () => {
  it("lists trimmed brand + set pairs and skips blanks", () => {
    const references = {
      brandSets: { " Panini ": [" Prizm ", ""], "": ["Orphan"] },
    } as unknown as References;
    expect(referenceBrandSets(references)).toEqual([
      { brand: "Panini", set: "Prizm" },
    ]);
  });
});

describe("buildSetChartData", () => {
  it("keeps raw brand and set next to the display label", () => {
    const data = buildSetChartData(
      [
        { brand: "Panini", set: "Prizm" },
        { brand: "Topps", set: "Chrome" },
      ],
      [{ brand: "Panini", set: "Prizm", count: 3 }]
    );
    expect(data).toEqual([
      { name: "Panini · Prizm", brand: "Panini", set: "Prizm", count: 3 },
      { name: "Topps · Chrome", brand: "Topps", set: "Chrome", count: 0 },
    ]);
  });

  it("adds pairs found only in the cards", () => {
    const data = buildSetChartData(
      [],
      [{ brand: " Upper Deck ", set: " SP ", count: 2 }]
    );
    expect(data).toEqual([
      { name: "Upper Deck · SP", brand: "Upper Deck", set: "SP", count: 2 },
    ]);
  });
});

describe("setCollectionHref", () => {
  it("links to the collection filtered on both brand and set", () => {
    const href = setCollectionHref({ brand: "Panini", set: "Prizm" });
    const params = new URL(href, "http://localhost").searchParams;
    expect(href.startsWith("/collection?")).toBe(true);
    expect(parseCollectionSearchParams(params)).toMatchObject({
      brand: "Panini",
      set: "Prizm",
    });
  });

  it("encodes special characters", () => {
    const href = setCollectionHref({ brand: "Panini", set: "Hoops & Co" });
    expect(href).toBe("/collection?brand=Panini&set=Hoops+%26+Co");
  });
});
