import fs from "fs";
import path from "path";
import type { Card, FrNbaPlayer, References, WantedBlock } from "./types";
import { normalizeCardSerialFields } from "./card-serial";
import { normalizeOpeningDate } from "./opening-date";
import { EMPTY_REFERENCES } from "./references-defaults";
import { createDatabase, runInTransaction, type AppDatabase } from "./sqlite";

type SqlInputValue = string | number | bigint | Buffer | null;

const SCHEMA_VERSION = 6;

const globalForDb = globalThis as typeof globalThis & {
  hobbyhoopsDb?: AppDatabase;
};

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
      rookie INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exp INTEGER NOT NULL
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
      rookie_card INTEGER,
      auto TEXT,
      patch INTEGER,
      immaculate INTEGER
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

function normalizeFrNbaAuto(value: string | null): string | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  if (lower === "on card") return "On card";
  if (lower === "sticker") return "Sticker";
  return value.trim();
}

function rowToFrNbaPlayer(row: Record<string, unknown>): FrNbaPlayer {
  const auto = row.auto == null ? null : String(row.auto);
  return {
    player: String(row.player),
    draftYear: String(row.draft_year),
    draftedBy: String(row.drafted_by),
    rookieCard: nullableBoolFromDb(row.rookie_card),
    auto: normalizeFrNbaAuto(auto),
    patch: nullableBoolFromDb(row.patch),
    immaculate: nullableBoolFromDb(row.immaculate),
  };
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

function importFrNbaPlayers(db: AppDatabase, players: FrNbaPlayer[]): void {
  const insert = db.prepare(`
    INSERT INTO fr_nba_players (
      player, draft_year, drafted_by, rookie_card, auto, patch, immaculate
    ) VALUES (
      @player, @draft_year, @drafted_by, @rookie_card, @auto, @patch, @immaculate
    )
  `);

  runInTransaction(db, () => {
    db.prepare("DELETE FROM fr_nba_players").run();
    for (const player of players) {
      insert.run({
        player: player.player,
        draft_year: player.draftYear,
        drafted_by: player.draftedBy,
        rookie_card: nullableBoolToDb(player.rookieCard),
        auto: player.auto,
        patch: nullableBoolToDb(player.patch),
        immaculate: nullableBoolToDb(player.immaculate),
      });
    }
  });
}

function wantedBlocksFromRows(
  rows: { set_name: string; variation: string; slot: number | null; player: string }[]
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
      `SELECT set_name, variation, slot, player
       FROM wanted_entries
       ORDER BY set_name, variation, slot, player`
    )
    .all() as {
    set_name: string;
    variation: string;
    slot: number | null;
    player: string;
  }[];
  return wantedBlocksFromRows(rows);
}

export function readFrNbaPlayers(): FrNbaPlayer[] {
  const rows = getDb()
    .prepare(
      `SELECT player, draft_year, drafted_by, rookie_card, auto, patch, immaculate
       FROM fr_nba_players
       ORDER BY player COLLATE NOCASE`
    )
    .all() as Record<string, unknown>[];
  return rows.map(rowToFrNbaPlayer);
}

export function replaceAllWantedBlocks(blocks: WantedBlock[]): void {
  importWantedBlocks(getDb(), blocks);
}

export function replaceAllFrNbaPlayers(players: FrNbaPlayer[]): void {
  importFrNbaPlayers(getDb(), players);
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

function rowToCard(row: Record<string, unknown>): Card {
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
    photo: row.photo == null ? null : String(row.photo),
    tradable: Boolean(row.tradable),
    rookie: Boolean(row.rookie),
  });
}

function cardToRow(card: Card): Record<string, SqlInputValue> {
  const normalized = normalizeCardSerialFields(card);
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
  };
}

function importCards(db: AppDatabase, cards: Card[]): void {
  const insert = db.prepare(`
    INSERT INTO cards (
      id, player, team, year, brand, set_name, variation,
      autograph, memorabilia, serial_number, serial_current, serial_total,
      card_number, grading, opening_date, protection, storage, photo,
      tradable, rookie
    ) VALUES (
      @id, @player, @team, @year, @brand, @set_name, @variation,
      @autograph, @memorabilia, @serial_number, @serial_current, @serial_total,
      @card_number, @grading, @opening_date, @protection, @storage, @photo,
      @tradable, @rookie
    )
  `);

  runInTransaction(db, () => {
    db.prepare("DELETE FROM cards").run();
    for (const card of cards) {
      insert.run(cardToRow(card));
    }
  });
}

function importReferences(db: AppDatabase, refs: References): void {
  db.prepare(
    "INSERT INTO references_state (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload"
  ).run(JSON.stringify(refs));
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
    importReferences(db, EMPTY_REFERENCES);
  }
}

function runSchemaMigrations(db: AppDatabase): void {
  const version = getSchemaVersion(db);
  if (version >= SCHEMA_VERSION) return;

  if (version < 2) {
    migrateOpeningDatesToFrench(db);
  }

  if (version < 3) {
    db.exec("DROP TABLE IF EXISTS french_players");
  }

  if (version < 6) {
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

  setSchemaVersion(db, SCHEMA_VERSION);
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
  ensureReferencesState(db);
  return db;
}

export function getDb(): AppDatabase {
  if (!globalForDb.hobbyhoopsDb) {
    globalForDb.hobbyhoopsDb = openDatabase();
  }
  return globalForDb.hobbyhoopsDb;
}

export function readAllCards(): Card[] {
  const rows = getDb()
    .prepare("SELECT * FROM cards ORDER BY id")
    .all() as Record<string, unknown>[];
  return rows.map(rowToCard);
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
): Card[] {
  const orderColumn = options.sortColumn;
  const direction = options.sortDesc ? "DESC" : "ASC";
  const sql = `SELECT * FROM cards ${whereSql} ORDER BY ${orderColumn} ${direction}, id ASC LIMIT ? OFFSET ?`;
  const rows = getDb()
    .prepare(sql)
    .all(...params, options.limit, options.offset) as Record<string, unknown>[];
  return rows.map(rowToCard);
}

export function countCards(whereSql: string, params: (string | number)[]): number {
  const sql = `SELECT COUNT(*) as count FROM cards ${whereSql}`;
  const row = getDb().prepare(sql).get(...params) as { count: number };
  return row.count;
}

export function replaceAllCards(cards: Card[]): void {
  importCards(getDb(), cards);
}

export function readReferencesState(): References {
  const row = getDb()
    .prepare("SELECT payload FROM references_state WHERE id = 1")
    .get() as { payload: string } | undefined;
  if (!row) return { ...EMPTY_REFERENCES };
  try {
    return parseReferences(JSON.parse(row.payload) as Partial<References>);
  } catch {
    return { ...EMPTY_REFERENCES };
  }
}

export function writeReferencesState(refs: References): void {
  importReferences(getDb(), refs);
}

export function getDatabaseHealth(): {
  ok: boolean;
  data: Record<string, boolean>;
} {
  try {
    const db = getDb();
    const cards = (
      db.prepare("SELECT COUNT(*) as count FROM cards").get() as { count: number }
    ).count;
    const references = (
      db.prepare("SELECT COUNT(*) as count FROM references_state").get() as {
        count: number;
      }
    ).count;
    const users = (
      db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }
    ).count;
    const sessions = (
      db.prepare("SELECT COUNT(*) as count FROM sessions").get() as {
        count: number;
      }
    ).count;
    const wanted = (
      db.prepare("SELECT COUNT(*) as count FROM wanted_entries").get() as {
        count: number;
      }
    ).count;
    const frNba = (
      db.prepare("SELECT COUNT(*) as count FROM fr_nba_players").get() as {
        count: number;
      }
    ).count;

    return {
      ok: true,
      data: {
        cards: cards > 0,
        references: references > 0,
        users: users > 0,
        sessions: sessions > 0,
        wanted: wanted > 0,
        frNba: frNba > 0,
      },
    };
  } catch {
    return {
      ok: false,
      data: {
        cards: false,
        references: false,
        users: false,
        sessions: false,
        wanted: false,
        frNba: false,
      },
    };
  }
}
