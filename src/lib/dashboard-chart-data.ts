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

/** Raw card count for one print run (`serial_total`). */
export type PrintRunCountRow = { serialTotal: number; count: number };

/** Print-run tiers of the rarity chart: inclusive `serial_total` bounds (`max` null = open). */
export const PRINT_RUN_TIERS = [
  { id: "oneOfOne", min: 1, max: 1 },
  { id: "upTo10", min: 2, max: 10 },
  { id: "upTo25", min: 11, max: 25 },
  { id: "upTo99", min: 26, max: 99 },
  { id: "upTo199", min: 100, max: 199 },
  { id: "over199", min: 200, max: null },
] as const satisfies ReadonlyArray<{ id: string; min: number; max: number | null }>;

export type PrintRunTierId = (typeof PRINT_RUN_TIERS)[number]["id"];

/** Card count of one print-run tier, with its bounds for the collection drill-down. */
export type PrintRunTierRow = {
  tier: PrintRunTierId;
  min: number;
  max: number | null;
  count: number;
};

/** Buckets per-print-run counts into the rarity tiers (every tier listed, zero included). */
export function buildPrintRunTierData(
  rows: readonly PrintRunCountRow[]
): PrintRunTierRow[] {
  return PRINT_RUN_TIERS.map(({ id, min, max }) => ({
    tier: id,
    min,
    max,
    count: rows
      .filter(
        (row) => row.serialTotal >= min && (max === null || row.serialTotal <= max)
      )
      .reduce((sum, row) => sum + row.count, 0),
  }));
}

/** Collection URL filtered on a print-run range (`serialMin` / `serialMax`). */
export function printRunCollectionHref(range: { min: number; max: number | null }): string {
  const params = new URLSearchParams({ serialMin: String(range.min) });
  if (range.max !== null) params.set("serialMax", String(range.max));
  return `/collection?${params.toString()}`;
}

/** Collection URL filtered on the first (#1) or last (#N/N) serial of a run. */
export function serialPositionCollectionHref(position: "first" | "last"): string {
  return `/collection?${new URLSearchParams({ serialPosition: position }).toString()}`;
}

/** Axis label of a print-run tier, as on the issue: `1/1`, `≤ /10`, …, `> /199`. */
export function printRunTierLabel(row: { min: number; max: number | null }): string {
  if (row.max === 1) return "1/1";
  if (row.max === null) return `> /${row.min - 1}`;
  return `≤ /${row.max}`;
}
