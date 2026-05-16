import Database from "better-sqlite3";

export type AppDatabase = Database.Database;

export function createDatabase(filePath: string): AppDatabase {
  return new Database(filePath);
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
