import { References } from "./types";

export const LABEL_MAX = 160;

export const REFERENCE_YEAR_REGEX = /^(\d{4}|\d{4}-\d{2})$/;

/** Séparateur interne pour les clés marque+set (jamais affiché). */
export const BRAND_SET_KEY_SEP = "\u0000";

/** Valeurs initiales (grading, protection, rangement) injectées une fois en base. */
export const SEED_ATTRIBUTE_REFERENCES = {
  grading: ["Ungraded", "PSA", "SGC", "BGS", "CGC"],
  protection: ["Magnetic One-Touch", "Sleeve", "Toploader"],
  storage: [
    "Box",
    "Carbonite - Magnetic",
    "Carbonite - Trade",
    "Classeur",
    "Collection - Sleeve Binder",
    "Collection - Toploader Binder",
    "Magnetic Box",
    "Sleeve Box",
    "Toploader Box",
    "Trade - Sleeve Binder",
    "Trade - Toploader Binder",
    "Wizards",
  ],
} as const;

export function createEmptyReferences(): References {
  return {
    players: [],
    teams: [],
    years: [],
    brands: [],
    sets: [],
    brandSets: {},
    setVariations: {},
    variations: [],
    gradings: [],
    protections: [],
    storages: [],
  };
}

export function normYear(s: string): string | null {
  const label = normLabel(s);
  if (!label || !REFERENCE_YEAR_REGEX.test(label)) return null;
  return label;
}

export function uniqueYears(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const label = normYear(value);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

export function normLabel(s: string): string {
  return s.trim().slice(0, LABEL_MAX);
}

export function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const label = normLabel(value);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

export function brandSetKey(brand: string, set: string): string {
  return `${normLabel(brand)}${BRAND_SET_KEY_SEP}${normLabel(set)}`;
}

export function parseBrandSetKey(
  key: string
): { brand: string; set: string } | null {
  const sep = key.indexOf(BRAND_SET_KEY_SEP);
  if (sep <= 0 || sep >= key.length - 1) return null;
  return { brand: key.slice(0, sep), set: key.slice(sep + 1) };
}

export function formatBrandSetLabel(brand: string, set: string): string {
  const brandName = brand.trim();
  const setName = set.trim();
  if (brandName && setName) return `${brandName} · ${setName}`;
  return setName || brandName;
}

export function uniqueBrandSetEntries(
  entries: { brand: string; set: string }[]
): { brand: string; set: string }[] {
  const out: { brand: string; set: string }[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const brand = normLabel(entry.brand);
    const set = normLabel(entry.set);
    if (!brand || !set) continue;
    const key = brandSetKey(brand, set);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ brand, set });
  }
  return out;
}

export function uniqueBrandSetVariationEntries(
  entries: { brand: string; set: string; variation: string }[]
): { brand: string; set: string; variation: string }[] {
  const out: { brand: string; set: string; variation: string }[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const brand = normLabel(entry.brand);
    const set = normLabel(entry.set);
    const variation = normLabel(entry.variation);
    if (!brand || !set || !variation) continue;
    const key = `${brandSetKey(brand, set)}${BRAND_SET_KEY_SEP}${variation}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ brand, set, variation });
  }
  return out;
}

/** @deprecated Prefer uniqueBrandSetVariationEntries — kept for batch rows without brand. */
export function uniqueSetVariationEntries(
  entries: { set: string; variation: string; brand?: string }[]
): { brand: string; set: string; variation: string }[] {
  return uniqueBrandSetVariationEntries(
    entries.map((entry) => ({
      brand: entry.brand ?? "",
      set: entry.set,
      variation: entry.variation,
    }))
  );
}

export function addUniqueSorted(list: string[], values: string[]): string[] {
  const set = new Set(list);
  for (const value of values) {
    const label = normLabel(value);
    if (label) set.add(label);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function brandsOwningSet(refs: References, setName: string): string[] {
  const owners: string[] = [];
  for (const [brand, sets] of Object.entries(refs.brandSets)) {
    if (sets.includes(setName)) owners.push(brand);
  }
  return owners;
}

/**
 * Convertit les anciennes clés setVariations (set seul) en clés marque+set.
 * Retourne true si le payload a changé.
 */
export function migrateSetVariationsToBrandScope(
  refs: References,
  fallbackBrandBySet?: Record<string, string[]>
): boolean {
  let changed = false;
  const next: Record<string, string[]> = {};

  for (const [key, variations] of Object.entries(refs.setVariations)) {
    const parsed = parseBrandSetKey(key);
    if (parsed) {
      const scopedKey = brandSetKey(parsed.brand, parsed.set);
      next[scopedKey] = addUniqueSorted(next[scopedKey] ?? [], variations);
      if (scopedKey !== key) changed = true;
      continue;
    }

    changed = true;
    const setName = normLabel(key);
    if (!setName) continue;

    let brands = brandsOwningSet(refs, setName);
    if (brands.length === 0 && fallbackBrandBySet?.[setName]) {
      brands = fallbackBrandBySet[setName]
        .map((brand) => normLabel(brand))
        .filter(Boolean);
      for (const brand of brands) {
        addSet(refs, brand, setName);
      }
    }

    for (const brand of brands) {
      const scopedKey = brandSetKey(brand, setName);
      next[scopedKey] = addUniqueSorted(next[scopedKey] ?? [], variations);
    }
  }

  if (changed) {
    refs.setVariations = next;
  }
  return changed;
}

export function addBrand(refs: References, brand: string): References {
  const name = normLabel(brand);
  if (!name) return refs;
  refs.brands = addUniqueSorted(refs.brands, [name]);
  if (!refs.brandSets[name]) {
    refs.brandSets[name] = [];
  }
  return refs;
}

export function addSet(refs: References, brand: string, set: string): References {
  const brandName = normLabel(brand);
  const setName = normLabel(set);
  if (!brandName || !setName) return refs;
  addBrand(refs, brandName);
  const prev = refs.brandSets[brandName] ? [...refs.brandSets[brandName]] : [];
  refs.brandSets[brandName] = addUniqueSorted(prev, [setName]);
  refs.sets = addUniqueSorted(refs.sets, [setName]);
  const key = brandSetKey(brandName, setName);
  if (!refs.setVariations[key]) {
    refs.setVariations[key] = [];
  }
  return refs;
}

export function addVariation(
  refs: References,
  brand: string,
  set: string,
  variation: string
): References {
  const brandName = normLabel(brand);
  const setName = normLabel(set);
  const name = normLabel(variation);
  if (!brandName || !setName || !name) return refs;
  addSet(refs, brandName, setName);
  const key = brandSetKey(brandName, setName);
  const prev = refs.setVariations[key] ? [...refs.setVariations[key]] : [];
  refs.setVariations[key] = addUniqueSorted(prev, [name]);
  refs.variations = addUniqueSorted(refs.variations, [name]);
  return refs;
}

export function addPlayer(refs: References, player: string): References {
  const name = normLabel(player);
  if (!name) return refs;
  refs.players = addUniqueSorted(refs.players, [name]);
  return refs;
}

export function addTeam(refs: References, team: string): References {
  const name = normLabel(team);
  if (!name) return refs;
  refs.teams = addUniqueSorted(refs.teams, [name]);
  return refs;
}

export function addYear(refs: References, year: string): References {
  const name = normYear(year);
  if (!name) return refs;
  refs.years = addUniqueSorted(refs.years, [name]);
  return refs;
}

export function addGrading(refs: References, grading: string): References {
  const name = normLabel(grading);
  if (!name) return refs;
  refs.gradings = addUniqueSorted(refs.gradings, [name]);
  return refs;
}

export function addProtection(refs: References, protection: string): References {
  const name = normLabel(protection);
  if (!name) return refs;
  refs.protections = addUniqueSorted(refs.protections, [name]);
  return refs;
}

export function addStorage(refs: References, storage: string): References {
  const name = normLabel(storage);
  if (!name) return refs;
  refs.storages = addUniqueSorted(refs.storages, [name]);
  return refs;
}

export function applySeedAttributeReferences(refs: References): References {
  for (const grading of SEED_ATTRIBUTE_REFERENCES.grading) {
    addGrading(refs, grading);
  }
  for (const protection of SEED_ATTRIBUTE_REFERENCES.protection) {
    addProtection(refs, protection);
  }
  for (const storage of SEED_ATTRIBUTE_REFERENCES.storage) {
    addStorage(refs, storage);
  }
  return refs;
}

function gradingCompany(grading: string | null | undefined): string {
  const value = grading?.trim() || "Ungraded";
  if (value === "Ungraded") return "Ungraded";
  const comma = value.indexOf(",");
  if (comma === -1) return value;
  const company = value.slice(0, comma).trim();
  return company || "Ungraded";
}

function removeFromSorted(list: string[], value: string): string[] {
  return list.filter((item) => item !== value);
}

function pruneVariationsGlobal(refs: References, variation: string): void {
  const stillUsed = Object.values(refs.setVariations).some((list) =>
    list.includes(variation)
  );
  if (!stillUsed) {
    refs.variations = removeFromSorted(refs.variations, variation);
  }
}

function pruneSetGlobal(refs: References, setName: string): void {
  if (brandsOwningSet(refs, setName).length === 0) {
    refs.sets = removeFromSorted(refs.sets, setName);
  }
}

export function removePlayer(refs: References, player: string): References {
  const name = normLabel(player);
  if (!name) return refs;
  refs.players = removeFromSorted(refs.players, name);
  return refs;
}

export function removeTeam(refs: References, team: string): References {
  const name = normLabel(team);
  if (!name) return refs;
  refs.teams = removeFromSorted(refs.teams, name);
  return refs;
}

export function removeBrand(refs: References, brand: string): References {
  const name = normLabel(brand);
  if (!name) return refs;
  const sets = refs.brandSets[name] ?? [];
  refs.brands = removeFromSorted(refs.brands, name);
  delete refs.brandSets[name];

  for (const setName of sets) {
    const key = brandSetKey(name, setName);
    const variationsInSet = refs.setVariations[key] ?? [];
    delete refs.setVariations[key];
    for (const variation of variationsInSet) {
      pruneVariationsGlobal(refs, variation);
    }
    pruneSetGlobal(refs, setName);
  }

  return refs;
}

export function removeSet(
  refs: References,
  brand: string,
  set: string
): References {
  const brandName = normLabel(brand);
  const setName = normLabel(set);
  if (!brandName || !setName) return refs;

  if (refs.brandSets[brandName]) {
    refs.brandSets[brandName] = removeFromSorted(
      refs.brandSets[brandName],
      setName
    );
    if (refs.brandSets[brandName].length === 0) {
      delete refs.brandSets[brandName];
    }
  }

  const key = brandSetKey(brandName, setName);
  const variationsInSet = refs.setVariations[key] ?? [];
  delete refs.setVariations[key];
  for (const variation of variationsInSet) {
    pruneVariationsGlobal(refs, variation);
  }

  pruneSetGlobal(refs, setName);

  return refs;
}

export function removeVariation(
  refs: References,
  brand: string,
  set: string,
  variation: string
): References {
  const brandName = normLabel(brand);
  const setName = normLabel(set);
  const name = normLabel(variation);
  if (!brandName || !setName || !name) return refs;

  const key = brandSetKey(brandName, setName);
  if (refs.setVariations[key]) {
    refs.setVariations[key] = removeFromSorted(refs.setVariations[key], name);
    if (refs.setVariations[key].length === 0) {
      delete refs.setVariations[key];
    }
  }

  pruneVariationsGlobal(refs, name);
  return refs;
}

/** Enrichit protection, rangement et société de grading depuis une carte. */
export function syncCardAttributeReferences(
  refs: References,
  attrs: {
    grading?: string | null;
    protection?: string | null;
    storage?: string | null;
  }
): References {
  addGrading(refs, gradingCompany(attrs.grading));
  if (attrs.protection?.trim()) addProtection(refs, attrs.protection);
  if (attrs.storage?.trim()) addStorage(refs, attrs.storage);
  return refs;
}

/** Enrichit les listes de référence à partir d'une carte (saisie libre dans le formulaire). */
export function syncReferencesFromCard(
  refs: References,
  card: {
    player: string;
    team: string;
    year: string | null;
    brand: string;
    set: string;
    variation: string;
    grading?: string;
    protection?: string;
    storage?: string;
  }
): References {
  if (card.player) addPlayer(refs, card.player);
  if (card.team) addTeam(refs, card.team);
  if (card.year) addYear(refs, card.year);
  if (card.brand) addBrand(refs, card.brand);
  if (card.brand && card.set) addSet(refs, card.brand, card.set);
  if (card.brand && card.set && card.variation) {
    addVariation(refs, card.brand, card.set, card.variation);
  }
  syncCardAttributeReferences(refs, card);
  return refs;
}
