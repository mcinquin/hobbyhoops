import { describe, expect, it } from "vitest";
import {
  buildPrintRunTierData,
  buildSetChartData,
  PRINT_RUN_TIERS,
  printRunCollectionHref,
  printRunTierLabel,
  serialPositionCollectionHref,
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

describe("buildPrintRunTierData", () => {
  it("buckets print runs into inclusive tiers, zero tiers included", () => {
    const tiers = buildPrintRunTierData([
      { serialTotal: 1, count: 2 },
      { serialTotal: 5, count: 1 },
      { serialTotal: 10, count: 3 },
      { serialTotal: 25, count: 4 },
      { serialTotal: 99, count: 7 },
      { serialTotal: 199, count: 1 },
      { serialTotal: 200, count: 2 },
      { serialTotal: 5000, count: 1 },
    ]);
    expect(tiers.map((row) => [row.tier, row.count])).toEqual([
      ["oneOfOne", 2],
      ["upTo10", 4],
      ["upTo25", 4],
      ["upTo99", 7],
      ["upTo199", 1],
      ["over199", 3],
    ]);
    expect(buildPrintRunTierData([]).every((row) => row.count === 0)).toBe(true);
  });

  it("covers every print run exactly once", () => {
    for (let total = 1; total <= 1000; total += 1) {
      const matches = PRINT_RUN_TIERS.filter(
        ({ min, max }) => total >= min && (max === null || total <= max)
      );
      expect(matches).toHaveLength(1);
    }
  });
});

describe("print-run drill-down", () => {
  it("links each tier to the matching collection filter", () => {
    for (const tier of PRINT_RUN_TIERS) {
      const href = printRunCollectionHref(tier);
      const query = parseCollectionSearchParams(
        new URL(href, "http://localhost").searchParams
      );
      expect(query.serialMin).toBe(tier.min);
      expect(query.serialMax).toBe(tier.max);
    }
  });

  it("links the special serial tiles", () => {
    const query = parseCollectionSearchParams(
      new URL(serialPositionCollectionHref("last"), "http://localhost").searchParams
    );
    expect(query.serialPosition).toBe("last");
  });

  it("labels the tiers", () => {
    expect(PRINT_RUN_TIERS.map(printRunTierLabel)).toEqual([
      "1/1",
      "≤ /10",
      "≤ /25",
      "≤ /99",
      "≤ /199",
      "> /199",
    ]);
  });
});
