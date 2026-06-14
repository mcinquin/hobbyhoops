export interface DatabaseFileMeta {
  displayPath: string;
  sizeBytes: number;
  journalMode: string;
  pageCount: number;
  pageSize: number;
  foreignKeys: boolean;
}

export interface SiteInfo {
  generatedAt: string;
  app: {
    version: string;
    nodeVersion: string;
    nodeEnv: string;
    platform: string;
    uptimeSeconds: number;
  };
  runtime: {
    trustProxy: boolean;
    cookieSecure: boolean;
  };
  database: DatabaseFileMeta & {
    schemaVersion: number;
    expectedSchemaVersion: number;
    schemaUpToDate: boolean;
    healthOk: boolean;
  };
  auth: {
    users: number;
    activeSessions: number;
  };
}
