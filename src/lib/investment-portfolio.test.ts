import { describe, expect, it } from "vitest";
import type { CardListItem } from "@/lib/types";
import {
  buildInvestmentHolding,
  buildInvestmentPortfolio,
  investmentCostCents,
  todayDateKey,
  type CardValuation,
} from "@/lib/investment-portfolio";

const TODAY = 20261124;

const card = (overrides: Partial<CardListItem> = {}): CardListItem => ({
  id: "card-0001",
  player: "Victor Wembanyama",
  team: "Spurs",
  year: "2023",
  brand: "Panini",
  set: "Prizm",
  variation: "Silver",
  autograph: false,
  memorabilia: false,
  serialNumber: null,
  serialCurrent: null,
  serialTotal: null,
  cardNumber: "136",
  grading: "PSA, 10",
  openingDate: "15/01/2026",
  protection: "",
  storage: "",
  tradable: false,
  rookie: true,
  wnba: false,
  notes: "",
  purchasePriceCents: 10000,
  purchaseCurrency: "EUR",
  investment: true,
  purchaseFeesCents: null,
  soldAt: null,
  salePriceCents: null,
  saleFeesCents: null,
  ...overrides,
});

let nextId = 1;
const valuation = (overrides: Partial<CardValuation> = {}): CardValuation => ({
  id: nextId++,
  cardId: "card-0001",
  valueCents: 15000,
  currency: "EUR",
  valuedAt: "2026-11-01",
  source: "manual",
  note: "",
  ...overrides,
});

describe("investmentCostCents", () => {
  it("adds the purchase fees to the price", () => {
    expect(investmentCostCents(card({ purchaseFeesCents: 450 }))).toBe(10450);
  });

  it("is unknown without a purchase price, even with fees", () => {
    expect(investmentCostCents(card({ purchasePriceCents: null, purchaseFeesCents: 450 }))).toBe(
      null
    );
  });
});

describe("buildInvestmentHolding", () => {
  it("computes the unrealized gain from the latest reading", () => {
    const holding = buildInvestmentHolding(
      card({ purchaseFeesCents: 2500 }),
      [
        valuation({ valueCents: 9000, valuedAt: "2026-03-01" }),
        valuation({ valueCents: 15000, valuedAt: "2026-11-01" }),
        valuation({ cardId: "card-0002", valueCents: 99999 }),
      ],
      TODAY
    );
    expect(holding.costCents).toBe(12500);
    expect(holding.latestValuation?.valueCents).toBe(15000);
    expect(holding.gainCents).toBe(2500);
    expect(holding.gainRatio).toBeCloseTo(0.2);
    expect(holding.isSold).toBe(false);
    expect(holding.isValuationStale).toBe(false);
    expect(holding.daysHeld).toBe(313);
  });

  it("ignores readings in another currency", () => {
    const holding = buildInvestmentHolding(
      card(),
      [valuation({ currency: "USD" })],
      TODAY
    );
    expect(holding.latestValuation).toBeNull();
    expect(holding.gainCents).toBeNull();
  });

  it("flags a reading older than 90 days", () => {
    const holding = buildInvestmentHolding(
      card(),
      [valuation({ valuedAt: "2026-08-01" })],
      TODAY
    );
    expect(holding.isValuationStale).toBe(true);
  });

  it("computes the realized gain of a sold card, net of every fee", () => {
    const holding = buildInvestmentHolding(
      card({
        purchaseFeesCents: 500,
        soldAt: "2026-02-14",
        salePriceCents: 14000,
        saleFeesCents: 1300,
      }),
      [valuation({ valuedAt: "2026-01-01" })],
      TODAY
    );
    expect(holding.isSold).toBe(true);
    expect(holding.netSaleCents).toBe(12700);
    expect(holding.gainCents).toBe(2200);
    expect(holding.daysHeld).toBe(30);
    expect(holding.isValuationStale).toBe(false);
  });

  it("has no ratio when the card cost nothing", () => {
    const holding = buildInvestmentHolding(
      card({ purchasePriceCents: 0 }),
      [valuation()],
      TODAY
    );
    expect(holding.gainCents).toBe(15000);
    expect(holding.gainRatio).toBeNull();
  });
});

describe("buildInvestmentPortfolio", () => {
  const cards = [
    card({ id: "held-valued", purchasePriceCents: 10000 }),
    card({ id: "held-unvalued", player: "Zion", purchasePriceCents: 5000 }),
    card({
      id: "sold",
      purchasePriceCents: 2000,
      soldAt: "2026-06-01",
      salePriceCents: 3000,
      saleFeesCents: 300,
    }),
    card({ id: "usd", purchasePriceCents: 8000, purchaseCurrency: "USD" }),
    card({ id: "unpriced", purchasePriceCents: null, purchaseCurrency: null }),
  ];
  const valuations = [
    valuation({ cardId: "held-valued", valueCents: 13000, valuedAt: "2026-10-01" }),
    valuation({ cardId: "usd", valueCents: 4000, currency: "USD" }),
  ];

  it("totals each currency separately, main currency first", () => {
    const portfolio = buildInvestmentPortfolio({ cards, valuations }, "fr", TODAY);
    expect(portfolio.currency).toBe("EUR");
    expect(portfolio.totals.map((totals) => totals.currency)).toEqual(["EUR", "USD"]);
    expect(portfolio.totals[0]).toMatchObject({
      investedCents: 15000,
      // The unvalued card counts at its cost.
      currentValueCents: 18000,
      unrealizedGainCents: 3000,
      soldCostCents: 2000,
      netSalesCents: 2700,
      realizedGainCents: 700,
      count: 3,
    });
    expect(portfolio.totals[1]).toMatchObject({
      investedCents: 8000,
      currentValueCents: 4000,
      unrealizedGainCents: -4000,
    });
  });

  it("splits held and sold cards and counts the missing data", () => {
    const portfolio = buildInvestmentPortfolio({ cards, valuations }, "fr", TODAY);
    expect(portfolio.held.map((holding) => holding.card.id)).toEqual([
      "held-valued",
      "usd",
      // No gain yet: sorted by player.
      "unpriced",
      "held-unvalued",
    ]);
    expect(portfolio.sold.map((holding) => holding.card.id)).toEqual(["sold"]);
    expect(portfolio.unvaluedCount).toBe(2);
    expect(portfolio.unpricedCount).toBe(1);
  });

  it("builds a month-end value history in the main currency", () => {
    const portfolio = buildInvestmentPortfolio(
      {
        cards: [
          card({ id: "a", openingDate: "10/09/2026", purchasePriceCents: 10000 }),
          card({
            id: "b",
            openingDate: "05/10/2026",
            purchasePriceCents: 2000,
            soldAt: "2026-11-02",
            salePriceCents: 2500,
          }),
        ],
        valuations: [valuation({ cardId: "a", valueCents: 12000, valuedAt: "2026-10-15" })],
      },
      "en",
      TODAY
    );
    expect(portfolio.history.map(({ valueCents, costCents }) => [valueCents, costCents])).toEqual([
      [10000, 10000],
      [14000, 12000],
      [12000, 10000],
    ]);
    expect(portfolio.history[0]?.name).toContain("2026");
  });

  it("is empty without investment cards", () => {
    const portfolio = buildInvestmentPortfolio({ cards: [], valuations: [] }, "fr", TODAY);
    expect(portfolio).toMatchObject({
      currency: null,
      totals: [],
      held: [],
      sold: [],
      history: [],
    });
  });
});

describe("todayDateKey", () => {
  it("formats a local date as YYYYMMDD", () => {
    expect(todayDateKey(new Date(2026, 0, 5))).toBe(20260105);
  });
});
