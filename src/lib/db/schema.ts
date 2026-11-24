/** Schema creation and versioned SQLite migrations. */
import "server-only";

import type { References } from "../types";
import { deriveRpaObjectiveFromLegacy, legacyFrNbaRowToHoldings } from "../fr-nba";
import {
  applySeedAttributeReferences,
  createEmptyReferences,
  migrateSetVariationsToBrandScope,
  syncReferencesFromCard,
} from "../reference-mutations";
import { normalizeVariationLabel } from "../variation-label";
import { runInTransaction, type AppDatabase } from "../sqlite";
import {
  dbLogger,
  nullableBoolFromDb,
  nullableBoolToDb,
  tableHasColumn,
  cardsTableHasColumn,
  getDatabaseDisplayPath,
} from "./shared";
import {
  rowToCardListItem,
  rowToCard,
  cardDerivedRowFields,
  importCards,
} from "./card-rows";
import { replaceFrNbaHoldings, seedGuidesTablesIfEmpty } from "./guide-rows";
import {
  readReferencesPayload,
  backfillAttributeReferencesFromCards,
  importReferences,
} from "./reference-rows";

const SCHEMA_VERSION = 21;

/** Version de schéma attendue par le code déployé (migrations SQLite). */
export const EXPECTED_SCHEMA_VERSION = SCHEMA_VERSION;

/** Applies connection pragmas and creates any missing table or index (idempotent). */
export function initSchema(db: AppDatabase): void {
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
      photo_front TEXT,
      photo_back TEXT,
      tradable INTEGER NOT NULL DEFAULT 0,
      rookie INTEGER NOT NULL DEFAULT 0,
      wnba INTEGER NOT NULL DEFAULT 0,
      opening_date_sort INTEGER,
      search_text TEXT,
      notes TEXT NOT NULL DEFAULT '',
      purchase_price_cents INTEGER,
      purchase_currency TEXT
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
      brand TEXT NOT NULL DEFAULT '',
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

/** Schema version stored in `schema_meta` (0 for a fresh database). */
export function getSchemaVersion(db: AppDatabase): number {
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

/** Runs, in order, every migration newer than the stored schema version. */
export function runSchemaMigrations(db: AppDatabase): void {
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

    if (version < 18) {
      dbLogger.info({ msg: "Applying v18: WNBA card flag" });
      if (!cardsTableHasColumn(db, "wnba")) {
        db.exec("ALTER TABLE cards ADD COLUMN wnba INTEGER NOT NULL DEFAULT 0");
      }
      db.exec("CREATE INDEX IF NOT EXISTS idx_cards_wnba ON cards(wnba)");
    }

    if (version < 19) {
      dbLogger.info({ msg: "Applying v19: split card photo into front/back" });
      if (
        cardsTableHasColumn(db, "photo") &&
        !cardsTableHasColumn(db, "photo_front")
      ) {
        db.exec("ALTER TABLE cards RENAME COLUMN photo TO photo_front");
      }
      if (!cardsTableHasColumn(db, "photo_front")) {
        db.exec("ALTER TABLE cards ADD COLUMN photo_front TEXT");
      }
      if (!cardsTableHasColumn(db, "photo_back")) {
        db.exec("ALTER TABLE cards ADD COLUMN photo_back TEXT");
      }
    }

    if (version < 20) {
      dbLogger.info({
        msg: "Applying v20: brand-scoped set variations and wanted brands",
      });
      migrateBrandScopedCatalog(db);
    }

    if (version < 21) {
      dbLogger.info({ msg: "Applying v21: card purchase price" });
      if (!cardsTableHasColumn(db, "purchase_price_cents")) {
        db.exec("ALTER TABLE cards ADD COLUMN purchase_price_cents INTEGER");
      }
      if (!cardsTableHasColumn(db, "purchase_currency")) {
        db.exec("ALTER TABLE cards ADD COLUMN purchase_currency TEXT");
      }
    }

    setSchemaVersion(db, SCHEMA_VERSION);
    dbLogger.info({ msg: `Migration complete (v${SCHEMA_VERSION})` });
  } catch (error) {
    dbLogger.error({ msg: "Migration failed", err: error });
    throw error;
  }
}

function brandsForSetFromCards(
  db: AppDatabase,
  setName: string
): string[] {
  const rows = db
    .prepare(
      `SELECT brand, COUNT(*) as count
       FROM cards
       WHERE brand != '' AND LOWER(set_name) = LOWER(?)
       GROUP BY brand
       ORDER BY count DESC, brand COLLATE NOCASE`
    )
    .all(setName) as { brand: string; count: number }[];
  return rows.map((row) => String(row.brand)).filter(Boolean);
}

function migrateBrandScopedCatalog(db: AppDatabase): void {
  if (!tableHasColumn(db, "wanted_entries", "brand")) {
    db.exec(
      "ALTER TABLE wanted_entries ADD COLUMN brand TEXT NOT NULL DEFAULT ''"
    );
  }

  const refs = readReferencesPayload(db);
  const fallbackBrandBySet: Record<string, string[]> = {};
  for (const setName of Object.keys(refs.setVariations)) {
    if (setName.includes("\u0000")) continue;
    fallbackBrandBySet[setName] = brandsForSetFromCards(db, setName);
  }
  migrateSetVariationsToBrandScope(refs, fallbackBrandBySet);
  importReferences(db, refs);

  const wantedRows = db
    .prepare(
      `SELECT id, set_name FROM wanted_entries
       WHERE brand IS NULL OR brand = ''`
    )
    .all() as { id: number; set_name: string }[];

  if (wantedRows.length === 0) return;

  const update = db.prepare(
    "UPDATE wanted_entries SET brand = ? WHERE id = ?"
  );
  const brandFromBrandSets = (setName: string): string | null => {
    const owners: string[] = [];
    for (const [brand, sets] of Object.entries(refs.brandSets)) {
      if (sets.some((set) => set.toLowerCase() === setName.toLowerCase())) {
        owners.push(brand);
      }
    }
    return owners.length === 1 ? owners[0] : null;
  };

  runInTransaction(db, () => {
    for (const row of wantedRows) {
      const fromRefs = brandFromBrandSets(row.set_name);
      const fromCards = brandsForSetFromCards(db, row.set_name);
      const brand = fromRefs ?? (fromCards.length === 1 ? fromCards[0] : "");
      if (brand) {
        update.run(brand, row.id);
      }
    }
  });
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
