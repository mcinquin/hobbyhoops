import { Card, FrNbaPlayer, References, WantedBlock } from "./types";
import {
  buildCollectionWhereClause,
  COLLECTION_SORT_SQL,
  type CollectionListQuery,
  parseCollectionSearchParams,
} from "./collection-query";
import {
  countCards,
  getDatabaseHealth,
  queryCardsPage,
  readAllCards,
  deleteWantedEntry,
  insertFrNbaPlayer,
  insertWantedEntry,
  readFrNbaPlayers,
  readReferencesState,
  readWantedBlocks,
  replaceAllCards,
  replaceAllFrNbaPlayers,
  replaceAllWantedBlocks,
  updateFrNbaPlayer,
  writeReferencesState,
} from "./db";

export function getCollection(): Card[] {
  return readAllCards();
}

export function getCollectionPage(query: CollectionListQuery): {
  cards: Card[];
  totalCount: number;
  pageCount: number;
} {
  const { whereSql, params } = buildCollectionWhereClause(query);
  const totalCount = countCards(whereSql, params);
  const pageCount = Math.max(1, Math.ceil(totalCount / query.pageSize));
  const page = Math.min(query.page, pageCount);
  const offset = (page - 1) * query.pageSize;
  const sortColumn = COLLECTION_SORT_SQL[query.sort];
  const cards = queryCardsPage(whereSql, params, {
    sortColumn,
    sortDesc: query.sortDesc,
    limit: query.pageSize,
    offset,
  });

  return { cards, totalCount, pageCount };
}

export { parseCollectionSearchParams };
export type { CollectionListQuery };

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

export function createWantedEntry(input: {
  set: string;
  variation: string;
  slot: number | null;
  player: string;
}) {
  return insertWantedEntry(input);
}

export function removeWantedEntry(id: number): boolean {
  return deleteWantedEntry(id);
}

export function createFrNbaPlayer(player: Omit<FrNbaPlayer, "id">): FrNbaPlayer {
  return insertFrNbaPlayer(player);
}

export function editFrNbaPlayer(
  id: number,
  player: Omit<FrNbaPlayer, "id">
): FrNbaPlayer | null {
  return updateFrNbaPlayer(id, player);
}

export function getDataHealth(): {
  ok: boolean;
  data: Record<string, boolean>;
} {
  return getDatabaseHealth();
}
