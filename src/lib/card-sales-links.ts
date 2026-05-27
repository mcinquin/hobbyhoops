import type { CardListItem } from "@/lib/types";

/** Mots-clés pour retrouver des ventes comparables sur eBay. */
export function cardComparableSalesQuery(card: CardListItem): string {
  return [
    card.player,
    card.year,
    card.brand,
    card.set,
    card.variation,
    card.cardNumber ? `#${card.cardNumber}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function ebaySoldListingsUrl(searchQuery: string): string {
  const q = encodeURIComponent(searchQuery.trim() || "NBA trading card");
  return `https://www.ebay.com/sch/i.html?_nkw=${q}&_sacat=261328&LH_Sold=1&LH_Complete=1&_sop=13`;
}

export const EBAY_SALES_HUB_URL =
  "https://www.ebay.com/sch/i.html?_nkw=NBA+trading+cards&_sacat=261328&LH_Sold=1&LH_Complete=1&_sop=13";
