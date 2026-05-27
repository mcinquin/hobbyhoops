import type { Card, CardsPageResult, References } from "@/lib/types";
import type { CollectionListQuery } from "@/lib/collection-query";

const FETCH_OPTS = {
  credentials: "include" as const,
  cache: "no-store" as const,
};

export function collectionQueryToSearchParams(
  query: CollectionListQuery
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
  params.set("pageSize", String(query.pageSize));
  if (query.sort !== "player") params.set("sort", query.sort);
  if (query.sortDesc) params.set("sortDir", "desc");
  return params;
}

export async function fetchCardsPage(
  query: CollectionListQuery
): Promise<CardsPageResult> {
  const params = collectionQueryToSearchParams(query);
  const res = await fetch(`/api/cards?${params.toString()}`, FETCH_OPTS);
  if (!res.ok) {
    throw new Error("Failed to load cards");
  }
  return (await res.json()) as CardsPageResult;
}

export interface AdminSnapshot {
  references: References;
  totalCount: number;
}

export async function fetchAdminSnapshot(): Promise<AdminSnapshot> {
  const res = await fetch("/api/admin/data", FETCH_OPTS);
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
