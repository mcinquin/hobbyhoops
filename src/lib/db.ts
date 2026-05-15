import fs from "fs";
import path from "path";
import type { SQLInputValue } from "node:sqlite";
import type { Card, FrenchPlayer, References } from "./types";
import { normalizeCardSerialFields } from "./card-serial";
import { normalizeOpeningDate } from "./opening-date";
import { readJsonFileSync } from "./json-store";
import { EMPTY_REFERENCES } from "./references-defaults";
import { createDatabase, runInTransaction, type AppDatabase } from "./sqlite";

const SCHEMA_VERSION = 2;

const globalForDb = globalThis as typeof globalThis & {
  hobbyhoopsDb?: AppDatabase;
};

function getDbPath(): string {
  const configured = process.env.HOBBYHOOPS_DB_PATH?.trim();
  if (configured) return configured;
  return path.join(process.cwd(), "data", "hobbyhoops.db");
}

function getDataDir(): string {
  return path.dirname(getDbPath());
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

    CREATE TABLE IF NOT EXISTS french_players (
      name TEXT PRIMARY KEY,
      draft_year INTEGER,
      drafted_by TEXT NOT NULL DEFAULT '',
      has_rookie_card INTEGER NOT NULL DEFAULT 0,
      auto_type TEXT,
      has_patch INTEGER NOT NULL DEFAULT 0,
      has_immaculate INTEGER NOT NULL DEFAULT 0
    );
  `);
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

function cardToRow(card: Card): Record<string, SQLInputValue> {
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

function importUsers(
  db: AppDatabase,
  users: { id: string; username: string; passwordHash: string }[]
): void {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO users (id, username, password_hash) VALUES (?, ?, ?)"
  );
  runInTransaction(db, () => {
    for (const user of users) {
      insert.run(user.id, user.username, user.passwordHash);
    }
  });
}

function importSessions(
  db: AppDatabase,
  sessions: { id: string; userId: string; exp: number }[]
): void {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO sessions (id, user_id, exp) VALUES (?, ?, ?)"
  );
  runInTransaction(db, () => {
    for (const session of sessions) {
      insert.run(session.id, session.userId, session.exp);
    }
  });
}

function importFrenchPlayers(db: AppDatabase, players: FrenchPlayer[]): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO french_players (
      name, draft_year, drafted_by, has_rookie_card, auto_type, has_patch, has_immaculate
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  runInTransaction(db, () => {
    for (const player of players) {
      insert.run(
        player.name,
        player.draftYear,
        player.draftedBy,
        player.hasRookieCard ? 1 : 0,
        player.autoType,
        player.hasPatch ? 1 : 0,
        player.hasImmaculate ? 1 : 0
      );
    }
  });
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

function migrateFromJsonIfNeeded(db: AppDatabase): void {
  const version = getSchemaVersion(db);
  if (version >= SCHEMA_VERSION) return;

  if (version < 1) {
    const dataDir = getDataDir();
    const cardsCount = (
      db.prepare("SELECT COUNT(*) as count FROM cards").get() as { count: number }
    ).count;

    if (cardsCount === 0) {
      const collectionPath = path.join(dataDir, "collection.json");
      const parsed = readJsonFileSync<unknown>(collectionPath, []);
      if (Array.isArray(parsed) && parsed.length > 0) {
        importCards(db, parsed as Card[]);
      }
    }

    const referencesCount = (
      db.prepare("SELECT COUNT(*) as count FROM references_state").get() as {
        count: number;
      }
    ).count;

    if (referencesCount === 0) {
      const referencesPath = path.join(dataDir, "references.json");
      const raw = readJsonFileSync<Partial<References>>(referencesPath, EMPTY_REFERENCES);
      importReferences(db, parseReferences(raw));
    }

    const usersCount = (
      db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }
    ).count;

    if (usersCount === 0) {
      const usersPath = path.join(dataDir, "users.json");
      const parsed = readJsonFileSync<unknown>(usersPath, []);
      if (Array.isArray(parsed)) {
        const users = parsed.filter(
          (user): user is { id: string; username: string; passwordHash: string } =>
            typeof user === "object" &&
            user !== null &&
            typeof (user as { id?: string }).id === "string" &&
            typeof (user as { username?: string }).username === "string" &&
            typeof (user as { passwordHash?: string }).passwordHash === "string"
        );
        if (users.length > 0) importUsers(db, users);
      }
    }

    const sessionsCount = (
      db.prepare("SELECT COUNT(*) as count FROM sessions").get() as { count: number }
    ).count;

    if (sessionsCount === 0) {
      const sessionsPath = path.join(dataDir, "sessions.json");
      const parsed = readJsonFileSync<unknown>(sessionsPath, []);
      if (Array.isArray(parsed)) {
        const sessions = parsed.filter(
          (session): session is { id: string; userId: string; exp: number } =>
            typeof session === "object" &&
            session !== null &&
            typeof (session as { id?: string }).id === "string" &&
            typeof (session as { userId?: string }).userId === "string" &&
            typeof (session as { exp?: number }).exp === "number"
        );
        if (sessions.length > 0) importSessions(db, sessions);
      }
    }

    const frenchPlayersCount = (
      db.prepare("SELECT COUNT(*) as count FROM french_players").get() as {
        count: number;
      }
    ).count;

    if (frenchPlayersCount === 0) {
      const frNbaPath = path.join(dataDir, "fr-nba.json");
      const parsed = readJsonFileSync<unknown>(frNbaPath, []);
      if (Array.isArray(parsed) && parsed.length > 0) {
        importFrenchPlayers(db, parsed as FrenchPlayer[]);
      }
    }
  }

  if (version < 2) {
    migrateOpeningDatesToFrench(db);
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
  migrateFromJsonIfNeeded(db);
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

export function readFrenchPlayers(): FrenchPlayer[] {
  const rows = getDb()
    .prepare(
      "SELECT name, draft_year, drafted_by, has_rookie_card, auto_type, has_patch, has_immaculate FROM french_players ORDER BY name"
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    name: String(row.name),
    draftYear: row.draft_year == null ? null : Number(row.draft_year),
    draftedBy: String(row.drafted_by),
    hasRookieCard: Boolean(row.has_rookie_card),
    autoType: row.auto_type == null ? null : String(row.auto_type),
    hasPatch: Boolean(row.has_patch),
    hasImmaculate: Boolean(row.has_immaculate),
  }));
}

export function getDatabaseHealth(): {
  ok: boolean;
  files: Record<string, boolean>;
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
    const frenchPlayers = (
      db.prepare("SELECT COUNT(*) as count FROM french_players").get() as {
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

    const files = {
      collection: cards > 0,
      references: references > 0,
      frNba: frenchPlayers > 0,
      users: users >= 0,
      sessions: sessions >= 0,
    };

    return {
      ok: files.collection && files.references && files.frNba,
      files,
    };
  } catch {
    return {
      ok: false,
      files: {
        collection: false,
        references: false,
        frNba: false,
        users: false,
        sessions: false,
      },
    };
  }
}
