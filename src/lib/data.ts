import { Card, FrNbaPlayer, References, WantedBlock } from "./types";
import {
  getDatabaseHealth,
  readAllCards,
  readFrNbaPlayers,
  readReferencesState,
  readWantedBlocks,
  replaceAllCards,
  replaceAllFrNbaPlayers,
  replaceAllWantedBlocks,
  writeReferencesState,
} from "./db";

export function getCollection(): Card[] {
  return readAllCards();
}

export function getWantedBlocks(): WantedBlock[] {
  return readWantedBlocks();
}

export function getFrNbaPlayers(): FrNbaPlayer[] {
  return readFrNbaPlayers();
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

export async function saveWantedBlocks(blocks: WantedBlock[]): Promise<void> {
  replaceAllWantedBlocks(blocks);
}

export async function saveFrNbaPlayers(players: FrNbaPlayer[]): Promise<void> {
  replaceAllFrNbaPlayers(players);
}

export function getDataHealth(): {
  ok: boolean;
  data: Record<string, boolean>;
} {
  return getDatabaseHealth();
}
