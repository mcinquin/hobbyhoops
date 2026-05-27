import type { References } from "@/lib/types";
import { uniqueSorted } from "@/lib/string-list";

/** Suggestions de sets pour filtres collection/admin (recherche partielle sur la marque). */
export function setsForBrandFilter(
  references: References,
  brandQuery: string
): string[] {
  const q = brandQuery.trim().toLowerCase();
  if (!q) return [];
  const sets = new Set<string>();
  for (const [brand, brandSets] of Object.entries(references.brandSets)) {
    if (brand.toLowerCase().includes(q)) {
      for (const setName of brandSets) sets.add(setName);
    }
  }
  return [...sets].sort((a, b) => a.localeCompare(b));
}

/** Suggestions de variations pour filtres collection/admin. */
export function variationsForFilters(
  references: References,
  brandQuery: string,
  setQuery: string
): string[] {
  const brandQ = brandQuery.trim().toLowerCase();
  const setQ = setQuery.trim().toLowerCase();
  const variations = new Set<string>();

  for (const [setName, setVars] of Object.entries(references.setVariations)) {
    const setMatch = !setQ || setName.toLowerCase().includes(setQ);
    if (!setMatch) continue;

    if (!brandQ) {
      for (const variation of setVars) variations.add(variation);
      continue;
    }

    const brandMatches = Object.entries(references.brandSets).some(
      ([brand, sets]) =>
        brand.toLowerCase().includes(brandQ) && sets.includes(setName)
    );
    if (brandMatches) {
      for (const variation of setVars) variations.add(variation);
    }
  }

  return [...variations].sort((a, b) => a.localeCompare(b));
}

/** Sets liés à une marque (formulaires : correspondance exacte ou partielle). */
export function setsLinkedToBrand(
  references: References,
  brand: string
): string[] {
  const query = brand.trim().toLowerCase();
  if (!query) return references.sets;

  const exactBrand = references.brands.find(
    (item) => item.toLowerCase() === query
  );
  if (exactBrand) {
    return references.brandSets[exactBrand] ?? [];
  }

  return uniqueSorted(
    references.brands
      .filter((item) => item.toLowerCase().includes(query))
      .flatMap((item) => references.brandSets[item] ?? [])
  );
}

/** Variations liées à un set (formulaires). */
export function variationsLinkedToSet(
  references: References,
  setName: string
): string[] {
  const query = setName.trim().toLowerCase();
  if (!query) return references.variations;

  const exactSet = references.sets.find((item) => item.toLowerCase() === query);
  if (exactSet) {
    return references.setVariations[exactSet] ?? [];
  }

  return uniqueSorted(
    references.sets
      .filter((item) => item.toLowerCase().includes(query))
      .flatMap((item) => references.setVariations[item] ?? [])
  );
}
