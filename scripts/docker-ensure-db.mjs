#!/usr/bin/env node
/**
 * Pre-flight database migration for Docker startup.
 * Exits with code 1 on failure so Compose does not start the app server.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(appRoot);

const require = createRequire(import.meta.url);
const instrumentationPath = path.join(appRoot, ".next/server/instrumentation.js");

let register;
try {
  ({ register } = require(instrumentationPath));
} catch {
  console.error(
    "[hobbyhoops:db:migrate] Startup aborted: instrumentation module not found"
  );
  process.exit(1);
}

try {
  await register();
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[hobbyhoops:db:migrate] Startup aborted: ${detail}`);
  process.exit(1);
}
