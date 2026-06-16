import { type LogLevel, writeLogRecord } from "./log-record";

type LogRecord = Record<string, unknown> & {
  msg: string;
  err?: unknown;
};

function log(level: LogLevel, scope: string, record: LogRecord): void {
  writeLogRecord(level, scope, record);
}

export function getClientLogger(scope: string) {
  return {
    debug: (record: LogRecord) => log("debug", scope, record),
    info: (record: LogRecord) => log("info", scope, record),
    warn: (record: LogRecord) => log("warn", scope, record),
    error: (record: LogRecord) => log("error", scope, record),
  };
}
