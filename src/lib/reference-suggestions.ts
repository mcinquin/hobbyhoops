import type { References, ReferencesFilterIndex } from "@/lib/types";

type ReferenceFilterSource = References | ReferencesFilterIndex;
import { uniqueSorted } from "@/lib/string-list";
import {
  brandSetKey,
  parseBrandSetKey,
} from "@/lib/reference-mutations";

/** Suggestions de sets pour filtres collection/admin (recherche partielle sur la marque). */
export function setsForBrandFilter(
  references: ReferenceFilterSource,
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
  references: ReferenceFilterSource,
  brandQuery: string,
  setQuery: string
): string[] {
  const brandQ = brandQuery.trim().toLowerCase();
  const setQ = setQuery.trim().toLowerCase();
  const variations = new Set<string>();

  for (const [key, setVars] of Object.entries(references.setVariations)) {
    const parsed = parseBrandSetKey(key);
    if (!parsed) continue;

    const setMatch = !setQ || parsed.set.toLowerCase().includes(setQ);
    if (!setMatch) continue;

    if (!brandQ) {
      for (const variation of setVars) variations.add(variation);
      continue;
    }

    if (parsed.brand.toLowerCase().includes(brandQ)) {
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

/** Variations liées à une marque + un set (formulaires). */
export function variationsLinkedToBrandSet(
  references: References,
  brand: string,
  setName: string
): string[] {
  const brandQuery = brand.trim().toLowerCase();
  const setQuery = setName.trim().toLowerCase();
  if (!setQuery) {
    if (!brandQuery) return references.variations;
    const variations = new Set<string>();
    for (const [key, list] of Object.entries(references.setVariations)) {
      const parsed = parseBrandSetKey(key);
      if (parsed && parsed.brand.toLowerCase().includes(brandQuery)) {
        for (const variation of list) variations.add(variation);
      }
    }
    return [...variations].sort((a, b) => a.localeCompare(b));
  }

  if (brandQuery) {
    const exactBrand = references.brands.find(
      (item) => item.toLowerCase() === brandQuery
    );
    if (exactBrand) {
      const exactSet = (references.brandSets[exactBrand] ?? []).find(
        (item) => item.toLowerCase() === setQuery
      );
      if (exactSet) {
        return references.setVariations[brandSetKey(exactBrand, exactSet)] ?? [];
      }
      return uniqueSorted(
        (references.brandSets[exactBrand] ?? [])
          .filter((item) => item.toLowerCase().includes(setQuery))
          .flatMap(
            (item) => references.setVariations[brandSetKey(exactBrand, item)] ?? []
          )
      );
    }

    const matchingBrands = references.brands.filter((item) =>
      item.toLowerCase().includes(brandQuery)
    );
    return uniqueSorted(
      matchingBrands.flatMap((brandName) => {
        const sets = references.brandSets[brandName] ?? [];
        const exactSet = sets.find((item) => item.toLowerCase() === setQuery);
        if (exactSet) {
          return references.setVariations[brandSetKey(brandName, exactSet)] ?? [];
        }
        return sets
          .filter((item) => item.toLowerCase().includes(setQuery))
          .flatMap(
            (item) => references.setVariations[brandSetKey(brandName, item)] ?? []
          );
      })
    );
  }

  return uniqueSorted(
    Object.entries(references.setVariations).flatMap(([key, list]) => {
      const parsed = parseBrandSetKey(key);
      if (!parsed) return [];
      if (parsed.set.toLowerCase() === setQuery) return list;
      if (parsed.set.toLowerCase().includes(setQuery)) return list;
      return [];
    })
  );
}
