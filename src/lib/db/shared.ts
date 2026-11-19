/** Small SQL helpers and the shared `db` logger used across the database modules. */
import "server-only";

import { getLogger } from "../logger";
import type { AppDatabase } from "../sqlite";

export const dbLogger = getLogger("db");

export type SqlInputValue = string | number | bigint | Buffer | null;

/** SQLite integer (or NULL) to a tri-state boolean. */
export function nullableBoolFromDb(value: unknown): boolean | null {
  if (value == null) return null;
  return Boolean(value);
}

/** Tri-state boolean to a SQLite integer (or NULL). */
export function nullableBoolToDb(value: boolean | null): number | null {
  if (value == null) return null;
  return value ? 1 : 0;
}

/** Whether `table` has a column named `column` (used by migrations). */
export function tableHasColumn(
  db: AppDatabase,
  table: string,
  column: string
): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  return rows.some((row) => row.name === column);
}

/** Whether the `cards` table has a column named `column`. */
export function cardsTableHasColumn(db: AppDatabase, column: string): boolean {
  const rows = db.prepare("PRAGMA table_info(cards)").all() as { name: string }[];
  return rows.some((row) => row.name === column);
}

/** Database file path as configured (relative paths are kept for display). */
export function getDatabaseDisplayPath(): string {
  const configured = process.env.HOBBYHOOPS_DB_PATH?.trim();
  return configured || "data/hobbyhoops.db";
}
