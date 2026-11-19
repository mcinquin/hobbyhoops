import type { References, SetChartCountRow } from "./types";
import { formatBrandSetLabel } from "./reference-mutations";

type ChartCountDatum = { name: string; count: number };

/** Entrées affichables sur le dashboard (sans compteur à zéro). */
export function chartDataWithCards<T extends ChartCountDatum>(data: T[]): T[] {
  return data.filter((entry) => entry.count > 0);
}

/** Fusionne les libellés de référence avec des comptages SQL pré-calculés. */
export function buildChartCountData(
  referenceNames: readonly string[],
  counts: readonly ChartCountDatum[]
): ChartCountDatum[] {
  const countMap = new Map<string, number>();
  for (const entry of counts) {
    const trimmed = entry.name.trim();
    if (!trimmed) continue;
    countMap.set(trimmed, entry.count);
  }

  const names = new Set<string>();
  for (const name of referenceNames) {
    const trimmed = name.trim();
    if (trimmed) names.add(trimmed);
  }
  for (const name of countMap.keys()) {
    names.add(name);
  }

  return [...names].map((name) => ({
    name,
    count: countMap.get(name) ?? 0,
  }));
}

/** Raw card count for one brand + set pair. */
export type BrandSetCountRow = { brand: string; set: string; count: number };

/** Tous les couples marque+set connus dans les références. */
export function referenceBrandSets(
  references: References
): { brand: string; set: string }[] {
  const pairs: { brand: string; set: string }[] = [];
  for (const [brand, sets] of Object.entries(references.brandSets)) {
    const brandName = brand.trim();
    if (!brandName) continue;
    for (const set of sets) {
      const setName = set.trim();
      if (setName) pairs.push({ brand: brandName, set: setName });
    }
  }
  return pairs;
}

/**
 * Merges the reference brand+set pairs with SQL counts. Each entry keeps the raw
 * `brand` / `set` (for collection filters) next to its `Brand · Set` display label.
 */
export function buildSetChartData(
  referencePairs: readonly { brand: string; set: string }[],
  counts: readonly BrandSetCountRow[]
): SetChartCountRow[] {
  const byLabel = new Map<string, SetChartCountRow>();
  for (const { brand, set } of referencePairs) {
    const name = formatBrandSetLabel(brand, set);
    if (name && !byLabel.has(name)) {
      byLabel.set(name, { name, brand: brand.trim(), set: set.trim(), count: 0 });
    }
  }
  for (const row of counts) {
    const brand = row.brand.trim();
    const set = row.set.trim();
    const name = formatBrandSetLabel(brand, set);
    if (!name) continue;
    const existing = byLabel.get(name);
    byLabel.set(name, {
      name,
      brand: existing?.brand ?? brand,
      set: existing?.set ?? set,
      count: (existing?.count ?? 0) + row.count,
    });
  }
  return [...byLabel.values()];
}

/** Collection URL filtered on one brand + set (the set filter requires its brand). */
export function setCollectionHref(entry: { brand: string; set: string }): string {
  const params = new URLSearchParams();
  if (entry.brand) params.set("brand", entry.brand);
  params.set("set", entry.set);
  return `/collection?${params.toString()}`;
}
