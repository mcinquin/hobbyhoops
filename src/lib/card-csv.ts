import { parseDelimitedRows } from "@/lib/csv-parse";
import { prepareCardWriteInput } from "@/lib/card-write";
import type { Card } from "@/lib/types";

/** Colonnes canoniques (en-tête export et référence import). */
export const CARD_CSV_COLUMNS = [
  "id",
  "player",
  "team",
  "year",
  "brand",
  "set",
  "variation",
  "autograph",
  "memorabilia",
  "rookie",
  "tradable",
  "serial_number",
  "serial_current",
  "serial_total",
  "card_number",
  "grading",
  "opening_date",
  "protection",
  "storage",
  "photo",
] as const;

export type CardCsvColumn = (typeof CARD_CSV_COLUMNS)[number];

export const CARD_CSV_HEADER = CARD_CSV_COLUMNS.join(",");

export const CARD_CSV_MAX_ROWS = 5_000;

const COLUMN_ALIASES: Record<string, CardCsvColumn> = {
  id: "id",
  player: "player",
  joueur: "player",
  name: "player",
  nom: "player",
  team: "team",
  club: "team",
  équipe: "team",
  equipe: "team",
  year: "year",
  annee: "year",
  année: "year",
  brand: "brand",
  marque: "brand",
  set: "set",
  variation: "variation",
  autograph: "autograph",
  auto: "autograph",
  autographe: "autograph",
  memorabilia: "memorabilia",
  memo: "memorabilia",
  patch: "memorabilia",
  rookie: "rookie",
  rc: "rookie",
  tradable: "tradable",
  echange: "tradable",
  échange: "tradable",
  serial_number: "serial_number",
  serial: "serial_number",
  serie: "serial_number",
  série: "serial_number",
  serial_current: "serial_current",
  serial_total: "serial_total",
  card_number: "card_number",
  cardnumber: "card_number",
  numero: "card_number",
  numéro: "card_number",
  number: "card_number",
  grading: "grading",
  gradation: "grading",
  opening_date: "opening_date",
  openingdate: "opening_date",
  date: "opening_date",
  date_ajout: "opening_date",
  protection: "protection",
  storage: "storage",
  rangement: "storage",
  photo: "photo",
};

export type CardCsvImportMode = "create" | "upsert";

export interface CardCsvImportRowError {
  row: number;
  message: string;
}

export interface CardCsvImportResult {
  created: number;
  updated: number;
  errors: CardCsvImportRowError[];
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatCsvBoolean(value: boolean): string {
  return value ? "true" : "false";
}

function parseCsvBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return ["1", "true", "yes", "oui", "y", "x"].includes(normalized);
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeHeaderCell(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function mapHeaderRow(cells: string[]): CardCsvColumn[] {
  return cells.map((cell) => {
    const key = normalizeHeaderCell(cell);
    return COLUMN_ALIASES[key] ?? (key as CardCsvColumn);
  });
}

function isHeaderRow(cells: string[]): boolean {
  return cells.some((cell) => {
    const key = normalizeHeaderCell(cell);
    return key in COLUMN_ALIASES;
  });
}

function cardToCsvRow(card: Card): string[] {
  return [
    card.id,
    card.player,
    card.team,
    card.year ?? "",
    card.brand,
    card.set,
    card.variation,
    formatCsvBoolean(card.autograph),
    formatCsvBoolean(card.memorabilia),
    formatCsvBoolean(card.rookie),
    formatCsvBoolean(card.tradable),
    card.serialNumber ?? "",
    card.serialCurrent == null ? "" : String(card.serialCurrent),
    card.serialTotal == null ? "" : String(card.serialTotal),
    card.cardNumber,
    card.grading,
    card.openingDate ?? "",
    card.protection,
    card.storage,
    card.photo ?? "",
  ];
}

export function cardsToCsv(cards: Card[]): string {
  const lines = [CARD_CSV_HEADER, ...cards.map((card) => cardToCsvRow(card).map(escapeCsvCell).join(","))];
  return `\uFEFF${lines.join("\n")}\n`;
}

export interface ParsedCardCsvRow {
  rowNumber: number;
  values: Partial<Record<CardCsvColumn, string>>;
}

export function parseCardCsv(text: string): ParsedCardCsvRow[] {
  const rows = parseDelimitedRows(text);
  if (rows.length === 0) return [];

  const hasHeader = isHeaderRow(rows[0]);
  const columns = hasHeader ? mapHeaderRow(rows[0]) : [...CARD_CSV_COLUMNS];
  const start = hasHeader ? 1 : 0;

  return rows.slice(start).flatMap((cells, index) => {
    if (cells.every((cell) => !cell.trim())) return [];

    const values: Partial<Record<CardCsvColumn, string>> = {};
    for (let i = 0; i < columns.length; i += 1) {
      const column = columns[i];
      if (!column || !CARD_CSV_COLUMNS.includes(column)) continue;
      values[column] = cells[i] ?? "";
    }

    return [{ rowNumber: start + index + 1, values }];
  });
}

export function csvRowToWritePayload(
  row: Partial<Record<CardCsvColumn, string>>,
  mode: CardCsvImportMode
): Record<string, unknown> {
  const rawId = row.id?.trim() ?? "";
  const payload = prepareCardWriteInput({
    player: row.player ?? "",
    team: row.team ?? "",
    year: row.year ?? "",
    brand: row.brand ?? "",
    set: row.set ?? "",
    variation: row.variation ?? "",
    autograph: parseCsvBoolean(row.autograph ?? ""),
    memorabilia: parseCsvBoolean(row.memorabilia ?? ""),
    rookie: parseCsvBoolean(row.rookie ?? ""),
    tradable: parseCsvBoolean(row.tradable ?? ""),
    serialNumber: row.serial_number ?? "",
    serialCurrent: parseOptionalInt(row.serial_current ?? ""),
    serialTotal: parseOptionalInt(row.serial_total ?? ""),
    cardNumber: row.card_number ?? "",
    grading: row.grading ?? "",
    openingDate: row.opening_date ?? "",
    protection: row.protection ?? "",
    storage: row.storage ?? "",
    photo: row.photo ?? "",
  });

  if (mode === "upsert" && rawId) {
    payload.id = rawId;
  }

  return payload;
}
