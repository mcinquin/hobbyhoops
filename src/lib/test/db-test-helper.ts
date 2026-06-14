import type { AppDatabase } from "../sqlite";

const globalForDb = globalThis as typeof globalThis & {
  hobbyhoopsDb?: AppDatabase;
  hobbyhoopsReferencesEnsured?: boolean;
};

/** Fermeture du singleton SQLite (tests uniquement). */
export function resetDatabaseCacheForTests(): void {
  if (globalForDb.hobbyhoopsDb) {
    globalForDb.hobbyhoopsDb.close();
    globalForDb.hobbyhoopsDb = undefined;
  }
  globalForDb.hobbyhoopsReferencesEnsured = undefined;
}
