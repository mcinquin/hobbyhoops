import {
  parseCollectionSearchParams,
  type CollectionListQuery,
  type CollectionTagValue,
} from "./collection-query";

/** A "hit": a combination of collection filters collectors value. */
interface CollectionHit {
  id: "rpa" | "rcAuto" | "numberedAuto" | "oneOfOne" | "upTo10";
  tags: CollectionTagValue[];
  /** Minimum print run (`serial_total`), inclusive. */
  serialMin?: number;
  /** Maximum print run (`serial_total`), inclusive. */
  serialMax?: number;
}

/**
 * Dashboard hits. Each one is a collection filter, so the tile count and its
 * drill-down always select the same cards.
 */
export const COLLECTION_HITS = [
  { id: "rpa", tags: ["rookie", "autograph", "memorabilia"] },
  { id: "rcAuto", tags: ["rookie", "autograph"] },
  { id: "numberedAuto", tags: ["autograph", "numbered"] },
  { id: "oneOfOne", tags: [], serialMin: 1, serialMax: 1 },
  // 1/1 have their own tile: this one starts at /2.
  { id: "upTo10", tags: [], serialMin: 2, serialMax: 10 },
] as const satisfies readonly CollectionHit[];

export type CollectionHitId = (typeof COLLECTION_HITS)[number]["id"];

/** Collection query of a hit (defaults for every other filter). */
export function hitCollectionQuery(hit: CollectionHit): CollectionListQuery {
  return {
    ...parseCollectionSearchParams(new URLSearchParams()),
    tags: [...hit.tags],
    serialMin: hit.serialMin ?? null,
    serialMax: hit.serialMax ?? null,
  };
}

/** Collection URL filtered on a hit (`tag=…` params, plus `serialMin` / `serialMax`). */
export function hitCollectionHref(hit: CollectionHit): string {
  const params = new URLSearchParams();
  for (const tag of hit.tags) params.append("tag", tag);
  if (hit.serialMin != null) params.set("serialMin", String(hit.serialMin));
  if (hit.serialMax != null) params.set("serialMax", String(hit.serialMax));
  return `/collection?${params.toString()}`;
}
