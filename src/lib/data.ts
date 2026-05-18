import { Card, References } from "./types";
import {
  getDatabaseHealth,
  readAllCards,
  readReferencesState,
  replaceAllCards,
  writeReferencesState,
} from "./db";

export function getCollection(): Card[] {
  return readAllCards();
}

/** Lit les références persistées (sans enrichissement collection). */
export function loadReferences(): References {
  return readReferencesState();
}

export async function saveReferences(refs: References): Promise<void> {
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

/** Références pour l’UI : uniquement les valeurs validées dans l’admin. */
export function getReferences(): References {
  return loadReferences();
}

export async function saveCollection(cards: Card[]): Promise<void> {
  replaceAllCards(cards);
}

export function getDataHealth(): { ok: boolean } {
  return getDatabaseHealth();
}
