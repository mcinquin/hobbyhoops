import type { CardListItem } from "@/lib/types";

export type MarketPlatformId = "ebay" | "point130" | "cardladder" | "comc";

export interface CardMarketLink {
  id: MarketPlatformId;
  href: string;
}

/** Mots-clés pour retrouver des ventes comparables sur les places de marché. */
export function cardComparableSalesQuery(card: CardListItem): string {
  return [
    card.player,
    card.year,
    card.brand,
    card.set,
    card.variation,
    card.serialNumber,
    card.cardNumber ? `#${card.cardNumber}` : "",
    card.grading && card.grading !== "Ungraded" ? card.grading : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function ebaySoldListingsUrl(searchQuery: string): string {
  const q = encodeURIComponent(searchQuery.trim() || "NBA trading card");
  return `https://www.ebay.com/sch/i.html?_nkw=${q}&_sacat=261328&LH_Sold=1&LH_Complete=1&_sop=13`;
}

/** Ventes terminées agrégées (eBay, Goldin, etc.). */
export function point130SoldUrl(searchQuery: string): string {
  const q = encodeURIComponent(searchQuery.trim() || "NBA trading card");
  return `https://130point.com/cards/?search=${q}`;
}

export function cardLadderSalesHistoryUrl(searchQuery: string): string {
  const q = encodeURIComponent(searchQuery.trim() || "NBA trading card");
  return `https://app.cardladder.com/sales-history?q=${q}`;
}

/** Annonces actives sur COMC (inventaire marketplace). */
export function comcSearchUrl(searchQuery: string): string {
  const term = (searchQuery.trim() || "NBA trading card").replace(/,/g, " ");
  return `https://www.comc.com/Cards,=${encodeURIComponent(term)}`;
}

export function buildCardMarketLinks(card: CardListItem): CardMarketLink[] {
  const query = cardComparableSalesQuery(card);
  return [
    { id: "ebay", href: ebaySoldListingsUrl(query) },
    { id: "point130", href: point130SoldUrl(query) },
    { id: "cardladder", href: cardLadderSalesHistoryUrl(query) },
    { id: "comc", href: comcSearchUrl(query) },
  ];
}
