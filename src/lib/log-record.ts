export type LogLevel = "debug" | "info" | "warn" | "error";

export type SerializedError = {
  type: string;
  message: string;
  stack?: string;
};

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      type: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    type: "Error",
    message: String(error),
  };
}

export function formatLogRecord(
  level: LogLevel,
  scope: string,
  record: Record<string, unknown>
): string {
  const { err, ...fields } = record;
  const payload: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    scope,
    ...fields,
  };

  if (err !== undefined) {
    payload.err = serializeError(err);
  }

  return JSON.stringify(payload);
}

export function writeLogRecord(
  level: LogLevel,
  scope: string,
  record: Record<string, unknown>
): void {
  const line = formatLogRecord(level, scope, record);

  switch (level) {
    case "error":
      console.error(line);
      return;
    case "warn":
      console.warn(line);
      return;
    default:
      console.log(line);
  }
}
