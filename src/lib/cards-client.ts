import type { Card } from "@/lib/types";
import type { CardsPageResult } from "@/lib/types";

const FETCH_OPTS = {
  credentials: "include" as const,
  cache: "no-store" as const,
};

export async function fetchCardsPage(
  params: URLSearchParams
): Promise<CardsPageResult> {
  const res = await fetch(`/api/cards?${params.toString()}`, FETCH_OPTS);
  if (!res.ok) {
    throw new Error("Failed to load cards");
  }
  return (await res.json()) as CardsPageResult;
}

export async function fetchAllCardsFromApi(): Promise<Card[]> {
  const all: Card[] = [];
  let page = 1;
  let pageCount = 1;
  const pageSize = 100;

  while (page <= pageCount) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    const data = await fetchCardsPage(params);
    all.push(...data.cards);
    pageCount = data.pageCount;
    page += 1;
  }

  return all;
}
