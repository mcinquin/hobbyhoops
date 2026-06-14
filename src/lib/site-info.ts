import "server-only";

import { APP_VERSION } from "@/lib/app-version";
import {
  EXPECTED_SCHEMA_VERSION,
  getDatabaseHealth,
  readAuthSiteCounts,
  readDatabaseFileMeta,
  readDatabaseSchemaVersion,
} from "@/lib/db";
import type { SiteInfo } from "@/lib/site-info-types";

export type { SiteInfo } from "@/lib/site-info-types";

export function getSiteInfo(): SiteInfo {
  const dbMeta = readDatabaseFileMeta();
  const schemaVersion = readDatabaseSchemaVersion();
  const health = getDatabaseHealth();
  const auth = readAuthSiteCounts();

  return {
    generatedAt: new Date().toISOString(),
    app: {
      version: APP_VERSION,
      nodeVersion: process.version,
      nodeEnv: process.env.NODE_ENV ?? "development",
      platform: process.platform,
      uptimeSeconds: Math.floor(process.uptime()),
    },
    runtime: {
      trustProxy: process.env.TRUST_PROXY === "true",
      cookieSecure: process.env.COOKIE_SECURE === "true",
    },
    database: {
      ...dbMeta,
      schemaVersion,
      expectedSchemaVersion: EXPECTED_SCHEMA_VERSION,
      schemaUpToDate: schemaVersion >= EXPECTED_SCHEMA_VERSION,
      healthOk: health.ok,
    },
    auth,
  };
}
