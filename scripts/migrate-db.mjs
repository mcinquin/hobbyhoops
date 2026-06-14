#!/usr/bin/env node
/**
 * Applique les migrations SQLite en attente sur la base locale.
 * Usage : npm run db:migrate [chemin/vers/hobbyhoops.db]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = path.resolve(root, process.argv[2] ?? path.join("data", "hobbyhoops.db"));

if (!fs.existsSync(dbPath)) {
  console.error(`Base introuvable : ${dbPath}`);
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["vitest", "run", "src/lib/db-migration.test.ts"],
  {
    cwd: root,
    env: {
      ...process.env,
      HOBBYHOOPS_DB_PATH: dbPath,
      RUN_DB_MIGRATE: "1",
    },
    stdio: "inherit",
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const Database = (await import("better-sqlite3")).default;
const db = new Database(dbPath, { readonly: true });
const version = db
  .prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'")
  .get()?.value;
const players = db.prepare("SELECT COUNT(*) as n FROM fr_nba_players").get().n;
const holdings = db
  .prepare("SELECT COUNT(*) as n FROM fr_nba_holdings")
  .get().n;
db.close();

console.log(`Migration OK — schema v${version}, ${players} joueurs Fr NBA, ${holdings} cartes détenues.`);
