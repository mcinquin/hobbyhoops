import "server-only";

import { randomUUID } from "node:crypto";
import fs from "fs";
import path from "path";
import type {
  Card,
  CardListItem,
  ChartCountRow,
  CollectionStats,
  FrNbaPlayer,
  FrNbaHolding,
  FrNbaPlayerWrite,
  PlayerCardGroup,
  PlayerPageSummary,
  PlayerSummaryRow,
  References,
  WantedBlock,
  WantedEntry,
  Shipment,
  ShipmentStatus,
} from "./types";
import { buildCardSearchText } from "./card-search-text";
import { normalizeCardSerialFields } from "./card-serial";
import { normalizeOpeningDate, openingDateSortValue } from "./opening-date";
import {
  deriveRpaObjectiveFromLegacy,
  frNbaAutoStyleToDb,
  legacyFrNbaRowToHoldings,
  normalizeFrNbaAutoStyleDb,
} from "./fr-nba";
import type { DatabaseFileMeta } from "./site-info-types";
import { COLLECTION_SORT_SQL } from "./collection-query";
import {
  applySeedAttributeReferences,
  createEmptyReferences,
  normLabel,
  syncCardAttributeReferences,
  syncReferencesFromCard,
} from "./reference-mutations";
import { normalizeVariationLabel } from "./variation-label";
import { getLogger } from "./logger";

const PLAYER_CARD_STATS_AGG_SQL = `
  MIN(team) as team,
  COUNT(*) as count,
  COALESCE(SUM(autograph), 0) as autos,
  COALESCE(SUM(memorabilia), 0) as memos,
  COALESCE(SUM(CASE WHEN serial_number IS NOT NULL AND serial_number != '' THEN 1 ELSE 0 END), 0) as serials,
  COALESCE(SUM(rookie), 0) as rookies
`.trim();
import { createDatabase, runInTransaction, type AppDatabase } from "./sqlite";

const dbLogger = getLogger("db");

const ALLOWED_SORT_COLUMNS = new Set(Object.values(COLLECTION_SORT_SQL));

type SqlInputValue = string | number | bigint | Buffer | null;

const SCHEMA_VERSION = 17;

/** Version de schéma attendue par le code déployé (migrations SQLite). */
export const EXPECTED_SCHEMA_VERSION = SCHEMA_VERSION;

const CARD_LIST_COLUMNS = `
  id, player, team, year, brand, set_name, variation,
  autograph, memorabilia, serial_number, serial_current, serial_total,
  card_number, grading, opening_date, protection, storage, tradable, rookie, notes
`.trim();

const globalForDb = globalThis as typeof globalThis & {
  hobbyhoopsDb?: AppDatabase;
  hobbyhoopsReferencesEnsured?: boolean;
};

export function getDatabaseDisplayPath(): string {
  const configured = process.env.HOBBYHOOPS_DB_PATH?.trim();
  return configured || "data/hobbyhoops.db";
}

export function readDatabaseSchemaVersion(): number {
  return getSchemaVersion(getDb());
}

export function readDatabaseFileMeta(): DatabaseFileMeta {
  const db = getDb();
  const dbPath = getDbPath();
  const stat = fs.statSync(dbPath);
  const journalMode = String(db.pragma("journal_mode", { simple: true }));
  const pageCount = Number(db.pragma("page_count", { simple: true }));
  const pageSize = Number(db.pragma("page_size", { simple: true }));
  const foreignKeys = Boolean(db.pragma("foreign_keys", { simple: true }));

  return {
    displayPath: getDatabaseDisplayPath(),
    sizeBytes: stat.size,
    journalMode,
    pageCount,
    pageSize,
    foreignKeys,
  };
}

export interface AuthSiteCounts {
  users: number;
  activeSessions: number;
}

export function readAuthSiteCounts(): AuthSiteCounts {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  const users = Number(
    (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number })
      .count
  );

  const activeSessions = Number(
    (
      db
        .prepare("SELECT COUNT(*) as count FROM sessions WHERE exp > ?")
        .get(now) as { count: number }
    ).count
  );

  return { users, activeSessions };
}

function getDbPath(): string {
  const configured = process.env.HOBBYHOOPS_DB_PATH?.trim();
  const root = process.cwd();
  if (!configured) return path.join(root, "data", "hobbyhoops.db");

  const resolved = path.resolve(root, configured);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("HOBBYHOOPS_DB_PATH doit pointer dans le répertoire du projet.");
  }
  return resolved;
}

function initSchema(db: AppDatabase): void {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA synchronous = NORMAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA cache_size = -64000");
  db.exec("PRAGMA mmap_size = 268435456");
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      player TEXT NOT NULL,
      team TEXT NOT NULL DEFAULT '',
      year TEXT,
      brand TEXT NOT NULL DEFAULT '',
      set_name TEXT NOT NULL DEFAULT '',
      variation TEXT NOT NULL DEFAULT '',
      autograph INTEGER NOT NULL DEFAULT 0,
      memorabilia INTEGER NOT NULL DEFAULT 0,
      serial_number TEXT,
      serial_current INTEGER,
      serial_total INTEGER,
      card_number TEXT NOT NULL DEFAULT '',
      grading TEXT NOT NULL DEFAULT '',
      opening_date TEXT,
      protection TEXT NOT NULL DEFAULT '',
      storage TEXT NOT NULL DEFAULT '',
      photo TEXT,
      tradable INTEGER NOT NULL DEFAULT 0,
      rookie INTEGER NOT NULL DEFAULT 0,
      opening_date_sort INTEGER,
      search_text TEXT,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exp INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT 0,
      last_seen_at INTEGER NOT NULL DEFAULT 0,
      user_agent TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS references_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wanted_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      set_name TEXT NOT NULL,
      variation TEXT NOT NULL,
      slot INTEGER,
      player TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fr_nba_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player TEXT NOT NULL,
      draft_year TEXT NOT NULL DEFAULT '',
      drafted_by TEXT NOT NULL DEFAULT '',
      rpa INTEGER
    );

    CREATE TABLE IF NOT EXISTS fr_nba_holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      auto_style TEXT,
      rookie INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (player_id) REFERENCES fr_nba_players(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_fr_nba_holdings_player
      ON fr_nba_holdings(player_id);

    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL DEFAULT 'ebay',
      order_id TEXT,
      seller TEXT,
      description TEXT NOT NULL,
      price_cents INTEGER,
      currency TEXT NOT NULL DEFAULT 'EUR',
      ordered_at TEXT NOT NULL,
      shipped_at TEXT,
      tracking_number TEXT,
      carrier TEXT,
      expected_delivery TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      card_id TEXT,
      notes TEXT NOT NULL DEFAULT ''
    );
  `);
}

function nullableBoolFromDb(value: unknown): boolean | null {
  if (value == null) return null;
  return Boolean(value);
}

function nullableBoolToDb(value: boolean | null): number | null {
  if (value == null) return null;
  return value ? 1 : 0;
}

function tableHasColumn(
  db: AppDatabase,
  table: string,
  column: string
): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  return rows.some((row) => row.name === column);
}

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

function readFrNbaHoldingsByPlayerIds(
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

function rowToFrNbaPlayer(
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

function replaceFrNbaHoldings(
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
    INSERT INTO wanted_entries (set_name, variation, slot, player)
    VALUES (@set_name, @variation, @slot, @player)
  `);

  runInTransaction(db, () => {
    db.prepare("DELETE FROM wanted_entries").run();
    for (const block of blocks) {
      for (const entry of block.entries) {
        insert.run({
          set_name: block.set,
          variation: entry.variation,
          slot: entry.slot,
          player: entry.player,
        });
      }
    }
  });
}

export function insertWantedEntry(input: {
  set: string;
  variation: string;
  slot: number | null;
  player: string;
}): WantedEntry {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO wanted_entries (set_name, variation, slot, player)
       VALUES (@set_name, @variation, @slot, @player)`
    )
    .run({
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

export function deleteWantedEntry(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM wanted_entries WHERE id = ?").run(id);
  return result.changes > 0;
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

function wantedBlocksFromRows(
  rows: {
    id: number;
    set_name: string;
    variation: string;
    slot: number | null;
    player: string;
  }[]
): WantedBlock[] {
  const bySet = new Map<string, WantedBlock>();

  for (const row of rows) {
    let block = bySet.get(row.set_name);
    if (!block) {
      block = { set: row.set_name, variations: [], entries: [] };
      bySet.set(row.set_name, block);
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

  return [...bySet.values()].sort((a, b) => a.set.localeCompare(b.set));
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

function seedGuidesTablesIfEmpty(db: AppDatabase): void {
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

export function readWantedBlocks(): WantedBlock[] {
  const rows = getDb()
    .prepare(
      `SELECT id, set_name, variation, slot, player
       FROM wanted_entries
       ORDER BY set_name, variation, slot, player`
    )
    .all() as {
    id: number;
    set_name: string;
    variation: string;
    slot: number | null;
    player: string;
  }[];
  return wantedBlocksFromRows(rows);
}

export function readWantedEntryById(
  id: number
): (WantedEntry & { set: string }) | null {
  const row = getDb()
    .prepare(
      `SELECT id, set_name, variation, slot, player
       FROM wanted_entries
       WHERE id = ?`
    )
    .get(id) as
    | {
        id: number;
        set_name: string;
        variation: string;
        slot: number | null;
        player: string;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    set: row.set_name,
    variation: row.variation,
    slot: row.slot,
    player: row.player,
  };
}

export function readFrNbaPlayers(): FrNbaPlayer[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, player, draft_year, drafted_by, rpa
       FROM fr_nba_players
       ORDER BY player COLLATE NOCASE`
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

function frNbaPlayerToRow(
  player: Omit<FrNbaPlayerWrite, "holdings">
): Record<string, SqlInputValue> {
  return {
    player: player.player.trim(),
    draft_year: player.draftYear.trim(),
    drafted_by: player.draftedBy.trim(),
    rpa: nullableBoolToDb(player.rpa),
  };
}

export function insertFrNbaPlayer(player: FrNbaPlayerWrite): FrNbaPlayer {
  const db = getDb();
  const { holdings, ...identity } = player;
  const row = frNbaPlayerToRow(identity);
  const normalizedHoldings = holdings.map(({ type, autoStyle, rookie }) => ({
    type,
    autoStyle,
    rookie,
  }));
  return runInTransaction(db, () => {
    const result = db
      .prepare(
        `INSERT INTO fr_nba_players (
          player, draft_year, drafted_by, rpa
        ) VALUES (
          @player, @draft_year, @drafted_by, @rpa
        )`
      )
      .run(row);
    const id = Number(result.lastInsertRowid);
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

export function updateFrNbaPlayer(
  id: number,
  player: FrNbaPlayerWrite
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
    if (result.changes === 0) return null;
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

function getSchemaVersion(db: AppDatabase): number {
  const row = db
    .prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'")
    .get() as { value: string } | undefined;
  if (!row) return 0;
  const parsed = Number.parseInt(row.value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function setSchemaVersion(db: AppDatabase, version: number): void {
  db.prepare(
    "INSERT INTO schema_meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(String(version));
}

function parseReferences(raw: Partial<References>): References {
  const parseStringMap = (value: unknown): Record<string, string[]> => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {};
    }
    const out: Record<string, string[]> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (!key || !Array.isArray(entry)) continue;
      out[key] = entry.filter(
        (item): item is string => typeof item === "string" && item.length > 0
      );
    }
    return out;
  };

  return {
    players: Array.isArray(raw.players) ? raw.players : [],
    teams: Array.isArray(raw.teams) ? raw.teams : [],
    years: Array.isArray(raw.years) ? raw.years : [],
    brands: Array.isArray(raw.brands) ? raw.brands : [],
    sets: Array.isArray(raw.sets) ? raw.sets : [],
    brandSets: parseStringMap(raw.brandSets),
    setVariations: parseStringMap(raw.setVariations),
    variations: Array.isArray(raw.variations) ? raw.variations : [],
    gradings: Array.isArray(raw.gradings) ? raw.gradings : [],
    protections: Array.isArray(raw.protections) ? raw.protections : [],
    storages: Array.isArray(raw.storages) ? raw.storages : [],
  };
}

function rowToCardListItem(row: Record<string, unknown>): CardListItem {
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
    notes: row.notes == null ? "" : String(row.notes),
  });
}

function rowToCard(row: Record<string, unknown>): Card {
  const list = rowToCardListItem(row);
  return {
    ...list,
    photo: row.photo == null ? null : String(row.photo),
  };
}

function cardDerivedRowFields(card: CardListItem): {
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

function cardToRow(card: Card): Record<string, SqlInputValue> {
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
    photo: normalized.photo,
    tradable: normalized.tradable ? 1 : 0,
    rookie: normalized.rookie ? 1 : 0,
    notes: normalized.notes.trim(),
    opening_date_sort: derived.opening_date_sort,
    search_text: derived.search_text,
  };
}

function importCards(db: AppDatabase, cards: Card[]): void {
  const insert = db.prepare(`
    INSERT INTO cards (
      id, player, team, year, brand, set_name, variation,
      autograph, memorabilia, serial_number, serial_current, serial_total,
      card_number, grading, opening_date, protection, storage, photo,
      tradable, rookie, notes, opening_date_sort, search_text
    ) VALUES (
      @id, @player, @team, @year, @brand, @set_name, @variation,
      @autograph, @memorabilia, @serial_number, @serial_current, @serial_total,
      @card_number, @grading, @opening_date, @protection, @storage, @photo,
      @tradable, @rookie, @notes, @opening_date_sort, @search_text
    )
  `);

  runInTransaction(db, () => {
    db.prepare("DELETE FROM cards").run();
    for (const card of cards) {
      insert.run(cardToRow(card));
    }
  });
}

function readReferencesPayload(db: AppDatabase): References {
  const row = db
    .prepare("SELECT payload FROM references_state WHERE id = 1")
    .get() as { payload: string } | undefined;
  if (!row) return createEmptyReferences();
  try {
    return parseReferences(JSON.parse(row.payload) as Partial<References>);
  } catch {
    return createEmptyReferences();
  }
}

function backfillAttributeReferencesFromCards(db: AppDatabase, refs: References): void {
  const rows = db
    .prepare("SELECT grading, protection, storage FROM cards")
    .all() as Record<string, unknown>[];

  for (const cardRow of rows) {
    syncCardAttributeReferences(refs, {
      grading: cardRow.grading == null ? null : String(cardRow.grading),
      protection:
        cardRow.protection == null ? null : String(cardRow.protection),
      storage: cardRow.storage == null ? null : String(cardRow.storage),
    });
  }
}

function normalizeReferenceStringList(values: string[]): string[] {
  return [...new Set(values.map((value) => normLabel(value)).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  );
}

function importReferences(db: AppDatabase, refs: References): void {
  const payload: References = {
    ...refs,
    gradings: normalizeReferenceStringList(refs.gradings),
    protections: normalizeReferenceStringList(refs.protections),
    storages: normalizeReferenceStringList(refs.storages),
  };
  db.prepare(
    "INSERT INTO references_state (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload"
  ).run(JSON.stringify(payload));
}

function seedAttributeReferencesIfEmpty(db: AppDatabase): void {
  const refs = readReferencesPayload(db);
  if (
    refs.gradings.length > 0 ||
    refs.protections.length > 0 ||
    refs.storages.length > 0
  ) {
    return;
  }
  applySeedAttributeReferences(refs);
  importReferences(db, refs);
}

function migrateOpeningDatesToFrench(db: AppDatabase): void {
  const rows = db
    .prepare("SELECT * FROM cards")
    .all() as Record<string, unknown>[];
  if (rows.length === 0) return;

  let changed = false;
  const cards = rows.map((row) => {
    const stored =
      row.opening_date == null ? null : String(row.opening_date);
    const card = rowToCard(row);
    if (card.openingDate !== stored) {
      changed = true;
    }
    return card;
  });

  if (changed) {
    importCards(db, cards);
  }
}

function ensureReferencesState(db: AppDatabase): void {
  const referencesCount = (
    db.prepare("SELECT COUNT(*) as count FROM references_state").get() as {
      count: number;
    }
  ).count;
  if (referencesCount === 0) {
    importReferences(db, createEmptyReferences());
  }
  seedAttributeReferencesIfEmpty(db);
}

function runSchemaMigrations(db: AppDatabase): void {
  const version = getSchemaVersion(db);
  if (version >= SCHEMA_VERSION) {
    return;
  }

  dbLogger.info({
    msg: `Starting migration v${version} → v${SCHEMA_VERSION} (${getDatabaseDisplayPath()})`,
  });

  try {
    if (version < 2) {
      dbLogger.info({ msg: "Applying v2: normalize opening dates" });
      migrateOpeningDatesToFrench(db);
    }

    if (version < 3) {
      dbLogger.info({ msg: "Applying v3: drop legacy french_players table" });
      db.exec("DROP TABLE IF EXISTS french_players");
    }

    if (version < 6) {
      dbLogger.info({ msg: "Applying v6: guides tables (wanted, fr_nba)" });
      if (version < 5) {
        db.exec(`
        CREATE TABLE IF NOT EXISTS guides_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          wanted_payload TEXT NOT NULL DEFAULT '[]',
          fr_nba_payload TEXT NOT NULL DEFAULT '[]'
        );
      `);
      }

      db.exec(`
      CREATE TABLE IF NOT EXISTS wanted_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_name TEXT NOT NULL,
        variation TEXT NOT NULL,
        slot INTEGER,
        player TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS fr_nba_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player TEXT NOT NULL,
        draft_year TEXT NOT NULL DEFAULT '',
        drafted_by TEXT NOT NULL DEFAULT '',
        rookie_card INTEGER,
        auto TEXT,
        patch INTEGER,
        immaculate INTEGER
      );
    `);
      seedGuidesTablesIfEmpty(db);
      db.exec("DROP TABLE IF EXISTS guides_state");
    }

    if (version < 7) {
      dbLogger.info({ msg: "Applying v7: card indexes" });
      db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cards_player ON cards(player);
      CREATE INDEX IF NOT EXISTS idx_cards_year ON cards(year);
      CREATE INDEX IF NOT EXISTS idx_cards_brand ON cards(brand);
      CREATE INDEX IF NOT EXISTS idx_cards_set_name ON cards(set_name);
      CREATE INDEX IF NOT EXISTS idx_cards_opening_date ON cards(opening_date);
      CREATE INDEX IF NOT EXISTS idx_cards_rookie ON cards(rookie);
      CREATE INDEX IF NOT EXISTS idx_cards_autograph ON cards(autograph);
    `);
    }

    if (version < 8) {
      dbLogger.info({ msg: "Applying v8: derived card columns and indexes" });
      if (!cardsTableHasColumn(db, "opening_date_sort")) {
        db.exec("ALTER TABLE cards ADD COLUMN opening_date_sort INTEGER");
      }
      if (!cardsTableHasColumn(db, "search_text")) {
        db.exec("ALTER TABLE cards ADD COLUMN search_text TEXT");
      }
      backfillCardDerivedColumns(db);
      db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cards_opening_date_sort ON cards(opening_date_sort);
      CREATE INDEX IF NOT EXISTS idx_cards_search_text ON cards(search_text);
      CREATE INDEX IF NOT EXISTS idx_cards_player_year ON cards(player, year);
      CREATE INDEX IF NOT EXISTS idx_cards_brand_set ON cards(brand, set_name);
    `);
    }

    if (version < 9) {
      dbLogger.info({ msg: "Applying v9: FTS5 full-text search" });
      migrateToFts5(db);
    }

    if (version < 10) {
      dbLogger.info({ msg: "Applying v10: card notes column" });
      if (!cardsTableHasColumn(db, "notes")) {
        db.exec("ALTER TABLE cards ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
      }
    }

    if (version < 11) {
      dbLogger.info({ msg: "Applying v11: fix silver variation typo" });
      migrateFixSilverVariationTypo(db);
    }

    if (version < 12) {
      dbLogger.info({ msg: "Applying v12: shipments table" });
      db.exec(`
      CREATE TABLE IF NOT EXISTS shipments (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL DEFAULT 'ebay',
        order_id TEXT,
        seller TEXT,
        description TEXT NOT NULL,
        price_cents INTEGER,
        currency TEXT NOT NULL DEFAULT 'EUR',
        ordered_at TEXT NOT NULL,
        shipped_at TEXT,
        tracking_number TEXT,
        carrier TEXT,
        expected_delivery TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        card_id TEXT,
        notes TEXT NOT NULL DEFAULT ''
      );

      CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
      CREATE INDEX IF NOT EXISTS idx_shipments_ordered_at ON shipments(ordered_at);
    `);
    }

    if (version < 13) {
      dbLogger.info({ msg: "Applying v13: backfill card attribute references" });
      migrateBackfillCardAttributeReferences(db);
    }

    if (version < 14) {
      dbLogger.info({ msg: "Applying v14: attribute references table" });
      migrateAttributeReferencesToTable();
    }

    if (version < 15) {
      dbLogger.info({ msg: "Applying v15: unify references storage" });
      migrateUnifyReferencesStorage(db);
    }

    if (version < 16) {
      dbLogger.info({ msg: "Applying v16: Fr NBA holdings model" });
      migrateFrNbaHoldingsModel(db);
    }

    if (version < 17) {
      dbLogger.info({ msg: "Applying v17: session metadata columns" });
      migrateSessionMetadata(db);
    }

    setSchemaVersion(db, SCHEMA_VERSION);
    dbLogger.info({ msg: `Migration complete (v${SCHEMA_VERSION})` });
  } catch (error) {
    dbLogger.error({ msg: "Migration failed", err: error });
    throw error;
  }
}

function migrateSessionMetadata(db: AppDatabase): void {
  if (!tableHasColumn(db, "sessions", "created_at")) {
    db.exec("ALTER TABLE sessions ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0");
  }
  if (!tableHasColumn(db, "sessions", "last_seen_at")) {
    db.exec("ALTER TABLE sessions ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0");
  }
  if (!tableHasColumn(db, "sessions", "user_agent")) {
    db.exec("ALTER TABLE sessions ADD COLUMN user_agent TEXT NOT NULL DEFAULT ''");
  }

  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    `UPDATE sessions
     SET created_at = CASE WHEN created_at = 0 THEN ? ELSE created_at END,
         last_seen_at = CASE WHEN last_seen_at = 0 THEN ? ELSE last_seen_at END
     WHERE created_at = 0 OR last_seen_at = 0`
  ).run(now, now);
}

function migrateFrNbaHoldingsModel(db: AppDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS fr_nba_holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      auto_style TEXT,
      rookie INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (player_id) REFERENCES fr_nba_players(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_fr_nba_holdings_player
      ON fr_nba_holdings(player_id);
  `);

  if (!tableHasColumn(db, "fr_nba_players", "rpa")) {
    db.exec("ALTER TABLE fr_nba_players ADD COLUMN rpa INTEGER");
  }

  if (!tableHasColumn(db, "fr_nba_players", "rookie_card")) {
    return;
  }

  const rows = db
    .prepare("SELECT * FROM fr_nba_players")
    .all() as Record<string, unknown>[];

  for (const row of rows) {
    const playerId = Number(row.id);
    const legacy = {
      rookieCard: nullableBoolFromDb(row.rookie_card),
      auto: row.auto == null ? null : String(row.auto),
      patch: nullableBoolFromDb(row.patch),
      immaculate: nullableBoolFromDb(row.immaculate),
    };
    const holdings = legacyFrNbaRowToHoldings(legacy);
    const rpa = deriveRpaObjectiveFromLegacy(legacy);

    db.prepare("UPDATE fr_nba_players SET rpa = ? WHERE id = ?").run(
      nullableBoolToDb(rpa),
      playerId
    );
    replaceFrNbaHoldings(db, playerId, holdings);
  }

  db.exec("ALTER TABLE fr_nba_players DROP COLUMN rookie_card");
  db.exec("ALTER TABLE fr_nba_players DROP COLUMN auto");
  db.exec("ALTER TABLE fr_nba_players DROP COLUMN patch");
  db.exec("ALTER TABLE fr_nba_players DROP COLUMN immaculate");
}

function readLegacyAttributeLabels(
  db: AppDatabase,
  category: "grading" | "protection" | "storage"
): string[] {
  try {
    const rows = db
      .prepare(
        "SELECT label FROM reference_attribute_items WHERE category = ? ORDER BY label COLLATE NOCASE ASC"
      )
      .all(category) as { label: string }[];
    return rows.map((row) => String(row.label));
  } catch {
    return [];
  }
}

function migrateUnifyReferencesStorage(db: AppDatabase): void {
  const refs = readReferencesPayload(db);
  const hasLegacyTable = Boolean(
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'reference_attribute_items'"
      )
      .get()
  );

  if (hasLegacyTable) {
    const gradings = readLegacyAttributeLabels(db, "grading");
    const protections = readLegacyAttributeLabels(db, "protection");
    const storages = readLegacyAttributeLabels(db, "storage");
    if (gradings.length > 0) refs.gradings = gradings;
    if (protections.length > 0) refs.protections = protections;
    if (storages.length > 0) refs.storages = storages;
  }

  applySeedAttributeReferences(refs);
  backfillAttributeReferencesFromCards(db, refs);
  importReferences(db, refs);

  if (hasLegacyTable) {
    db.exec("DROP INDEX IF EXISTS idx_reference_attribute_items_category");
    db.exec("DROP TABLE IF EXISTS reference_attribute_items");
  }
}

function migrateBackfillCardAttributeReferences(db: AppDatabase): void {
  const refs = readReferencesPayload(db);
  applySeedAttributeReferences(refs);
  backfillAttributeReferencesFromCards(db, refs);
  importReferences(db, refs);
}

function migrateAttributeReferencesToTable(): void {
  // Historique v14 — le stockage unifié est appliqué en v15.
}

function rebuildReferencesFromAllCards(db: AppDatabase): void {
  const current = readReferencesPayload(db);
  const refs: References = {
    ...createEmptyReferences(),
    gradings: [...current.gradings],
    protections: [...current.protections],
    storages: [...current.storages],
    brandSets: {},
    setVariations: {},
  };
  if (
    refs.gradings.length === 0 &&
    refs.protections.length === 0 &&
    refs.storages.length === 0
  ) {
    applySeedAttributeReferences(refs);
  }
  const rows = db
    .prepare(
      "SELECT player, team, year, brand, set_name, variation, grading, protection, storage FROM cards"
    )
    .all() as Record<string, unknown>[];

  for (const row of rows) {
    syncReferencesFromCard(refs, {
      player: String(row.player),
      team: String(row.team),
      year: row.year == null ? null : String(row.year),
      brand: String(row.brand),
      set: String(row.set_name),
      variation: String(row.variation),
      grading: String(row.grading ?? ""),
      protection: String(row.protection ?? ""),
      storage: String(row.storage ?? ""),
    });
  }

  importReferences(db, refs);
}

function migrateFixSilverVariationTypo(db: AppDatabase): void {
  const rows = db
    .prepare(
      `SELECT * FROM cards
       WHERE instr(variation, 'SIlver') > 0 OR variation GLOB '*  *'`
    )
    .all() as Record<string, unknown>[];

  const update = db.prepare(`
    UPDATE cards
    SET variation = @variation, search_text = @search_text
    WHERE id = @id
  `);

  runInTransaction(db, () => {
    for (const row of rows) {
      const card = rowToCardListItem(row);
      const variation = normalizeVariationLabel(card.variation);
      if (variation === card.variation) continue;
      const derived = cardDerivedRowFields({ ...card, variation });
      update.run({
        id: card.id,
        variation,
        search_text: derived.search_text,
      });
    }
  });
  rebuildReferencesFromAllCards(db);
}

function migrateToFts5(db: AppDatabase): void {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
      search_text,
      content='cards',
      content_rowid='rowid',
      tokenize='unicode61 remove_diacritics 2'
    );
  `);
  db.exec("INSERT INTO cards_fts(cards_fts) VALUES('rebuild');");
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS cards_fts_ai AFTER INSERT ON cards BEGIN
      INSERT INTO cards_fts(rowid, search_text) VALUES (new.rowid, new.search_text);
    END;
    CREATE TRIGGER IF NOT EXISTS cards_fts_ad AFTER DELETE ON cards BEGIN
      INSERT INTO cards_fts(cards_fts, rowid, search_text)
      VALUES ('delete', old.rowid, old.search_text);
    END;
    CREATE TRIGGER IF NOT EXISTS cards_fts_au AFTER UPDATE OF search_text ON cards BEGIN
      INSERT INTO cards_fts(cards_fts, rowid, search_text)
      VALUES ('delete', old.rowid, old.search_text);
      INSERT INTO cards_fts(rowid, search_text) VALUES (new.rowid, new.search_text);
    END;
  `);
  db.exec("DROP INDEX IF EXISTS idx_cards_search_text;");
}

function cardsTableHasColumn(db: AppDatabase, column: string): boolean {
  const rows = db.prepare("PRAGMA table_info(cards)").all() as { name: string }[];
  return rows.some((row) => row.name === column);
}

function backfillCardDerivedColumns(db: AppDatabase): void {
  const rows = db
    .prepare("SELECT * FROM cards")
    .all() as Record<string, unknown>[];
  if (rows.length === 0) return;

  const update = db.prepare(`
    UPDATE cards
    SET opening_date_sort = @opening_date_sort, search_text = @search_text
    WHERE id = @id
  `);

  runInTransaction(db, () => {
    for (const row of rows) {
      const card = rowToCardListItem(row);
      const derived = cardDerivedRowFields(card);
      update.run({
        id: card.id,
        opening_date_sort: derived.opening_date_sort,
        search_text: derived.search_text,
      });
    }
  });
}

function openDatabase(): AppDatabase {
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = createDatabase(dbPath);
  initSchema(db);
  runSchemaMigrations(db);
  if (!globalForDb.hobbyhoopsReferencesEnsured) {
    ensureReferencesState(db);
    globalForDb.hobbyhoopsReferencesEnsured = true;
  }
  return db;
}

export function getDb(): AppDatabase {
  if (!globalForDb.hobbyhoopsDb) {
    globalForDb.hobbyhoopsDb = openDatabase();
  }
  return globalForDb.hobbyhoopsDb;
}

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

export function countCards(whereSql: string, params: (string | number)[]): number {
  const sql = `SELECT COUNT(*) as count FROM cards ${whereSql}`;
  const row = getDb().prepare(sql).get(...params) as { count: number };
  return row.count;
}

const CARD_INSERT_SQL = `
  INSERT INTO cards (
    id, player, team, year, brand, set_name, variation,
    autograph, memorabilia, serial_number, serial_current, serial_total,
    card_number, grading, opening_date, protection, storage, photo,
    tradable, rookie, notes, opening_date_sort, search_text
  ) VALUES (
    @id, @player, @team, @year, @brand, @set_name, @variation,
    @autograph, @memorabilia, @serial_number, @serial_current, @serial_total,
    @card_number, @grading, @opening_date, @protection, @storage, @photo,
    @tradable, @rookie, @notes, @opening_date_sort, @search_text
  )
`;

const CARD_UPDATE_SQL = `
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
    photo = @photo,
    tradable = @tradable,
    rookie = @rookie,
    notes = @notes,
    opening_date_sort = @opening_date_sort,
    search_text = @search_text
  WHERE id = @id
`;

export function readCardById(id: string): Card | null {
  const row = getDb()
    .prepare("SELECT * FROM cards WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToCard(row) : null;
}

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

export function insertCard(card: Card): Card {
  const normalized = normalizeCardSerialFields(card);
  getDb().prepare(CARD_INSERT_SQL).run(cardToRow(normalized));
  return normalized;
}

export function updateCard(card: Card): Card | null {
  const normalized = normalizeCardSerialFields(card);
  const result = getDb().prepare(CARD_UPDATE_SQL).run(cardToRow(normalized));
  if (result.changes === 0) return null;
  return normalized;
}

export function deleteCard(id: string): boolean {
  const result = getDb().prepare("DELETE FROM cards WHERE id = ?").run(id);
  return result.changes > 0;
}

export function readCollectionStats(): CollectionStats {
  const row = getDb()
    .prepare(
      `SELECT
        COUNT(*) as total,
        COALESCE(SUM(autograph), 0) as autographs,
        COALESCE(SUM(memorabilia), 0) as memorabilia,
        COALESCE(SUM(CASE WHEN serial_number IS NOT NULL AND serial_number != '' THEN 1 ELSE 0 END), 0) as numbered,
        COALESCE(SUM(rookie), 0) as rookies,
        COALESCE(SUM(tradable), 0) as tradable
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
  };
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

export function readCardCountsByBrand(): ChartCountRow[] {
  return readCardCountsByColumn("brand");
}

export function readCardCountsByYear(): ChartCountRow[] {
  return readCardCountsByColumn("year");
}

export function readCardCountsBySet(): ChartCountRow[] {
  return readCardCountsByColumn("set_name");
}

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

export function readReferencesState(): References {
  return readReferencesPayload(getDb());
}

export function writeReferencesState(refs: References): void {
  importReferences(getDb(), refs);
}

export async function createDatabaseBackupFile(destPath: string): Promise<void> {
  await getDb().backup(destPath);
}

export function getDatabaseHealth(): { ok: boolean } {
  try {
    const dataDir = path.dirname(getDbPath());
    fs.accessSync(dataDir, fs.constants.W_OK);
    getDb();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function rowToShipment(row: Record<string, unknown>): Shipment {
  return {
    id: String(row.id),
    platform: String(row.platform) as Shipment["platform"],
    orderId: row.order_id == null ? null : String(row.order_id),
    seller: row.seller == null ? null : String(row.seller),
    description: String(row.description),
    priceCents: row.price_cents == null ? null : Number(row.price_cents),
    currency: String(row.currency || "EUR"),
    orderedAt: String(row.ordered_at),
    shippedAt: row.shipped_at == null ? null : String(row.shipped_at),
    trackingNumber:
      row.tracking_number == null ? null : String(row.tracking_number),
    carrier: row.carrier == null ? null : String(row.carrier),
    expectedDelivery:
      row.expected_delivery == null ? null : String(row.expected_delivery),
    status: String(row.status) as ShipmentStatus,
    cardId: row.card_id == null ? null : String(row.card_id),
    notes: String(row.notes ?? ""),
  };
}

const SHIPMENT_SELECT = `
  id, platform, order_id, seller, description, price_cents, currency,
  ordered_at, shipped_at, tracking_number, carrier, expected_delivery,
  status, card_id, notes
`.trim();

export function readShipments(includeReceived = false): Shipment[] {
  const sql = includeReceived
    ? `SELECT ${SHIPMENT_SELECT} FROM shipments ORDER BY ordered_at DESC`
    : `SELECT ${SHIPMENT_SELECT} FROM shipments WHERE status != 'received' ORDER BY ordered_at DESC`;
  const rows = getDb().prepare(sql).all() as Record<string, unknown>[];
  return rows.map(rowToShipment);
}

export function readShipmentById(id: string): Shipment | null {
  const row = getDb()
    .prepare(`SELECT ${SHIPMENT_SELECT} FROM shipments WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToShipment(row) : null;
}

export function insertShipment(
  input: Omit<Shipment, "id" | "cardId" | "shippedAt" | "status"> & {
    status?: ShipmentStatus;
    shippedAt?: string | null;
  }
): Shipment {
  const db = getDb();
  const id = randomUUID();
  const status = input.status ?? (input.trackingNumber ? "shipped" : "pending");
  const shippedAt =
    input.shippedAt ??
    (input.trackingNumber && status !== "pending" ? input.orderedAt : null);

  db.prepare(
    `INSERT INTO shipments (
      id, platform, order_id, seller, description, price_cents, currency,
      ordered_at, shipped_at, tracking_number, carrier, expected_delivery,
      status, card_id, notes
    ) VALUES (
      @id, @platform, @order_id, @seller, @description, @price_cents, @currency,
      @ordered_at, @shipped_at, @tracking_number, @carrier, @expected_delivery,
      @status, NULL, @notes
    )`
  ).run({
    id,
    platform: input.platform,
    order_id: input.orderId,
    seller: input.seller,
    description: input.description.trim(),
    price_cents: input.priceCents,
    currency: input.currency.trim() || "EUR",
    ordered_at: input.orderedAt,
    shipped_at: shippedAt,
    tracking_number: input.trackingNumber,
    carrier: input.carrier,
    expected_delivery: input.expectedDelivery,
    status,
    notes: input.notes.trim(),
  });

  return readShipmentById(id)!;
}

export function updateShipment(
  id: string,
  patch: Partial<
    Omit<Shipment, "id" | "cardId"> & { cardId?: string | null }
  >
): Shipment | null {
  const existing = readShipmentById(id);
  if (!existing) return null;

  const next: Shipment = {
    ...existing,
    ...patch,
    id: existing.id,
    description: patch.description?.trim() ?? existing.description,
    notes: patch.notes?.trim() ?? existing.notes,
    currency: patch.currency?.trim() || existing.currency,
  };

  if (
    patch.trackingNumber &&
    !patch.status &&
    existing.status === "pending"
  ) {
    next.status = "shipped";
    if (!next.shippedAt) {
      next.shippedAt = formatTodayIsoDateForDb();
    }
  }

  if (patch.status === "shipped" && !next.shippedAt) {
    next.shippedAt = formatTodayIsoDateForDb();
  }

  const result = getDb()
    .prepare(
      `UPDATE shipments SET
        platform = @platform,
        order_id = @order_id,
        seller = @seller,
        description = @description,
        price_cents = @price_cents,
        currency = @currency,
        ordered_at = @ordered_at,
        shipped_at = @shipped_at,
        tracking_number = @tracking_number,
        carrier = @carrier,
        expected_delivery = @expected_delivery,
        status = @status,
        card_id = @card_id,
        notes = @notes
      WHERE id = @id`
    )
    .run({
      id: next.id,
      platform: next.platform,
      order_id: next.orderId,
      seller: next.seller,
      description: next.description,
      price_cents: next.priceCents,
      currency: next.currency,
      ordered_at: next.orderedAt,
      shipped_at: next.shippedAt,
      tracking_number: next.trackingNumber,
      carrier: next.carrier,
      expected_delivery: next.expectedDelivery,
      status: next.status,
      card_id: next.cardId,
      notes: next.notes,
    });

  if (result.changes === 0) return null;
  return readShipmentById(id);
}

function formatTodayIsoDateForDb(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function deleteShipment(id: string): boolean {
  const result = getDb().prepare("DELETE FROM shipments WHERE id = ?").run(id);
  return result.changes > 0;
}
