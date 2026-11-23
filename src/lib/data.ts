import "server-only";

import {
  Card,
  FrNbaPlayer,
  FrNbaPlayerWrite,
  References,
  WantedBlock,
  type CardsPageResult,
  type CollectionStats,
  type DashboardChartData,
  type DuplicateCardGroup,
  type PlayerCardGroup,
  type PlayerPageSummary,
  type PlayerSummaryRow,
  type ReferencesFilterIndex,
} from "./types";
import { getCachedReferences } from "./references-cache";
import {
  buildCollectionSpending,
  type CollectionSpending,
} from "./collection-spending";
import { deleteAllCardPhotos, deleteLocalPhotoIfStored } from "./card-photo-storage";
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
  queryAllCards,
  queryCardsPage,
  readCardById,
  readAcquisitionTimeline,
  readSpendingByMonth,
  readSpendingGroups,
  readCardCountsByBrand,
  readCardCountsBySet,
  readCardCountsByYear,
  readCardsByIds,
  readDuplicateGroupRows,
  readLeagueCounts,
  readPlayerCardGroups,
  readPlayerPageSummary,
  readCollectionStats,
  readFrNbaPlayers,
  readPlayerSummaries,
  readRecentCards,
  readReferencesState,
  readTopPlayerCounts,
  readWantedBlocks,
  readWantedEntryById,
  readShipmentById,
  deleteWantedEntry,
  deleteShipment,
  insertFrNbaPlayer,
  insertShipment,
  insertWantedEntry,
  readShipments,
  updateCard,
  updateFrNbaPlayer,
  updateShipment,
  writeReferencesState,
} from "./db";
import {
  buildChartCountData,
  chartDataWithCards,
  referenceBrandSets,
  buildSetChartData,
} from "./dashboard-chart-data";
import {
  CARD_CSV_MAX_ROWS,
  type CardCsvImportMode,
  type CardCsvImportResult,
  cardsToCsv,
  csvRowToWritePayload,
  parseCardCsv,
} from "./card-csv";
import { normalizeCardSerialFields } from "./card-serial";
import {
  cardCreateSchema,
  cardUpdateSchema,
  formatZodError,
} from "./card-schema";
import { formatTodayOpeningDateFr } from "./opening-date";
import { syncReferencesFromCard } from "./reference-mutations";
import type { Translator } from "@/i18n/translator";
import { mapAcquisitionTimelineRows } from "./acquisition-timeline";
import { buildDuplicateGroups } from "./card-duplicates";
import type { Locale } from "@/i18n/config";

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

/** One page of the filtered collection; the requested page is clamped to the last page. */
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

/** Collection-wide totals for the dashboard. */
export function getCollectionStats(): CollectionStats {
  return readCollectionStats();
}

/** The most recently opened cards. */
export function getRecentCards(limit = 8) {
  return readRecentCards(limit);
}

/** One aggregated row per player for the players index. */
export function getPlayerSummaries(): PlayerSummaryRow[] {
  return readPlayerSummaries();
}

/** Summary counters and grouped cards for a player's page. */
export function getPlayerPageData(player: string): {
  summary: PlayerPageSummary | null;
  groups: PlayerCardGroup[];
} {
  return {
    summary: readPlayerPageSummary(player),
    groups: readPlayerCardGroups(player),
  };
}

/** Lookup tables derived from the references, used by the collection filters. */
export function getReferencesFilterIndex(): ReferencesFilterIndex {
  return toReferencesFilterIndex(getReferences());
}

/** All dashboard chart series, with labels resolved against the references and locale. */
export function getDashboardChartData(
  references: References,
  locale: Locale
): DashboardChartData {
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
    buildSetChartData(referenceBrandSets(references), setCounts)
  ).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const acquisitionData = mapAcquisitionTimelineRows(
    readAcquisitionTimeline().map((row) => ({
      month_key: Number(row.name),
      count: row.count,
    })),
    locale
  );

  const { nba, wnba } = readLeagueCounts();
  const leagueData = [
    { league: "nba" as const, count: nba },
    { league: "wnba" as const, count: wnba },
  ];

  return {
    brandData,
    yearData,
    setData,
    playerData: playerCounts,
    acquisitionData,
    leagueData,
  };
}

/** Purchase spending summary for the dashboard (totals per currency, monthly, averages). */
export function getCollectionSpending(
  totalCards: number,
  locale: Locale
): CollectionSpending {
  return buildCollectionSpending(
    {
      totalCards,
      groups: readSpendingGroups(),
      months: readSpendingByMonth(),
    },
    locale
  );
}

/** Groups of cards that look like duplicates, with their list items. */
export function getDuplicateCardGroups(): DuplicateCardGroup[] {
  const rows = readDuplicateGroupRows();
  const ids = [
    ...new Set(
      rows.flatMap((row) =>
        row.ids
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      )
    ),
  ];
  const cards = readCardsByIds(ids);
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  return buildDuplicateGroups(rows, cardsById);
}

/** Creates a card with the next sequential id. */
export function createCardRecord(card: Omit<Card, "id">): Card {
  const created = insertCard({ ...card, id: getNextCardId() });
  return created;
}

/** Updates a card and deletes stored photo files that were removed from it. */
export function editCardRecord(card: Card): Card | null {
  const existing = readCardById(card.id);
  const saved = updateCard(card);
  if (saved && existing) {
    if (!saved.photoFront && existing.photoFront) {
      deleteLocalPhotoIfStored(existing.photoFront);
    }
    if (!saved.photoBack && existing.photoBack) {
      deleteLocalPhotoIfStored(existing.photoBack);
    }
  }
  return saved;
}

/** Deletes a card and its stored photos. */
export function removeCardRecord(id: string): boolean {
  const removed = deleteCard(id);
  if (removed) {
    deleteAllCardPhotos(id);
  }
  return removed;
}

const EMPTY_COLLECTION_QUERY: CollectionListQuery = {
  search: "",
  player: "",
  team: "",
  year: "",
  brand: "",
  set: "",
  variation: "",
  tags: [],
  page: 1,
  pageSize: 50,
  sort: "player",
  sortDesc: false,
};

function resolveExportQuery(
  query: CollectionListQuery,
  scope: "filtered" | "all"
): CollectionListQuery {
  if (scope === "all") {
    return {
      ...EMPTY_COLLECTION_QUERY,
      sort: query.sort,
      sortDesc: query.sortDesc,
    };
  }
  return query;
}

/** Exports the filtered (or whole) collection as CSV. */
export function exportCardsCsv(
  query: CollectionListQuery,
  scope: "filtered" | "all"
): string {
  const resolved = resolveExportQuery(query, scope);
  const { whereSql, params } = buildCollectionWhereClause(resolved);
  const sortColumn = COLLECTION_SORT_SQL[resolved.sort];
  const cards = queryAllCards(whereSql, params, {
    sortColumn,
    sortDesc: resolved.sortDesc,
  });
  return cardsToCsv(cards);
}

/** Imports cards from CSV (`create` or `upsert` by id); returns counts and per-row errors. */
export function importCardsCsv(
  csv: string,
  mode: CardCsvImportMode,
  t: Translator
): CardCsvImportResult {
  const rows = parseCardCsv(csv);
  if (rows.length === 0) {
    return {
      created: 0,
      updated: 0,
      errors: [{ row: 0, message: t("errors.csvEmpty") }],
    };
  }
  if (rows.length > CARD_CSV_MAX_ROWS) {
    return {
      created: 0,
      updated: 0,
      errors: [
        {
          row: 0,
          message: t("errors.csvTooManyRows", { max: CARD_CSV_MAX_ROWS }),
        },
      ],
    };
  }

  const result: CardCsvImportResult = {
    created: 0,
    updated: 0,
    errors: [],
  };

  const refs = readReferencesState();

  const pushError = (row: number, message: string) => {
    result.errors.push({ row, message });
  };

  /** Creates a new card (fresh id, default opening date) from a CSV row payload. */
  const createFromPayload = (rowNumber: number, payload: unknown) => {
    const parsed = cardCreateSchema.safeParse(payload);
    if (!parsed.success) {
      pushError(rowNumber, formatZodError(parsed.error, t));
      return;
    }

    const card = normalizeCardSerialFields({
      ...parsed.data,
      openingDate: parsed.data.openingDate ?? formatTodayOpeningDateFr(),
    });
    const created = insertCard({ ...card, id: getNextCardId() });
    syncReferencesFromCard(refs, created);
    result.created += 1;
  };

  for (const row of rows) {
    const payload = csvRowToWritePayload(row.values, mode);
    const hasId = typeof payload.id === "string" && payload.id.trim().length > 0;

    if (mode === "create") {
      delete payload.id;
      createFromPayload(row.rowNumber, payload);
      continue;
    }

    if (!hasId) {
      createFromPayload(row.rowNumber, payload);
      continue;
    }

    // Upsert with an explicit id: update when it exists, otherwise insert as-is.
    const parsed = cardUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      pushError(row.rowNumber, formatZodError(parsed.error, t));
      continue;
    }

    const card = normalizeCardSerialFields(parsed.data);
    if (readCardById(card.id)) {
      const saved = updateCard(card);
      if (!saved) {
        pushError(row.rowNumber, t("errors.cardNotFound"));
        continue;
      }
      syncReferencesFromCard(refs, saved);
      result.updated += 1;
      continue;
    }

    const created = insertCard(card);
    syncReferencesFromCard(refs, created);
    result.created += 1;
  }

  writeReferencesState(refs);
  return result;
}

export { parseCollectionSearchParams } from "./collection-query";

/** The whole Wanted board. */
export function getWantedBlocks(): WantedBlock[] {
  return readWantedBlocks();
}

/** All FR-NBA checklist players. */
export function getFrNbaPlayers(): FrNbaPlayer[] {
  return readFrNbaPlayers();
}

/** Reads the references, applies `mutator` to them in place, saves and returns them. */
export async function mutateReferences(
  mutator: (refs: References) => void
): Promise<References> {
  const refs = readReferencesState();
  mutator(refs);
  writeReferencesState(refs);
  return refs;
}

/** References catalogue (cached). */
export function getReferences(): References {
  return getCachedReferences();
}

/** Adds a Wanted board entry. */
export function createWantedEntry(input: {
  brand: string;
  set: string;
  variation: string;
  slot: number | null;
  player: string;
}) {
  return insertWantedEntry(input);
}

/** Removes a Wanted board entry. */
export function removeWantedEntry(id: number): boolean {
  return deleteWantedEntry(id);
}

/** A Wanted board entry by id, or null. */
export function readWantedEntry(id: number) {
  return readWantedEntryById(id);
}

/** A shipment by id, or null. */
export function readShipment(id: string) {
  return readShipmentById(id);
}

/** A full card by id, or null. */
export function readCard(id: string) {
  return readCardById(id);
}

/** Shipments, optionally including received ones. */
export function getShipments(includeReceived = false) {
  return readShipments(includeReceived);
}

/** Creates a shipment. */
export function createShipment(
  input: Parameters<typeof insertShipment>[0]
) {
  return insertShipment(input);
}

/** Applies a partial update to a shipment. */
export function editShipment(
  id: string,
  patch: Parameters<typeof updateShipment>[1]
) {
  return updateShipment(id, patch);
}

/** Deletes a shipment. */
export function removeShipment(id: string): boolean {
  return deleteShipment(id);
}

/** Adds a FR-NBA checklist player. */
export function createFrNbaPlayer(player: FrNbaPlayerWrite): FrNbaPlayer {
  return insertFrNbaPlayer(player);
}

/** Updates a FR-NBA checklist player and its holdings. */
export function editFrNbaPlayer(
  id: number,
  player: FrNbaPlayerWrite
): FrNbaPlayer | null {
  return updateFrNbaPlayer(id, player);
}

/** Health probe for the data layer. */
export function getDataHealth(): { ok: boolean } {
  return getDatabaseHealth();
}
