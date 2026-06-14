import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXPECTED_SCHEMA_VERSION,
  getDb,
  readFrNbaPlayers,
} from "@/lib/db";
import { resetDatabaseCacheForTests } from "@/lib/test/db-test-helper";

const shouldRun = process.env.RUN_DB_MIGRATE === "1";

describe.skipIf(!shouldRun)("database migrations", () => {
  const dbPath = path.resolve(
    process.env.HOBBYHOOPS_DB_PATH ?? path.join("data", "hobbyhoops.db")
  );

  it("applies pending schema migrations on open", () => {
    process.env.HOBBYHOOPS_DB_PATH = dbPath;
    resetDatabaseCacheForTests();

    getDb();
    const version = getDb()
      .prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'")
      .get() as { value: string } | undefined;

    expect(Number(version?.value)).toBe(EXPECTED_SCHEMA_VERSION);

    const players = readFrNbaPlayers();
    expect(players.length).toBeGreaterThan(0);
    expect(players[0]).toHaveProperty("holdings");
    expect(Array.isArray(players[0].holdings)).toBe(true);
    expect(players[0]).toHaveProperty("rpa");

    const holdingsTable = getDb()
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'fr_nba_holdings'"
      )
      .get();
    expect(holdingsTable).toBeTruthy();

    resetDatabaseCacheForTests();
  });
});
