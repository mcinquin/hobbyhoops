/** Database connection (singleton), file metadata, health and backup. */
import "server-only";

import fs from "fs";
import path from "path";
import type { DatabaseFileMeta } from "../site-info-types";
import { createDatabase, type AppDatabase } from "../sqlite";
import { ensureReferencesState } from "./reference-rows";
import { initSchema, getSchemaVersion, runSchemaMigrations } from "./schema";
import { getDatabaseDisplayPath } from "./shared";

const globalForDb = globalThis as typeof globalThis & {
  hobbyhoopsDb?: AppDatabase;
  hobbyhoopsReferencesEnsured?: boolean;
};

/** Schema version currently recorded in the database. */
export function readDatabaseSchemaVersion(): number {
  return getSchemaVersion(getDb());
}

/** File and pragma information about the SQLite database, for the admin site-info tab. */
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

interface AuthSiteCounts {
  users: number;
  activeSessions: number;
}

/** Number of users and of non-expired sessions. */
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

/**
 * Shared database connection; opens the file, creates the schema and runs migrations on
 * first use.
 */
export function getDb(): AppDatabase {
  if (!globalForDb.hobbyhoopsDb) {
    globalForDb.hobbyhoopsDb = openDatabase();
  }
  return globalForDb.hobbyhoopsDb;
}

/** Writes a consistent online backup of the database to `destPath`. */
export async function createDatabaseBackupFile(destPath: string): Promise<void> {
  await getDb().backup(destPath);
}

/** Health probe: the data directory is writable and the database opens. */
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
