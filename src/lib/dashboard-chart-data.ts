import type { References } from "./types";

export type ChartCountDatum = { name: string; count: number };

/** Entrées affichables sur le dashboard (sans compteur à zéro). */
export function chartDataWithCards(data: ChartCountDatum[]): ChartCountDatum[] {
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

/** Tous les sets connus dans les références (liste globale + sets par marque). */
export function referenceSetNames(references: References): string[] {
  const names = new Set<string>();
  for (const set of references.sets) {
    const trimmed = set.trim();
    if (trimmed) names.add(trimmed);
  }
  for (const sets of Object.values(references.brandSets)) {
    for (const set of sets) {
      const trimmed = set.trim();
      if (trimmed) names.add(trimmed);
    }
  }
  return [...names];
}
