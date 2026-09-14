#!/usr/bin/env node
/**
 * Pre-flight checks for Docker startup.
 * Exits with code 1 on failure so Compose does not start the app server.
 *
 * Self-contained: only this file is copied into the production image (see Dockerfile).
 * Pino is resolved from /app/node_modules via the Next.js standalone output.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pino from "pino";

const LOG_LEVELS = new Set(["debug", "info", "warn", "error", "fatal", "trace"]);

function resolveLogLevel() {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (configured && LOG_LEVELS.has(configured)) {
    return configured;
  }
  return "info";
}

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(appRoot);

const log = pino({
  level: resolveLogLevel(),
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
}).child({ scope: "docker-ensure-db" });

/** Always print a plain line on stderr so Compose restart loops are diagnosable. */
function abort(detail, error) {
  const errMsg = error instanceof Error ? error.message : error ? String(error) : undefined;
  const hint = errMsg ? `${detail} (${errMsg})` : detail;
  console.error(`hobbyhoops: startup aborted — ${hint}`);
  log.error({
    msg: "Startup aborted",
    detail,
    ...(error ? { err: error } : {}),
  });
  process.exit(1);
}

const require = createRequire(import.meta.url);
const instrumentationPath = path.join(appRoot, ".next/server/instrumentation.js");

let register;
try {
  ({ register } = require(instrumentationPath));
} catch {
  abort("instrumentation module not found");
}

try {
  await register();
} catch (error) {
  abort(
    "AUTH_SECRET missing or too short (min 32 chars) — set it in .env",
    error
  );
}

const dbPath = path.resolve(
  appRoot,
  process.env.HOBBYHOOPS_DB_PATH?.trim() || "data/hobbyhoops.db"
);
const dataDir = path.dirname(dbPath);

try {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.accessSync(dataDir, fs.constants.W_OK);
} catch (error) {
  abort(
    `${dataDir} is not writable by UID 1111 — on the host run: sudo chown -R 1111:1111 data`,
    error
  );
}

try {
  const Database = (await import("better-sqlite3")).default;
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.prepare("SELECT 1").get();
  db.close();
} catch (error) {
  abort(
    `cannot open SQLite at ${dbPath} — check ownership/permissions of data/ (UID 1111)`,
    error
  );
}
