import { mkdirSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import {
  adminStorageStatePath,
  BASE_URL,
  dbPathRelative,
  E2E_AUTH_SECRET,
  E2E_BOOTSTRAP_TOKEN,
  E2E_PORT,
  runDir,
} from "./e2e/support/env";

// One id per `playwright test` invocation. The runner loads this file first and
// sets the variable; workers inherit it and reuse the same data directory.
process.env.E2E_RUN_ID ??= `run-${Date.now().toString(36)}-${process.pid}`;

// /api/health (the readiness probe) needs the data directory to exist already.
mkdirSync(runDir(), { recursive: true });

const isCI = Boolean(process.env.CI);
// CI builds in a separate step; locally the web server builds first unless told not to.
const skipBuild = isCI || process.env.E2E_SKIP_BUILD === "1";
const startCommand = `npm run start -- --port ${E2E_PORT}`;

/**
 * End-to-end tests against a production build, on a throwaway SQLite database
 * created under `e2e/.tmp/<run id>/` (removed by the global teardown).
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.tmp/test-results",
  // The tests share one SQLite database and per-user rate limits: run serially.
  workers: 1,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: isCI ? [["github"], ["html", { open: "never", outputFolder: "e2e/.tmp/report" }]] : "list",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: adminStorageStatePath(),
      },
    },
  ],
  webServer: {
    command: skipBuild ? startCommand : `npm run build && ${startCommand}`,
    url: `${BASE_URL}/api/health`,
    // A server left from another run would point at another database.
    reuseExistingServer: false,
    timeout: (skipBuild ? 60 : 300) * 1000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      AUTH_SECRET: E2E_AUTH_SECRET,
      BOOTSTRAP_TOKEN: E2E_BOOTSTRAP_TOKEN,
      HOBBYHOOPS_DB_PATH: dbPathRelative(),
      COOKIE_SECURE: "false",
      TRUST_PROXY: "false",
      LOG_LEVEL: "warn",
      // Recognition calls are intercepted in the browser; never reach CardSight.
      CARDSIGHT_API_KEY: "",
    },
  },
});
