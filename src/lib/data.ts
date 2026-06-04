import "server-only";

import {
  Card,
  FrNbaPlayer,
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
  readCardCountsByBrand,
  readCardCountsBySet,
  readCardCountsByYear,
  readCardsByIds,
  readDuplicateGroupRows,
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
    buildChartCountData(referenceSetNames(references), setCounts)
  ).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const acquisitionData = mapAcquisitionTimelineRows(
    readAcquisitionTimeline().map((row) => ({
      month_key: Number(row.name),
      count: row.count,
    })),
    locale
  );

  return {
    brandData,
    yearData,
    setData,
    playerData: playerCounts,
    acquisitionData,
  };
}

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

  for (const row of rows) {
    const payload = csvRowToWritePayload(row.values, mode);
    const hasId = typeof payload.id === "string" && payload.id.trim().length > 0;

    if (mode === "create") {
      delete payload.id;
      const parsed = cardCreateSchema.safeParse(payload);
      if (!parsed.success) {
        result.errors.push({
          row: row.rowNumber,
          message: formatZodError(parsed.error, t),
        });
        continue;
      }

      const card = normalizeCardSerialFields({
        ...parsed.data,
        openingDate: parsed.data.openingDate ?? formatTodayOpeningDateFr(),
      });
      const created = insertCard({ ...card, id: getNextCardId() });
      syncReferencesFromCard(refs, created);
      result.created += 1;
      continue;
    }

    if (hasId) {
      const parsed = cardUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        result.errors.push({
          row: row.rowNumber,
          message: formatZodError(parsed.error, t),
        });
        continue;
      }

      const card = normalizeCardSerialFields(parsed.data);
      const existing = readCardById(card.id);
      if (existing) {
        const saved = updateCard(card);
        if (!saved) {
          result.errors.push({
            row: row.rowNumber,
            message: t("errors.cardNotFound"),
          });
          continue;
        }
        syncReferencesFromCard(refs, saved);
        result.updated += 1;
        continue;
      }

      const created = insertCard(card);
      syncReferencesFromCard(refs, created);
      result.created += 1;
      continue;
    }

    const parsed = cardCreateSchema.safeParse(payload);
    if (!parsed.success) {
      result.errors.push({
        row: row.rowNumber,
        message: formatZodError(parsed.error, t),
      });
      continue;
    }

    const card = normalizeCardSerialFields({
      ...parsed.data,
      openingDate: parsed.data.openingDate ?? formatTodayOpeningDateFr(),
    });
    const created = insertCard({ ...card, id: getNextCardId() });
    syncReferencesFromCard(refs, created);
    result.created += 1;
  }

  writeReferencesState(refs);
  return result;
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
