import "server-only";

import {
  Card,
  FrNbaPlayer,
  References,
  WantedBlock,
  type CardsPageResult,
  type CollectionStats,
  type DashboardChartData,
  type PlayerCardGroup,
  type PlayerPageSummary,
  type PlayerSummaryRow,
  type ReferencesFilterIndex,
} from "./types";
import { getCachedReferences } from "./references-cache";
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
  readPlayerCardGroups,
  readPlayerPageSummary,
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
  updateCard,
  updateFrNbaPlayer,
  writeReferencesState,
} from "./db";
import {
  buildChartCountData,
  chartDataWithCards,
  referenceSetNames,
} from "./dashboard-chart-data";

function toReferencesFilterIndex(refs: References): ReferencesFilterIndex {
  return {
    players: refs.players,
    teams: refs.teams,
    years: refs.years,
    brands: refs.brands,
    brandSets: refs.brandSets,
    setVariations: refs.setVariations,
  };
}

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

export function getRecentCards(limit = 8) {
  return readRecentCards(limit);
}

export function getPlayerSummaries(): PlayerSummaryRow[] {
  return readPlayerSummaries();
}

export function getPlayerPageData(player: string): {
  summary: PlayerPageSummary | null;
  groups: PlayerCardGroup[];
} {
  return {
    summary: readPlayerPageSummary(player),
    groups: readPlayerCardGroups(player),
  };
}

export function getReferencesFilterIndex(): ReferencesFilterIndex {
  return toReferencesFilterIndex(getReferences());
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

export { parseCollectionSearchParams } from "./collection-query";

export function getWantedBlocks(): WantedBlock[] {
  return readWantedBlocks();
}

export function getFrNbaPlayers(): FrNbaPlayer[] {
  return readFrNbaPlayers();
}

export async function mutateReferences(
  mutator: (refs: References) => void
): Promise<References> {
  const refs = readReferencesState();
  mutator(refs);
  writeReferencesState(refs);
  return refs;
}

export function getReferences(): References {
  return getCachedReferences();
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
