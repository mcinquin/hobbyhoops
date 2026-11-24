/** Card queries and writes (collection, stats, charts, player pages). */
import "server-only";

import type {
  Card,
  CardListItem,
  ChartCountRow,
  CollectionStats,
  PlayerCardGroup,
  PlayerPageSummary,
  PlayerSummaryRow,
} from "../types";
import { normalizeCardSerialFields } from "../card-serial";
import { COLLECTION_SORT_SQL } from "../collection-query";
import type { BrandSetCountRow } from "../dashboard-chart-data";
import type { SpendingGroupRow, SpendingMonthRow } from "../collection-spending";
import {
  PLAYER_CARD_STATS_AGG_SQL,
  CARD_LIST_COLUMNS,
  rowToCardListItem,
  rowToCard,
  cardToRow,
  CARD_INSERT_SQL,
  CARD_UPDATE_SQL,
} from "./card-rows";
import { getDb } from "./connection";

const ALLOWED_SORT_COLUMNS = new Set(Object.values(COLLECTION_SORT_SQL));

/**
 * Returns one page of list items matching `whereSql`; unknown sort columns fall back to
 * `player`.
 */
export function queryCardsPage(
  whereSql: string,
  params: (string | number)[],
  options: {
    sortColumn: string;
    sortDesc: boolean;
    limit: number;
    offset: number;
  }
): CardListItem[] {
  const orderColumn = ALLOWED_SORT_COLUMNS.has(options.sortColumn)
    ? options.sortColumn
    : "player";
  const direction = options.sortDesc ? "DESC" : "ASC";
  const sql = `SELECT ${CARD_LIST_COLUMNS} FROM cards ${whereSql} ORDER BY ${orderColumn} ${direction}, id ASC LIMIT ? OFFSET ?`;
  const rows = getDb()
    .prepare(sql)
    .all(...params, options.limit, options.offset) as Record<string, unknown>[];
  return rows.map(rowToCardListItem);
}

/** Returns every full card matching `whereSql`, sorted (used by the CSV export). */
export function queryAllCards(
  whereSql: string,
  params: (string | number)[],
  options: {
    sortColumn: string;
    sortDesc: boolean;
  }
): Card[] {
  const orderColumn = ALLOWED_SORT_COLUMNS.has(options.sortColumn)
    ? options.sortColumn
    : "player";
  const direction = options.sortDesc ? "DESC" : "ASC";
  const sql = `SELECT * FROM cards ${whereSql} ORDER BY ${orderColumn} ${direction}, id ASC`;
  const rows = getDb()
    .prepare(sql)
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToCard);
}

/** Counts the cards matching `whereSql`. */
export function countCards(whereSql: string, params: (string | number)[]): number {
  const sql = `SELECT COUNT(*) as count FROM cards ${whereSql}`;
  const row = getDb().prepare(sql).get(...params) as { count: number };
  return row.count;
}

/** Reads a full card by id, or null when it does not exist. */
export function readCardById(id: string): Card | null {
  const row = getDb()
    .prepare("SELECT * FROM cards WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToCard(row) : null;
}

/**
 * Aggregated counters for a player's page (autos, memos, serials, rookies), or null
 * without cards.
 */
export function readPlayerPageSummary(player: string): PlayerPageSummary | null {
  const row = getDb()
    .prepare(
      `SELECT ${PLAYER_CARD_STATS_AGG_SQL}
      FROM cards
      WHERE player = ?`
    )
    .get(player) as Record<string, number | string> | undefined;
  if (!row || Number(row.count) === 0) return null;
  return {
    team: String(row.team),
    count: Number(row.count),
    autos: Number(row.autos),
    memos: Number(row.memos),
    serials: Number(row.serials),
    rookies: Number(row.rookies),
  };
}

/** A player's cards grouped by `year brand set`, newest group first. */
export function readPlayerCardGroups(player: string): PlayerCardGroup[] {
  const rows = getDb()
    .prepare(
      `SELECT ${CARD_LIST_COLUMNS} FROM cards
       WHERE player = ?
       ORDER BY year DESC, brand, set_name, variation, id`
    )
    .all(player) as Record<string, unknown>[];

  const groups = new Map<string, CardListItem[]>();
  for (const row of rows) {
    const card = rowToCardListItem(row);
    const groupKey = `${card.year ?? ""} ${card.brand} ${card.set}`.trim();
    const bucket = groups.get(groupKey);
    if (bucket) bucket.push(card);
    else groups.set(groupKey, [card]);
  }

  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([groupKey, cards]) => ({ groupKey, cards }));
}

/** Next sequential card id (`card-0042`), based on the highest existing numeric id. */
export function getNextCardId(): string {
  const row = getDb()
    .prepare(
      `SELECT id FROM cards
       WHERE id GLOB 'card-[0-9]*'
       ORDER BY CAST(SUBSTR(id, 6) AS INTEGER) DESC
       LIMIT 1`
    )
    .get() as { id: string } | undefined;
  const maxId = row ? Number.parseInt(row.id.replace("card-", ""), 10) : 0;
  return `card-${String(maxId + 1).padStart(4, "0")}`;
}

/** Inserts a card after normalising its serial fields and returns the stored version. */
export function insertCard(card: Card): Card {
  const normalized = normalizeCardSerialFields(card);
  getDb().prepare(CARD_INSERT_SQL).run(cardToRow(normalized));
  return normalized;
}

/** Updates a card in place; returns null when the id does not exist. */
export function updateCard(card: Card): Card | null {
  const normalized = normalizeCardSerialFields(card);
  const result = getDb().prepare(CARD_UPDATE_SQL).run(cardToRow(normalized));
  if (result.changes === 0) return null;
  return normalized;
}

/**
 * Deletes a card row (photos are handled by the caller). Returns false when nothing was
 * deleted.
 */
export function deleteCard(id: string): boolean {
  const result = getDb().prepare("DELETE FROM cards WHERE id = ?").run(id);
  return result.changes > 0;
}

/** Collection-wide totals for the dashboard stat cards. */
export function readCollectionStats(): CollectionStats {
  const row = getDb()
    .prepare(
      `SELECT
        COUNT(*) as total,
        COALESCE(SUM(autograph), 0) as autographs,
        COALESCE(SUM(memorabilia), 0) as memorabilia,
        COALESCE(SUM(CASE WHEN serial_number IS NOT NULL AND serial_number != '' THEN 1 ELSE 0 END), 0) as numbered,
        COALESCE(SUM(rookie), 0) as rookies,
        COALESCE(SUM(tradable), 0) as tradable,
        COALESCE(SUM(wnba), 0) as wnba
      FROM cards`
    )
    .get() as Record<string, number>;
  return {
    total: Number(row.total),
    autographs: Number(row.autographs),
    memorabilia: Number(row.memorabilia),
    numbered: Number(row.numbered),
    rookies: Number(row.rookies),
    tradable: Number(row.tradable),
    wnba: Number(row.wnba),
  };
}

/** Number of NBA and WNBA cards. */
export function readLeagueCounts(): { nba: number; wnba: number } {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as total, COALESCE(SUM(wnba), 0) as wnba FROM cards`
    )
    .get() as Record<string, number>;
  const wnba = Number(row.wnba);
  return { nba: Number(row.total) - wnba, wnba };
}

function readCardCountsByColumn(
  column: "brand" | "year" | "set_name"
): ChartCountRow[] {
  const rows = getDb()
    .prepare(
      `SELECT ${column} as name, COUNT(*) as count
       FROM cards
       WHERE ${column} IS NOT NULL AND ${column} != ''
       GROUP BY ${column}`
    )
    .all() as { name: string; count: number }[];
  return rows.map((row) => ({
    name: String(row.name),
    count: Number(row.count),
  }));
}

/** Card count per brand, for the dashboard charts. */
export function readCardCountsByBrand(): ChartCountRow[] {
  return readCardCountsByColumn("brand");
}

/** Card count per year, for the dashboard charts. */
export function readCardCountsByYear(): ChartCountRow[] {
  return readCardCountsByColumn("year");
}

/** Card count per brand + set (raw values, no display label), for the dashboard charts. */
export function readCardCountsBySet(): BrandSetCountRow[] {
  const rows = getDb()
    .prepare(
      `SELECT brand, set_name, COUNT(*) as count
       FROM cards
       WHERE set_name IS NOT NULL AND set_name != ''
       GROUP BY brand, set_name`
    )
    .all() as { brand: string | null; set_name: string; count: number }[];
  return rows.map((row) => ({
    brand: String(row.brand ?? ""),
    set: String(row.set_name),
    count: Number(row.count),
  }));
}

/** Card count per opening month (`YYYYMM` keys) for the acquisition chart. */
export function readAcquisitionTimeline(): ChartCountRow[] {
  const rows = getDb()
    .prepare(
      `SELECT (opening_date_sort / 100) as month_key, COUNT(*) as count
       FROM cards
       WHERE opening_date_sort IS NOT NULL
       GROUP BY month_key
       ORDER BY month_key ASC`
    )
    .all() as { month_key: number; count: number }[];
  return rows.map((row) => ({
    name: String(row.month_key),
    count: Number(row.count),
  }));
}

/** Priced cards summed per brand + set + currency, for the dashboard spending section. */
export function readSpendingGroups(): SpendingGroupRow[] {
  const rows = getDb()
    .prepare(
      `SELECT brand, set_name, purchase_currency as currency,
        SUM(purchase_price_cents) as total, COUNT(*) as count
       FROM cards
       WHERE purchase_price_cents IS NOT NULL AND purchase_currency IS NOT NULL
       GROUP BY brand, set_name, purchase_currency`
    )
    .all() as {
    brand: string | null;
    set_name: string | null;
    currency: string;
    total: number;
    count: number;
  }[];
  return rows.map((row) => ({
    brand: String(row.brand ?? ""),
    set: String(row.set_name ?? ""),
    currency: String(row.currency),
    totalCents: Number(row.total),
    count: Number(row.count),
  }));
}

/** Priced cards summed per opening month (`YYYYMM`) + currency. */
export function readSpendingByMonth(): SpendingMonthRow[] {
  const rows = getDb()
    .prepare(
      `SELECT (opening_date_sort / 100) as month_key, purchase_currency as currency,
        SUM(purchase_price_cents) as total
       FROM cards
       WHERE purchase_price_cents IS NOT NULL
         AND purchase_currency IS NOT NULL
         AND opening_date_sort IS NOT NULL
       GROUP BY month_key, purchase_currency
       ORDER BY month_key ASC`
    )
    .all() as { month_key: number; currency: string; total: number }[];
  return rows.map((row) => ({
    monthKey: Number(row.month_key),
    currency: String(row.currency),
    totalCents: Number(row.total),
  }));
}

/**
 * Raw groups of cards sharing the same identity (player, year, set, variation, number,
 * serial).
 */
export function readDuplicateGroupRows(): {
  player: string;
  year: string | null;
  brand: string;
  set_name: string;
  variation: string;
  card_number: string;
  serial_number: string;
  ids: string;
}[] {
  return getDb()
    .prepare(
      `SELECT
        MIN(player) as player,
        MIN(year) as year,
        MIN(brand) as brand,
        MIN(set_name) as set_name,
        MIN(variation) as variation,
        TRIM(card_number) as card_number,
        COALESCE(NULLIF(TRIM(serial_number), ''), '') as serial_number,
        GROUP_CONCAT(id) as ids
       FROM cards
       GROUP BY
         LOWER(TRIM(player)),
         COALESCE(TRIM(year), ''),
         TRIM(brand),
         TRIM(set_name),
         TRIM(variation),
         TRIM(card_number),
         COALESCE(NULLIF(TRIM(serial_number), ''), '')
       HAVING COUNT(*) > 1`
    )
    .all() as {
    player: string;
    year: string | null;
    brand: string;
    set_name: string;
    variation: string;
    card_number: string;
    serial_number: string;
    ids: string;
  }[];
}

/** List items for the given ids (order not guaranteed). */
export function readCardsByIds(ids: string[]): CardListItem[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT ${CARD_LIST_COLUMNS} FROM cards WHERE id IN (${placeholders})`
    )
    .all(...ids) as Record<string, unknown>[];
  const byId = new Map(rows.map((row) => [String(row.id), rowToCardListItem(row)]));
  return ids
    .map((id) => byId.get(id))
    .filter((card): card is CardListItem => card != null);
}

/** The `limit` players with the most cards. */
export function readTopPlayerCounts(limit = 10): ChartCountRow[] {
  const rows = getDb()
    .prepare(
      `SELECT player as name, COUNT(*) as count
       FROM cards
       WHERE player != ''
       GROUP BY player
       ORDER BY count DESC, player COLLATE NOCASE ASC
       LIMIT ?`
    )
    .all(limit) as { name: string; count: number }[];
  return rows.map((row) => ({
    name: String(row.name),
    count: Number(row.count),
  }));
}

/** The `limit` most recently opened cards. */
export function readRecentCards(limit = 8): CardListItem[] {
  const rows = getDb()
    .prepare(
      `SELECT ${CARD_LIST_COLUMNS} FROM cards
       WHERE opening_date_sort IS NOT NULL
       ORDER BY opening_date_sort DESC, id ASC
       LIMIT ?`
    )
    .all(limit) as Record<string, unknown>[];
  return rows.map(rowToCardListItem);
}

/** One aggregated row per player for the players index. */
export function readPlayerSummaries(): PlayerSummaryRow[] {
  const rows = getDb()
    .prepare(
      `SELECT
        player as name,
        ${PLAYER_CARD_STATS_AGG_SQL}
      FROM cards
      WHERE player != ''
      GROUP BY player
      ORDER BY count DESC, player COLLATE NOCASE ASC`
    )
    .all() as Record<string, number | string>[];
  return rows.map((row) => ({
    name: String(row.name),
    team: String(row.team),
    count: Number(row.count),
    autos: Number(row.autos),
    memos: Number(row.memos),
    serials: Number(row.serials),
    rookies: Number(row.rookies),
  }));
}
