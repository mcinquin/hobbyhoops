import { API_FETCH_OPTS, parseApiErrorMessage } from "@/lib/api-fetch";
import {
  COLLECTION_PAGE_SIZE,
  type CollectionListQuery,
} from "@/lib/collection-query";
import type { Card, CardsPageResult, References } from "@/lib/types";

export function collectionQueryToSearchParams(
  query: CollectionListQuery,
  options?: { persistPageSize?: boolean }
): URLSearchParams {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  if (query.player) params.set("player", query.player);
  if (query.team) params.set("team", query.team);
  if (query.year) params.set("year", query.year);
  if (query.brand) params.set("brand", query.brand);
  if (query.set) params.set("set", query.set);
  if (query.variation) params.set("variation", query.variation);
  for (const tag of query.tags) {
    params.append("tag", tag);
  }
  if (query.page > 1) params.set("page", String(query.page));
  if (
    options?.persistPageSize ||
    query.pageSize !== COLLECTION_PAGE_SIZE
  ) {
    params.set("pageSize", String(query.pageSize));
  }
  if (query.sort !== "player") params.set("sort", query.sort);
  if (query.sortDesc) params.set("sortDir", "desc");
  return params;
}

export async function fetchCardsPage(
  query: CollectionListQuery
): Promise<CardsPageResult> {
  const params = collectionQueryToSearchParams(query);
  const res = await fetch(`/api/cards?${params.toString()}`, API_FETCH_OPTS);
  if (!res.ok) {
    throw new Error("Failed to load cards");
  }
  return (await res.json()) as CardsPageResult;
}

export interface AdminSnapshot {
  references: References;
  totalCount: number;
}

export async function createCard(card: Partial<Card>): Promise<Card> {
  const res = await fetch("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...API_FETCH_OPTS,
    body: JSON.stringify(card),
  });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res, "Failed to create card"));
  }
  return (await res.json()) as Card;
}

export async function updateCard(
  card: Partial<Card> & { id: string }
): Promise<Card> {
  const res = await fetch("/api/cards", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    ...API_FETCH_OPTS,
    body: JSON.stringify(card),
  });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res, "Failed to update card"));
  }
  return (await res.json()) as Card;
}

export async function deleteCard(id: string): Promise<void> {
  const res = await fetch(`/api/cards?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    ...API_FETCH_OPTS,
  });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res, "Failed to delete card"));
  }
}

export async function fetchAdminSnapshot(): Promise<AdminSnapshot> {
  const res = await fetch("/api/admin/data", API_FETCH_OPTS);
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    throw new Error("Failed to load admin data");
  }
  return (await res.json()) as AdminSnapshot;
}

export type { Card };
