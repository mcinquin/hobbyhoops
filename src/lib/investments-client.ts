import { API_FETCH_OPTS, parseApiErrorMessage } from "@/lib/api-fetch";
import type { CardValuation } from "@/lib/investment-portfolio";
import type { Card } from "@/lib/types";

function cardUrl(cardId: string, path: string): string {
  return `/api/cards/${encodeURIComponent(cardId)}/${path}`;
}

/** Client: readings of a card, latest first. */
export async function fetchCardValuations(cardId: string): Promise<CardValuation[]> {
  const res = await fetch(cardUrl(cardId, "valuations"), API_FETCH_OPTS);
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res, "Failed to load valuations"));
  }
  const data = (await res.json()) as { valuations: CardValuation[] };
  return data.valuations;
}

/** Client: adds a manual reading to a card. */
export async function createCardValuation(
  cardId: string,
  input: { valueCents: number; valuedAt: string; note: string }
): Promise<CardValuation> {
  const res = await fetch(cardUrl(cardId, "valuations"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...API_FETCH_OPTS,
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res, "Failed to save valuation"));
  }
  const data = (await res.json()) as { valuation: CardValuation };
  return data.valuation;
}

/** Client: removes a reading of a card. */
export async function deleteCardValuation(cardId: string, valuationId: number): Promise<void> {
  const params = new URLSearchParams({ valuationId: String(valuationId) });
  const res = await fetch(`${cardUrl(cardId, "valuations")}?${params.toString()}`, {
    method: "DELETE",
    ...API_FETCH_OPTS,
  });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res, "Failed to delete valuation"));
  }
}

/** Client: records the sale of a card. */
export async function recordCardSale(
  cardId: string,
  sale: { soldAt: string; salePriceCents: number; saleFeesCents: number | null }
): Promise<Card> {
  const res = await fetch(cardUrl(cardId, "sale"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    ...API_FETCH_OPTS,
    body: JSON.stringify(sale),
  });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res, "Failed to record sale"));
  }
  return (await res.json()) as Card;
}

/** Client: cancels the sale of a card. */
export async function cancelCardSale(cardId: string): Promise<Card> {
  const res = await fetch(cardUrl(cardId, "sale"), { method: "DELETE", ...API_FETCH_OPTS });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res, "Failed to cancel sale"));
  }
  return (await res.json()) as Card;
}
