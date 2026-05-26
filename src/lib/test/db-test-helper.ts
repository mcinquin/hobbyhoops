import type { AppDatabase } from "../sqlite";

const globalForDb = globalThis as typeof globalThis & {
  hobbyhoopsDb?: AppDatabase;
};

/** Fermeture du singleton SQLite (tests uniquement). */
export function resetDatabaseCacheForTests(): void {
  if (globalForDb.hobbyhoopsDb) {
    globalForDb.hobbyhoopsDb.close();
    globalForDb.hobbyhoopsDb = undefined;
  }
}
