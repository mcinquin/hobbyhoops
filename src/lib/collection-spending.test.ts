import { describe, expect, it } from "vitest";
import { buildCollectionSpending } from "./collection-spending";

describe("buildCollectionSpending", () => {
  it("returns an empty summary when no card has a price", () => {
    const spending = buildCollectionSpending(
      { totalCards: 3, groups: [], months: [] },
      "en"
    );
    expect(spending.currency).toBeNull();
    expect(spending.totals).toEqual([]);
    expect(spending.pricedCount).toBe(0);
    expect(spending.unpricedCount).toBe(3);
    expect(spending.averageCents).toBeNull();
  });

  it("keeps currencies apart and uses the most common one for breakdowns", () => {
    const spending = buildCollectionSpending(
      {
        totalCards: 10,
        groups: [
          { brand: "Panini", set: "Prizm", currency: "EUR", totalCents: 3000, count: 2 },
          { brand: "Panini", set: "Select", currency: "EUR", totalCents: 1000, count: 2 },
          { brand: "Topps", set: "Chrome", currency: "EUR", totalCents: 5000, count: 1 },
          { brand: "Topps", set: "Chrome", currency: "USD", totalCents: 9900, count: 1 },
        ],
        months: [
          { monthKey: 202402, currency: "EUR", totalCents: 4000 },
          { monthKey: 202401, currency: "EUR", totalCents: 5000 },
          { monthKey: 202401, currency: "USD", totalCents: 9900 },
        ],
      },
      "en"
    );

    expect(spending.currency).toBe("EUR");
    expect(spending.totals).toEqual([
      { currency: "EUR", totalCents: 9000, count: 5 },
      { currency: "USD", totalCents: 9900, count: 1 },
    ]);
    expect(spending.pricedCount).toBe(6);
    expect(spending.unpricedCount).toBe(4);
    expect(spending.averageCents).toBe(1800);
    expect(spending.monthly.map((row) => row.totalCents)).toEqual([5000, 4000]);
    expect(spending.byBrand).toEqual([
      { name: "Topps", averageCents: 5000, count: 1 },
      { name: "Panini", averageCents: 1000, count: 4 },
    ]);
    expect(spending.bySet[0]).toEqual({
      name: "Topps · Chrome",
      averageCents: 5000,
      count: 1,
    });
    expect(spending.bySet.map((row) => row.name)).toEqual([
      "Topps · Chrome",
      "Panini · Prizm",
      "Panini · Select",
    ]);
  });

  it("limits the average lists", () => {
    const groups = Array.from({ length: 12 }, (_, i) => ({
      brand: `Brand ${i}`,
      set: "",
      currency: "EUR",
      totalCents: 100 * (i + 1),
      count: 1,
    }));
    const spending = buildCollectionSpending(
      { totalCards: 12, groups, months: [] },
      "en",
      5
    );
    expect(spending.byBrand).toHaveLength(5);
    expect(spending.byBrand[0]?.name).toBe("Brand 11");
    expect(spending.bySet).toEqual([]);
  });
});
