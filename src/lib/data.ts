import "server-only";

import {
  Card,
  FrNbaPlayer,
  References,
  WantedBlock,
  type CardsPageResult,
  type ChartCountRow,
  type CollectionStats,
  type DashboardChartData,
  type PlayerSummaryRow,
} from "./types";
import {
  buildCollectionWhereClause,
  COLLECTION_SORT_SQL,
  type CollectionListQuery,
} from "./collection-query";
import {
  countCards,
  deleteCard,
  getDatabaseHealth,
  getNextCardId,
  insertCard,
  queryCardsPage,
  readCardCountsByBrand,
  readCardCountsBySet,
  readCardCountsByYear,
  readCardsByPlayer,
  readCollectionStats,
  readFrNbaPlayers,
  readPlayerSummaries,
  readRecentCards,
  readReferencesState,
  readTopPlayerCounts,
  readWantedBlocks,
  deleteWantedEntry,
  insertFrNbaPlayer,
  insertWantedEntry,
  readCardById,
  replaceAllCards,
  replaceAllFrNbaPlayers,
  replaceAllWantedBlocks,
  updateCard,
  updateFrNbaPlayer,
  writeReferencesState,
} from "./db";
import {
  buildChartCountData,
  chartDataWithCards,
  referenceSetNames,
} from "./dashboard-chart-data";

export type {
  CardsPageResult,
  ChartCountRow,
  CollectionStats,
  DashboardChartData,
  PlayerSummaryRow,
};

export function getCollectionPage(query: CollectionListQuery): CardsPageResult {
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

  return { cards, totalCount, pageCount, page, pageSize: query.pageSize };
}

export function getCollectionStats(): CollectionStats {
  return readCollectionStats();
}

export function getRecentCards(limit = 8): Card[] {
  return readRecentCards(limit);
}

export function getPlayerSummaries(): PlayerSummaryRow[] {
  return readPlayerSummaries();
}

export function getCardsByPlayer(player: string): Card[] {
  return readCardsByPlayer(player);
}

export function getDashboardChartData(references: References): DashboardChartData {
  const brandCounts = readCardCountsByBrand();
  const yearCounts = readCardCountsByYear();
  const setCounts = readCardCountsBySet();
  const playerCounts = readTopPlayerCounts(10);

  const brandData = chartDataWithCards(
    buildChartCountData(references.brands, brandCounts)
  ).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const yearData = chartDataWithCards(
    buildChartCountData(references.years, yearCounts)
  ).sort((a, b) => a.name.localeCompare(b.name));

  const setData = chartDataWithCards(
    buildChartCountData(referenceSetNames(references), setCounts)
  ).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    brandData,
    yearData,
    setData,
    playerData: playerCounts,
  };
}

export function createCardRecord(card: Omit<Card, "id">): Card {
  const created = insertCard({ ...card, id: getNextCardId() });
  return created;
}

export function editCardRecord(card: Card): Card | null {
  return updateCard(card);
}

export function removeCardRecord(id: string): boolean {
  return deleteCard(id);
}

export function getCardById(id: string): Card | null {
  return readCardById(id);
}

export { parseCollectionSearchParams, COLLECTION_MAX_PAGE_SIZE } from "./collection-query";
export type { CollectionListQuery };

export function getWantedBlocks(): WantedBlock[] {
  return readWantedBlocks();
}

export function getFrNbaPlayers(): FrNbaPlayer[] {
  return readFrNbaPlayers();
}

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

export function getDataHealth(): { ok: boolean } {
  return getDatabaseHealth();
}
