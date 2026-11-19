/** Card row mapping (SQLite row <-> `Card`) and shared card SQL fragments. */
import "server-only";

import type { Card, CardListItem } from "../types";
import { buildCardSearchText } from "../card-search-text";
import { normalizeCardSerialFields } from "../card-serial";
import { normalizeOpeningDate, openingDateSortValue } from "../opening-date";
import { runInTransaction, type AppDatabase } from "../sqlite";
import { type SqlInputValue } from "./shared";

export const PLAYER_CARD_STATS_AGG_SQL = `
  MIN(team) as team,
  COUNT(*) as count,
  COALESCE(SUM(autograph), 0) as autos,
  COALESCE(SUM(memorabilia), 0) as memos,
  COALESCE(SUM(CASE WHEN serial_number IS NOT NULL AND serial_number != '' THEN 1 ELSE 0 END), 0) as serials,
  COALESCE(SUM(rookie), 0) as rookies
`.trim();

export const CARD_LIST_COLUMNS = `
  id, player, team, year, brand, set_name, variation,
  autograph, memorabilia, serial_number, serial_current, serial_total,
  card_number, grading, opening_date, protection, storage, tradable, rookie, wnba, notes
`.trim();

/** Maps a `cards` row (list columns only) to a normalised `CardListItem`. */
export function rowToCardListItem(row: Record<string, unknown>): CardListItem {
  return normalizeCardSerialFields({
    id: String(row.id),
    player: String(row.player),
    team: String(row.team),
    year: row.year == null ? null : String(row.year),
    brand: String(row.brand),
    set: String(row.set_name),
    variation: String(row.variation),
    autograph: Boolean(row.autograph),
    memorabilia: Boolean(row.memorabilia),
    serialNumber: row.serial_number == null ? null : String(row.serial_number),
    serialCurrent:
      row.serial_current == null ? null : Number(row.serial_current),
    serialTotal: row.serial_total == null ? null : Number(row.serial_total),
    cardNumber: String(row.card_number),
    grading: String(row.grading),
    openingDate:
      row.opening_date == null
        ? null
        : normalizeOpeningDate(String(row.opening_date)),
    protection: String(row.protection),
    storage: String(row.storage),
    tradable: Boolean(row.tradable),
    rookie: Boolean(row.rookie),
    wnba: Boolean(row.wnba),
    notes: row.notes == null ? "" : String(row.notes),
  });
}

/** Maps a full `cards` row, photos included, to a `Card`. */
export function rowToCard(row: Record<string, unknown>): Card {
  const list = rowToCardListItem(row);
  return {
    ...list,
    photoFront: row.photo_front == null ? null : String(row.photo_front),
    photoBack: row.photo_back == null ? null : String(row.photo_back),
  };
}

/**
 * Computes the denormalised columns stored with each card (sortable opening date, search
 * text).
 */
export function cardDerivedRowFields(card: CardListItem): {
  opening_date_sort: number | null;
  search_text: string;
} {
  return {
    opening_date_sort: openingDateSortValue(card.openingDate),
    search_text: buildCardSearchText({
      player: card.player,
      team: card.team,
      year: card.year,
      brand: card.brand,
      set: card.set,
      variation: card.variation,
      cardNumber: card.cardNumber,
      serialNumber: card.serialNumber,
    }),
  };
}

/** Converts a card to the named parameters expected by `CARD_INSERT_SQL` / `CARD_UPDATE_SQL`. */
export function cardToRow(card: Card): Record<string, SqlInputValue> {
  const normalized = normalizeCardSerialFields(card);
  const derived = cardDerivedRowFields(normalized);
  return {
    id: normalized.id,
    player: normalized.player,
    team: normalized.team,
    year: normalized.year,
    brand: normalized.brand,
    set_name: normalized.set,
    variation: normalized.variation,
    autograph: normalized.autograph ? 1 : 0,
    memorabilia: normalized.memorabilia ? 1 : 0,
    serial_number: normalized.serialNumber,
    serial_current: normalized.serialCurrent,
    serial_total: normalized.serialTotal,
    card_number: normalized.cardNumber,
    grading: normalized.grading,
    opening_date: normalizeOpeningDate(normalized.openingDate),
    protection: normalized.protection,
    storage: normalized.storage,
    photo_front: normalized.photoFront,
    photo_back: normalized.photoBack,
    tradable: normalized.tradable ? 1 : 0,
    rookie: normalized.rookie ? 1 : 0,
    wnba: normalized.wnba ? 1 : 0,
    notes: normalized.notes.trim(),
    opening_date_sort: derived.opening_date_sort,
    search_text: derived.search_text,
  };
}

export const CARD_INSERT_SQL = `
  INSERT INTO cards (
    id, player, team, year, brand, set_name, variation,
    autograph, memorabilia, serial_number, serial_current, serial_total,
    card_number, grading, opening_date, protection, storage, photo_front, photo_back,
    tradable, rookie, wnba, notes, opening_date_sort, search_text
  ) VALUES (
    @id, @player, @team, @year, @brand, @set_name, @variation,
    @autograph, @memorabilia, @serial_number, @serial_current, @serial_total,
    @card_number, @grading, @opening_date, @protection, @storage, @photo_front, @photo_back,
    @tradable, @rookie, @wnba, @notes, @opening_date_sort, @search_text
  )
`;

/** Replaces the whole `cards` table with `cards`, in a single transaction (legacy JSON import). */
export function importCards(db: AppDatabase, cards: Card[]): void {
  const insert = db.prepare(CARD_INSERT_SQL);

  runInTransaction(db, () => {
    db.prepare("DELETE FROM cards").run();
    for (const card of cards) {
      insert.run(cardToRow(card));
    }
  });
}

export const CARD_UPDATE_SQL = `
  UPDATE cards SET
    player = @player,
    team = @team,
    year = @year,
    brand = @brand,
    set_name = @set_name,
    variation = @variation,
    autograph = @autograph,
    memorabilia = @memorabilia,
    serial_number = @serial_number,
    serial_current = @serial_current,
    serial_total = @serial_total,
    card_number = @card_number,
    grading = @grading,
    opening_date = @opening_date,
    protection = @protection,
    storage = @storage,
    photo_front = @photo_front,
    photo_back = @photo_back,
    tradable = @tradable,
    rookie = @rookie,
    wnba = @wnba,
    notes = @notes,
    opening_date_sort = @opening_date_sort,
    search_text = @search_text
  WHERE id = @id
`;
