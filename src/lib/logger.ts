import "server-only";

import pino from "pino";

const LOG_LEVELS = new Set(["debug", "info", "warn", "error", "fatal", "trace"]);

function resolveLogLevel(): string {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (configured && LOG_LEVELS.has(configured)) {
    return configured;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export const rootLogger = pino({
  level: resolveLogLevel(),
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export function getLogger(scope: string): pino.Logger {
  return rootLogger.child({ scope });
}
