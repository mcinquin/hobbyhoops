import "server-only";

import Database from "better-sqlite3";

export type AppDatabase = Database.Database;

export function createDatabase(filePath: string): AppDatabase {
  const db = new Database(filePath);
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
  return db;
}

export function runInTransaction<T>(db: AppDatabase, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
