import "server-only";

import fs from "fs";
import path from "path";
import type {
  Card,
  CardListItem,
  ChartCountRow,
  CollectionStats,
  FrNbaPlayer,
  PlayerCardGroup,
  PlayerPageSummary,
  PlayerSummaryRow,
  References,
  WantedBlock,
  WantedEntry,
} from "./types";
import { buildCardSearchText } from "./card-search-text";
import { normalizeCardSerialFields } from "./card-serial";
import { normalizeOpeningDate, openingDateSortValue } from "./opening-date";
import { COLLECTION_SORT_SQL } from "./collection-query";
import { EMPTY_REFERENCES } from "./references-defaults";

const PLAYER_CARD_STATS_AGG_SQL = `
  MIN(team) as team,
  COUNT(*) as count,
  COALESCE(SUM(autograph), 0) as autos,
  COALESCE(SUM(memorabilia), 0) as memos,
  COALESCE(SUM(CASE WHEN serial_number IS NOT NULL AND serial_number != '' THEN 1 ELSE 0 END), 0) as serials,
  COALESCE(SUM(rookie), 0) as rookies
`.trim();
import { createDatabase, runInTransaction, type AppDatabase } from "./sqlite";

const ALLOWED_SORT_COLUMNS = new Set(Object.values(COLLECTION_SORT_SQL));

type SqlInputValue = string | number | bigint | Buffer | null;

const SCHEMA_VERSION = 9;

const CARD_LIST_COLUMNS = `
  id, player, team, year, brand, set_name, variation,
  autograph, memorabilia, serial_number, serial_current, serial_total,
  card_number, grading, opening_date, protection, storage, tradable, rookie
`.trim();

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
      search_text TEXT
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
    id: Number(row.id),
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

export function readFrNbaPlayers(): FrNbaPlayer[] {
  const rows = getDb()
    .prepare(
      `SELECT id, player, draft_year, drafted_by, rookie_card, auto, patch, immaculate
       FROM fr_nba_players
       ORDER BY player COLLATE NOCASE`
    )
    .all() as Record<string, unknown>[];
  return rows.map(rowToFrNbaPlayer);
}

function frNbaPlayerToRow(
  player: Omit<FrNbaPlayer, "id">
): Record<string, SqlInputValue> {
  return {
    player: player.player.trim(),
    draft_year: player.draftYear.trim(),
    drafted_by: player.draftedBy.trim(),
    rookie_card: nullableBoolToDb(player.rookieCard),
    auto: player.auto,
    patch: nullableBoolToDb(player.patch),
    immaculate: nullableBoolToDb(player.immaculate),
  };
}

export function insertFrNbaPlayer(
  player: Omit<FrNbaPlayer, "id">
): FrNbaPlayer {
  const db = getDb();
  const row = frNbaPlayerToRow(player);
  const result = db
    .prepare(
      `INSERT INTO fr_nba_players (
        player, draft_year, drafted_by, rookie_card, auto, patch, immaculate
      ) VALUES (
        @player, @draft_year, @drafted_by, @rookie_card, @auto, @patch, @immaculate
      )`
    )
    .run(row);
  const id = Number(result.lastInsertRowid);
  return { id, ...player };
}

export function updateFrNbaPlayer(
  id: number,
  player: Omit<FrNbaPlayer, "id">
): FrNbaPlayer | null {
  const db = getDb();
  const row = frNbaPlayerToRow(player);
  const result = db
    .prepare(
      `UPDATE fr_nba_players SET
        player = @player,
        draft_year = @draft_year,
        drafted_by = @drafted_by,
        rookie_card = @rookie_card,
        auto = @auto,
        patch = @patch,
        immaculate = @immaculate
      WHERE id = @id`
    )
    .run({ ...row, id });
  if (result.changes === 0) return null;
  return {
    id,
    player: player.player.trim(),
    draftYear: player.draftYear.trim(),
    draftedBy: player.draftedBy.trim(),
    rookieCard: player.rookieCard,
    auto: player.auto,
    patch: player.patch,
    immaculate: player.immaculate,
  };
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
      tradable, rookie, opening_date_sort, search_text
    ) VALUES (
      @id, @player, @team, @year, @brand, @set_name, @variation,
      @autograph, @memorabilia, @serial_number, @serial_current, @serial_total,
      @card_number, @grading, @opening_date, @protection, @storage, @photo,
      @tradable, @rookie, @opening_date_sort, @search_text
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

  if (version < 7) {
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
    migrateToFts5(db);
  }

  setSchemaVersion(db, SCHEMA_VERSION);
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
  ensureReferencesState(db);
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
    tradable, rookie, opening_date_sort, search_text
  ) VALUES (
    @id, @player, @team, @year, @brand, @set_name, @variation,
    @autograph, @memorabilia, @serial_number, @serial_current, @serial_total,
    @card_number, @grading, @opening_date, @protection, @storage, @photo,
    @tradable, @rookie, @opening_date_sort, @search_text
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
