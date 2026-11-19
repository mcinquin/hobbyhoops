/** Wanted board and FR-NBA checklist queries and writes. */
import "server-only";

import type { FrNbaPlayer, FrNbaPlayerWrite, WantedBlock, WantedEntry } from "../types";
import { runInTransaction, type AppDatabase } from "../sqlite";
import { type SqlInputValue } from "./shared";
import {
  readFrNbaHoldingsByPlayerIds,
  rowToFrNbaPlayer,
  replaceFrNbaHoldings,
  wantedBlocksFromRows,
  frNbaPlayerToRow,
} from "./guide-rows";
import { getDb } from "./connection";

/** Adds a player to a Wanted board slot and returns the stored entry. */
export function insertWantedEntry(input: {
  brand: string;
  set: string;
  variation: string;
  slot: number | null;
  player: string;
}): WantedEntry {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO wanted_entries (brand, set_name, variation, slot, player)
       VALUES (@brand, @set_name, @variation, @slot, @player)`
    )
    .run({
      brand: input.brand.trim(),
      set_name: input.set.trim(),
      variation: input.variation.trim(),
      slot: input.slot,
      player: input.player.trim(),
    });
  const id = Number(result.lastInsertRowid);
  return {
    id,
    variation: input.variation.trim(),
    slot: input.slot,
    player: input.player.trim(),
  };
}

/** Removes a Wanted board entry. Returns false when the id does not exist. */
export function deleteWantedEntry(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM wanted_entries WHERE id = ?").run(id);
  return result.changes > 0;
}

/** The whole Wanted board, grouped by brand + set. */
export function readWantedBlocks(): WantedBlock[] {
  const rows = getDb()
    .prepare(
      `SELECT id, brand, set_name, variation, slot, player
       FROM wanted_entries
       ORDER BY brand, set_name, variation, slot, player`
    )
    .all() as {
    id: number;
    brand: string;
    set_name: string;
    variation: string;
    slot: number | null;
    player: string;
  }[];
  return wantedBlocksFromRows(rows);
}

/** A Wanted entry with its brand and set, or null. */
export function readWantedEntryById(
  id: number
): (WantedEntry & { brand: string; set: string }) | null {
  const row = getDb()
    .prepare(
      `SELECT id, brand, set_name, variation, slot, player
       FROM wanted_entries
       WHERE id = ?`
    )
    .get(id) as
    | {
        id: number;
        brand: string;
        set_name: string;
        variation: string;
        slot: number | null;
        player: string;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    brand: row.brand ?? "",
    set: row.set_name,
    variation: row.variation,
    slot: row.slot,
    player: row.player,
  };
}

/** All FR-NBA checklist players with their holdings. */
export function readFrNbaPlayers(): FrNbaPlayer[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, player, draft_year, drafted_by, rpa
       FROM fr_nba_players
       ORDER BY (
         SELECT COUNT(*) FROM fr_nba_holdings h WHERE h.player_id = fr_nba_players.id
       ) ASC,
       player COLLATE NOCASE`
    )
    .all() as Record<string, unknown>[];
  const holdingsByPlayer = readFrNbaHoldingsByPlayerIds(
    db,
    rows.map((row) => Number(row.id))
  );
  return rows.map((row) =>
    rowToFrNbaPlayer(row, holdingsByPlayer.get(Number(row.id)) ?? [])
  );
}

/**
 * Shared FR-NBA write path: `writeIdentity` stores the player row and returns
 * its id (or null when nothing matched), then holdings are replaced in the
 * same transaction.
 */
function writeFrNbaPlayer(
  player: FrNbaPlayerWrite,
  writeIdentity: (db: AppDatabase, row: Record<string, SqlInputValue>) => number | null
): FrNbaPlayer | null {
  const db = getDb();
  const { holdings, ...identity } = player;
  const row = frNbaPlayerToRow(identity);
  const normalizedHoldings = holdings.map(({ type, autoStyle, rookie }) => ({
    type,
    autoStyle,
    rookie,
  }));
  return runInTransaction(db, () => {
    const id = writeIdentity(db, row);
    if (id === null) return null;
    const savedHoldings = replaceFrNbaHoldings(db, id, normalizedHoldings);
    return {
      id,
      player: identity.player.trim(),
      draftYear: identity.draftYear.trim(),
      draftedBy: identity.draftedBy.trim(),
      rpa: identity.rpa,
      holdings: savedHoldings,
    };
  });
}

/** Inserts a FR-NBA player with its holdings. */
export function insertFrNbaPlayer(player: FrNbaPlayerWrite): FrNbaPlayer {
  const saved = writeFrNbaPlayer(player, (db, row) => {
    const result = db
      .prepare(
        `INSERT INTO fr_nba_players (
          player, draft_year, drafted_by, rpa
        ) VALUES (
          @player, @draft_year, @drafted_by, @rpa
        )`
      )
      .run(row);
    return Number(result.lastInsertRowid);
  });
  if (!saved) throw new Error("FR-NBA player insert returned no row");
  return saved;
}

/** Updates a FR-NBA player and replaces its holdings; null when the id is unknown. */
export function updateFrNbaPlayer(
  id: number,
  player: FrNbaPlayerWrite
): FrNbaPlayer | null {
  return writeFrNbaPlayer(player, (db, row) => {
    const result = db
      .prepare(
        `UPDATE fr_nba_players SET
          player = @player,
          draft_year = @draft_year,
          drafted_by = @drafted_by,
          rpa = @rpa
        WHERE id = @id`
      )
      .run({ ...row, id });
    return result.changes === 0 ? null : id;
  });
}
