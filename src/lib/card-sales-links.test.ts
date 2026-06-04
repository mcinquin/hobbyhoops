import { describe, expect, it } from "vitest";
import {
  buildCardMarketLinks,
  cardComparableSalesQuery,
  cardLadderSalesHistoryUrl,
  comcSearchUrl,
  ebaySoldListingsUrl,
  point130SoldUrl,
} from "./card-sales-links";
import type { CardListItem } from "./types";

const sampleCard: CardListItem = {
  id: "card-0001",
  player: "LeBron James",
  team: "Lakers",
  year: "2023",
  brand: "Panini",
  set: "Prizm",
  variation: "Silver",
  autograph: false,
  memorabilia: false,
  serialNumber: "10/99",
  serialCurrent: 10,
  serialTotal: 99,
  cardNumber: "23",
  grading: "PSA, 10",
  openingDate: "15/03/2024",
  protection: "",
  storage: "",
  tradable: false,
  rookie: false,
  notes: "",
};

describe("cardComparableSalesQuery", () => {
  it("includes player, set, serial and grading", () => {
    const query = cardComparableSalesQuery(sampleCard);
    expect(query).toContain("LeBron James");
    expect(query).toContain("Prizm");
    expect(query).toContain("10/99");
    expect(query).toContain("PSA, 10");
  });
});

describe("marketplace URLs", () => {
  const query = "LeBron James 2023 Prizm";

  it("builds eBay sold search URL", () => {
    expect(ebaySoldListingsUrl(query)).toContain("LH_Sold=1");
    expect(ebaySoldListingsUrl(query)).toContain(
      encodeURIComponent("LeBron James 2023 Prizm")
    );
  });

  it("builds 130point card sales URL", () => {
    expect(point130SoldUrl(query)).toBe(
      `https://130point.com/cards/?search=${encodeURIComponent(query)}`
    );
  });

  it("builds Card Ladder sales history URL", () => {
    expect(cardLadderSalesHistoryUrl(query)).toBe(
      `https://app.cardladder.com/sales-history?q=${encodeURIComponent(query)}`
    );
  });

  it("builds COMC search URL", () => {
    expect(comcSearchUrl(query)).toBe(
      `https://www.comc.com/Cards,=${encodeURIComponent(query)}`
    );
  });

  it("returns all market links for a card", () => {
    const links = buildCardMarketLinks(sampleCard);
    expect(links.map((link) => link.id)).toEqual([
      "ebay",
      "point130",
      "cardladder",
      "comc",
    ]);
    for (const link of links) {
      expect(link.href.startsWith("https://")).toBe(true);
    }
  });
});
