#!/usr/bin/env node
/**
 * Pre-flight database migration for Docker startup.
 * Exits with code 1 on failure so Compose does not start the app server.
 *
 * Self-contained: only this file is copied into the production image (see Dockerfile).
 * Pino is resolved from /app/node_modules via the Next.js standalone output.
 */
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

const require = createRequire(import.meta.url);
const instrumentationPath = path.join(appRoot, ".next/server/instrumentation.js");

let register;
try {
  ({ register } = require(instrumentationPath));
} catch {
  log.error({
    msg: "Startup aborted",
    detail: "instrumentation module not found",
  });
  process.exit(1);
}

try {
  await register();
} catch (error) {
  log.error({ msg: "Startup aborted", err: error });
  process.exit(1);
}
