/** Investment cards and their valuation readings (`card_valuations`). */
import "server-only";

import type { CardValuation } from "../investment-portfolio";
import type { CardListItem } from "../types";
import { CARD_LIST_COLUMNS, rowToCardListItem } from "./card-rows";
import { getDb } from "./connection";

const VALUATION_COLUMNS = "id, card_id, value_cents, currency, valued_at, source, note";

function rowToValuation(row: Record<string, unknown>): CardValuation {
  return {
    id: Number(row.id),
    cardId: String(row.card_id),
    valueCents: Number(row.value_cents),
    currency: String(row.currency),
    valuedAt: String(row.valued_at),
    source: String(row.source ?? "manual"),
    note: String(row.note ?? ""),
  };
}

/** Cards flagged as investments, without photos. */
export function readInvestmentCards(): CardListItem[] {
  const rows = getDb()
    .prepare(
      `SELECT ${CARD_LIST_COLUMNS} FROM cards WHERE investment = 1 ORDER BY player COLLATE NOCASE`
    )
    .all() as Record<string, unknown>[];
  return rows.map(rowToCardListItem);
}

/** Every reading of the investment cards, oldest first. */
export function readInvestmentValuations(): CardValuation[] {
  const rows = getDb()
    .prepare(
      `SELECT v.id, v.card_id, v.value_cents, v.currency, v.valued_at, v.source, v.note
       FROM card_valuations v
       JOIN cards c ON c.id = v.card_id
       WHERE c.investment = 1
       ORDER BY v.valued_at ASC, v.id ASC`
    )
    .all() as Record<string, unknown>[];
  return rows.map(rowToValuation);
}

/** Readings of one card, latest first. */
export function readCardValuations(cardId: string): CardValuation[] {
  const rows = getDb()
    .prepare(
      `SELECT ${VALUATION_COLUMNS} FROM card_valuations
       WHERE card_id = ?
       ORDER BY valued_at DESC, id DESC`
    )
    .all(cardId) as Record<string, unknown>[];
  return rows.map(rowToValuation);
}

/** Adds a reading and returns it. */
export function insertCardValuation(
  valuation: Omit<CardValuation, "id">
): CardValuation {
  const result = getDb()
    .prepare(
      `INSERT INTO card_valuations (card_id, value_cents, currency, valued_at, source, note)
       VALUES (@cardId, @valueCents, @currency, @valuedAt, @source, @note)`
    )
    .run(valuation);
  return { ...valuation, id: Number(result.lastInsertRowid) };
}

/** Removes one reading of a card; false when it does not exist. */
export function deleteCardValuation(cardId: string, valuationId: number): boolean {
  const result = getDb()
    .prepare("DELETE FROM card_valuations WHERE id = ? AND card_id = ?")
    .run(valuationId, cardId);
  return result.changes > 0;
}
