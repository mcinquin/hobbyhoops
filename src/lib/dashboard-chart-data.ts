import type { Card, References } from "@/lib/types";

export type ChartCountDatum = { name: string; count: number };

/** Entrées affichables sur le dashboard (sans compteur à zéro). */
export function chartDataWithCards(data: ChartCountDatum[]): ChartCountDatum[] {
  return data.filter((entry) => entry.count > 0);
}

/** Fusionne les libellés de référence et les valeurs présentes sur les cartes. */
export function buildChartCountData(
  referenceNames: readonly string[],
  cards: Card[],
  getValue: (card: Card) => string | null | undefined
): ChartCountDatum[] {
  const counts: Record<string, number> = {};

  for (const card of cards) {
    const value = getValue(card)?.trim();
    if (!value) continue;
    counts[value] = (counts[value] ?? 0) + 1;
  }

  const names = new Set<string>();
  for (const name of referenceNames) {
    const trimmed = name.trim();
    if (trimmed) names.add(trimmed);
  }
  for (const name of Object.keys(counts)) {
    names.add(name);
  }

  return [...names].map((name) => ({
    name,
    count: counts[name] ?? 0,
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
