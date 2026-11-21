/**
 * Shared settings for the end-to-end suite: server port, credentials and the
 * per-run temporary data directory (SQLite database, photos, auth state).
 */
import path from "node:path";

export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
export const BASE_URL = `http://localhost:${E2E_PORT}`;

/** Fixed test secrets: the server runs against a throwaway database only. */
export const E2E_AUTH_SECRET = "e2e-auth-secret-0123456789abcdef0123456789";
export const E2E_BOOTSTRAP_TOKEN = "e2e-bootstrap-token-0123456789abcdef";

export const ADMIN = {
  username: "e2e-admin",
  // MIN_PASSWORD_LENGTH is 24.
  password: "e2e-admin-password-0123456789",
} as const;

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const TMP_ROOT = path.join(PROJECT_ROOT, "e2e", ".tmp");

/**
 * Directory of the current run. The Playwright config sets `E2E_RUN_ID` once in
 * the runner process; workers inherit it, so they all point at the same folder.
 */
export function runDir(): string {
  const runId = process.env.E2E_RUN_ID;
  if (!runId) throw new Error("E2E_RUN_ID is not set (load playwright.config.ts).");
  return path.join(TMP_ROOT, runId);
}

/** Database path relative to the project root (`HOBBYHOOPS_DB_PATH` must stay inside it). */
export function dbPathRelative(): string {
  return path.relative(PROJECT_ROOT, path.join(runDir(), "hobbyhoops.db"));
}

/** Storage state (session + locale cookies) written by the bootstrap setup test. */
export function adminStorageStatePath(): string {
  return path.join(runDir(), "admin-storage-state.json");
}

/** English UI so assertions can use `messages/en.json`. */
export const LOCALE_COOKIE = {
  name: "hh_locale",
  value: "en",
  domain: "localhost",
  path: "/",
  httpOnly: true,
  secure: false,
  sameSite: "Strict" as const,
  expires: -1,
};
