import { References } from "./types";

export const LABEL_MAX = 160;

export const REFERENCE_YEAR_REGEX = /^(\d{4}|\d{4}-\d{2})$/;

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

export function uniqueBrandSetEntries(
  entries: { brand: string; set: string }[]
): { brand: string; set: string }[] {
  const out: { brand: string; set: string }[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const brand = normLabel(entry.brand);
    const set = normLabel(entry.set);
    if (!brand || !set) continue;
    const key = `${brand}\u0000${set}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ brand, set });
  }
  return out;
}

export function uniqueSetVariationEntries(
  entries: { set: string; variation: string }[]
): { set: string; variation: string }[] {
  const out: { set: string; variation: string }[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const set = normLabel(entry.set);
    const variation = normLabel(entry.variation);
    if (!set || !variation) continue;
    const key = `${set}\u0000${variation}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ set, variation });
  }
  return out;
}

export function addUniqueSorted(list: string[], values: string[]): string[] {
  const set = new Set(list);
  for (const value of values) {
    const label = normLabel(value);
    if (label) set.add(label);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
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
  if (!refs.setVariations[setName]) {
    refs.setVariations[setName] = [];
  }
  return refs;
}

export function addVariation(
  refs: References,
  set: string,
  variation: string
): References {
  const setName = normLabel(set);
  const name = normLabel(variation);
  if (!setName || !name) return refs;
  const prev = refs.setVariations[setName] ? [...refs.setVariations[setName]] : [];
  refs.setVariations[setName] = addUniqueSorted(prev, [name]);
  refs.sets = addUniqueSorted(refs.sets, [setName]);
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
