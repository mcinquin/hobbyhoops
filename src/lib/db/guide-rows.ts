/** Row mapping and bulk import helpers for the Wanted board and FR-NBA checklist tables. */
import "server-only";

import type { FrNbaPlayer, FrNbaHolding, FrNbaPlayerWrite, WantedBlock } from "../types";
import {
  deriveRpaObjectiveFromLegacy,
  frNbaAutoStyleToDb,
  legacyFrNbaRowToHoldings,
  normalizeFrNbaAutoStyleDb,
} from "../fr-nba";
import { runInTransaction, type AppDatabase } from "../sqlite";
import { type SqlInputValue, nullableBoolFromDb, nullableBoolToDb } from "./shared";

function rowToFrNbaHolding(row: Record<string, unknown>): FrNbaHolding {
  return {
    id: Number(row.id),
    type: String(row.type) as FrNbaHolding["type"],
    autoStyle: normalizeFrNbaAutoStyleDb(
      row.auto_style == null ? null : String(row.auto_style)
    ),
    rookie: Boolean(row.rookie),
  };
}

/** Loads the holdings of several FR-NBA players at once, keyed by player id. */
export function readFrNbaHoldingsByPlayerIds(
  db: AppDatabase,
  playerIds: number[]
): Map<number, FrNbaHolding[]> {
  const map = new Map<number, FrNbaHolding[]>();
  if (playerIds.length === 0) return map;

  const placeholders = playerIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT id, player_id, type, auto_style, rookie
       FROM fr_nba_holdings
       WHERE player_id IN (${placeholders})
       ORDER BY id ASC`
    )
    .all(...playerIds) as Record<string, unknown>[];

  for (const row of rows) {
    const playerId = Number(row.player_id);
    const holding = rowToFrNbaHolding(row);
    const bucket = map.get(playerId);
    if (bucket) bucket.push(holding);
    else map.set(playerId, [holding]);
  }

  return map;
}

/** Maps an `fr_nba_players` row and its holdings to a `FrNbaPlayer`. */
export function rowToFrNbaPlayer(
  row: Record<string, unknown>,
  holdings: FrNbaHolding[]
): FrNbaPlayer {
  return {
    id: Number(row.id),
    player: String(row.player),
    draftYear: String(row.draft_year),
    draftedBy: String(row.drafted_by),
    rpa: nullableBoolFromDb(row.rpa),
    holdings,
  };
}

/** Replaces all holdings of a player and returns the stored rows (call inside a transaction). */
export function replaceFrNbaHoldings(
  db: AppDatabase,
  playerId: number,
  holdings: Omit<FrNbaHolding, "id">[]
): FrNbaHolding[] {
  db.prepare("DELETE FROM fr_nba_holdings WHERE player_id = ?").run(playerId);
  const insert = db.prepare(`
    INSERT INTO fr_nba_holdings (player_id, type, auto_style, rookie)
    VALUES (@player_id, @type, @auto_style, @rookie)
  `);

  const saved: FrNbaHolding[] = [];
  for (const holding of holdings) {
    const result = insert.run({
      player_id: playerId,
      type: holding.type,
      auto_style: frNbaAutoStyleToDb(holding.autoStyle),
      rookie: holding.rookie ? 1 : 0,
    });
    saved.push({
      id: Number(result.lastInsertRowid),
      type: holding.type,
      autoStyle: holding.autoStyle,
      rookie: holding.rookie,
    });
  }
  return saved;
}

function normalizeImportedFrNbaPlayer(
  raw: Record<string, unknown>
): FrNbaPlayerWrite {
  if (Array.isArray(raw.holdings)) {
    return {
      player: String(raw.player ?? ""),
      draftYear: String(raw.draftYear ?? raw.draft_year ?? ""),
      draftedBy: String(raw.draftedBy ?? raw.drafted_by ?? ""),
      rpa:
        raw.rpa == null
          ? null
          : typeof raw.rpa === "boolean"
            ? raw.rpa
            : nullableBoolFromDb(raw.rpa),
      holdings: raw.holdings.map((holding) => {
        const item = holding as Record<string, unknown>;
        return {
          type: String(item.type) as FrNbaHolding["type"],
          autoStyle: normalizeFrNbaAutoStyleDb(
            item.autoStyle == null && item.auto_style == null
              ? null
              : String(item.autoStyle ?? item.auto_style ?? "")
          ),
          rookie: Boolean(item.rookie),
        };
      }),
    };
  }

  const legacy = {
    rookieCard: legacyNullableBool(raw, "rookieCard", "rookie_card"),
    auto:
      raw.auto == null
        ? null
        : normalizeLegacyAutoLabel(String(raw.auto)),
    patch: legacyNullableBool(raw, "patch", "patch"),
    immaculate: legacyNullableBool(raw, "immaculate", "immaculate"),
  };

  return {
    player: String(raw.player ?? ""),
    draftYear: String(raw.draftYear ?? raw.draft_year ?? ""),
    draftedBy: String(raw.draftedBy ?? raw.drafted_by ?? ""),
    rpa: deriveRpaObjectiveFromLegacy(legacy),
    holdings: legacyFrNbaRowToHoldings(legacy),
  };
}

function normalizeLegacyAutoLabel(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function legacyNullableBool(
  raw: Record<string, unknown>,
  camelKey: string,
  snakeKey: string
): boolean | null {
  const value = raw[camelKey] ?? raw[snakeKey];
  if (value == null) return null;
  if (typeof value === "boolean") return value;
  return nullableBoolFromDb(value);
}

function importWantedBlocks(db: AppDatabase, blocks: WantedBlock[]): void {
  const insert = db.prepare(`
    INSERT INTO wanted_entries (brand, set_name, variation, slot, player)
    VALUES (@brand, @set_name, @variation, @slot, @player)
  `);

  runInTransaction(db, () => {
    db.prepare("DELETE FROM wanted_entries").run();
    for (const block of blocks) {
      for (const entry of block.entries) {
        insert.run({
          brand: block.brand ?? "",
          set_name: block.set,
          variation: entry.variation,
          slot: entry.slot,
          player: entry.player,
        });
      }
    }
  });
}

function importFrNbaPlayers(db: AppDatabase, players: FrNbaPlayer[]): void {
  const insertPlayer = db.prepare(`
    INSERT INTO fr_nba_players (
      player, draft_year, drafted_by, rpa
    ) VALUES (
      @player, @draft_year, @drafted_by, @rpa
    )
  `);

  runInTransaction(db, () => {
    db.prepare("DELETE FROM fr_nba_holdings").run();
    db.prepare("DELETE FROM fr_nba_players").run();
    for (const player of players) {
      const normalized = normalizeImportedFrNbaPlayer(
        player as unknown as Record<string, unknown>
      );
      const result = insertPlayer.run({
        player: normalized.player,
        draft_year: normalized.draftYear,
        drafted_by: normalized.draftedBy,
        rpa: nullableBoolToDb(normalized.rpa),
      });
      const playerId = Number(result.lastInsertRowid);
      replaceFrNbaHoldings(
        db,
        playerId,
        normalized.holdings.map(({ type, autoStyle, rookie }) => ({
          type,
          autoStyle,
          rookie,
        }))
      );
    }
  });
}

/** Groups `wanted_entries` rows into brand + set blocks, then variations, for the Wanted board. */
export function wantedBlocksFromRows(
  rows: {
    id: number;
    brand: string;
    set_name: string;
    variation: string;
    slot: number | null;
    player: string;
  }[]
): WantedBlock[] {
  const byKey = new Map<string, WantedBlock>();

  for (const row of rows) {
    const brand = row.brand ?? "";
    const key = `${brand}\u0000${row.set_name}`;
    let block = byKey.get(key);
    if (!block) {
      block = { brand, set: row.set_name, variations: [], entries: [] };
      byKey.set(key, block);
    }
    if (!block.variations.includes(row.variation)) {
      block.variations.push(row.variation);
    }
    block.entries.push({
      id: row.id,
      variation: row.variation,
      slot: row.slot,
      player: row.player,
    });
  }

  return [...byKey.values()].sort(
    (a, b) =>
      a.brand.localeCompare(b.brand) || a.set.localeCompare(b.set)
  );
}

function readGuidesStatePayloads(db: AppDatabase): {
  wanted: WantedBlock[];
  frNba: FrNbaPlayer[];
} | null {
  try {
    const row = db
      .prepare(
        "SELECT wanted_payload, fr_nba_payload FROM guides_state WHERE id = 1"
      )
      .get() as { wanted_payload: string; fr_nba_payload: string } | undefined;
    if (!row) return null;

    const wanted = JSON.parse(row.wanted_payload) as WantedBlock[];
    const frNba = JSON.parse(row.fr_nba_payload) as FrNbaPlayer[];
    return {
      wanted: Array.isArray(wanted) ? wanted : [],
      frNba: Array.isArray(frNba) ? frNba : [],
    };
  } catch {
    return null;
  }
}

/** Fills the Wanted / FR-NBA tables from the legacy JSON state when they are still empty. */
export function seedGuidesTablesIfEmpty(db: AppDatabase): void {
  const wantedCount = (
    db.prepare("SELECT COUNT(*) as count FROM wanted_entries").get() as {
      count: number;
    }
  ).count;
  const frNbaCount = (
    db.prepare("SELECT COUNT(*) as count FROM fr_nba_players").get() as {
      count: number;
    }
  ).count;
  if (wantedCount > 0 && frNbaCount > 0) return;

  const legacy = readGuidesStatePayloads(db);
  if (!legacy) return;

  if (wantedCount === 0 && legacy.wanted.length > 0) {
    importWantedBlocks(db, legacy.wanted);
  }

  if (frNbaCount === 0 && legacy.frNba.length > 0) {
    importFrNbaPlayers(db, legacy.frNba);
  }
}

/** Converts the identity part of a FR-NBA player to SQL parameters (trimmed, nullable RPA). */
export function frNbaPlayerToRow(
  player: Omit<FrNbaPlayerWrite, "holdings">
): Record<string, SqlInputValue> {
  return {
    player: player.player.trim(),
    draft_year: player.draftYear.trim(),
    drafted_by: player.draftedBy.trim(),
    rpa: nullableBoolToDb(player.rpa),
  };
}
