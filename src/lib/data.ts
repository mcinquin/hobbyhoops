import { Card, References, FrenchPlayer } from "./types";
import {
  getDatabaseHealth,
  readAllCards,
  readFrenchPlayers,
  readReferencesState,
  replaceAllCards,
  writeReferencesState,
} from "./db";

/** Construit la carte marque → sets à partir des cartes en collection. */
export function buildBrandSetsFromCollection(cards: Card[]): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  for (const c of cards) {
    const b = c.brand?.trim();
    const s = c.set?.trim();
    if (!b || !s) continue;
    if (!map[b]) map[b] = new Set();
    map[b].add(s);
  }
  const out: Record<string, string[]> = {};
  for (const [b, set] of Object.entries(map)) {
    out[b] = [...set].sort((a, z) => a.localeCompare(z));
  }
  return out;
}

function mergeStringMaps(
  a: Record<string, string[]>,
  b: Record<string, string[]>
): Record<string, string[]> {
  const out: Record<string, string[]> = { ...a };
  for (const [key, values] of Object.entries(b)) {
    const merged = new Set([...(out[key] || []), ...values]);
    out[key] = [...merged].sort((x, y) => x.localeCompare(y));
  }
  return out;
}

function mergeBrandSets(
  a: Record<string, string[]>,
  b: Record<string, string[]>
): Record<string, string[]> {
  return mergeStringMaps(a, b);
}

/** Construit la carte set → variations à partir des cartes en collection. */
export function buildSetVariationsFromCollection(
  cards: Card[]
): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  for (const c of cards) {
    const s = c.set?.trim();
    const v = c.variation?.trim();
    if (!s || !v) continue;
    if (!map[s]) map[s] = new Set();
    map[s].add(v);
  }
  const out: Record<string, string[]> = {};
  for (const [setName, variations] of Object.entries(map)) {
    out[setName] = [...variations].sort((a, z) => a.localeCompare(z));
  }
  return out;
}

export function getCollection(): Card[] {
  return readAllCards();
}

/** Lit les références persistées (sans enrichissement collection). */
export function loadReferencesFromDisk(): References {
  return readReferencesState();
}

export async function saveReferencesToDisk(refs: References): Promise<void> {
  writeReferencesState(refs);
}

export async function mutateReferences(
  mutator: (refs: References) => void
): Promise<References> {
  const refs = readReferencesState();
  mutator(refs);
  writeReferencesState(refs);
  return getReferences();
}

/** Fusionne disque + paires (marque, set) issues de la collection. */
export function enrichReferencesWithCollection(
  base: References,
  cards: Card[]
): References {
  const fromCards = buildBrandSetsFromCollection(cards);
  const brandSets = mergeBrandSets(base.brandSets, fromCards);
  const fromSetVariations = buildSetVariationsFromCollection(cards);
  const setVariations = mergeStringMaps(base.setVariations, fromSetVariations);

  const brandSet = new Set(base.brands);
  const setsSet = new Set(base.sets);
  const variationsSet = new Set(base.variations);
  const yearsSet = new Set(base.years);
  for (const [b, arr] of Object.entries(brandSets)) {
    brandSet.add(b);
    for (const s of arr) setsSet.add(s);
  }
  for (const [s, arr] of Object.entries(setVariations)) {
    setsSet.add(s);
    for (const v of arr) variationsSet.add(v);
  }
  for (const c of cards) {
    if (c.brand?.trim()) brandSet.add(c.brand.trim());
    if (c.set?.trim()) setsSet.add(c.set.trim());
    if (c.variation?.trim()) variationsSet.add(c.variation.trim());
    if (c.year?.trim()) yearsSet.add(c.year.trim());
  }

  return {
    ...base,
    brands: [...brandSet].sort((a, b) => a.localeCompare(b)),
    sets: [...setsSet].sort((a, b) => a.localeCompare(b)),
    years: [...yearsSet].sort((a, b) => a.localeCompare(b)),
    brandSets,
    setVariations,
    variations: [...variationsSet].sort((a, b) => a.localeCompare(b)),
  };
}

/** Références pour l’UI : fichier enrichi avec la collection courante. */
export function getReferences(): References {
  const base = loadReferencesFromDisk();
  return enrichReferencesWithCollection(base, getCollection());
}

export function getFrenchPlayers(): FrenchPlayer[] {
  return readFrenchPlayers();
}

export async function saveCollection(cards: Card[]): Promise<void> {
  replaceAllCards(cards);
}

export function getDataHealth(): {
  ok: boolean;
  files: Record<string, boolean>;
} {
  return getDatabaseHealth();
}
