import { parseDelimitedRows } from "@/lib/csv-parse";
import { prepareCardWriteInput } from "@/lib/card-write";
import { formatCentsAsAmount } from "@/lib/money";
import type { Card } from "@/lib/types";

/** Colonnes canoniques (en-tête export et référence import). */
const CARD_CSV_COLUMNS = [
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
  "wnba",
  "serial_number",
  "serial_current",
  "serial_total",
  "card_number",
  "grading",
  "opening_date",
  "protection",
  "storage",
  "photo_front",
  "photo_back",
  "notes",
  "purchase_price",
  "purchase_currency",
  "investment",
  "purchase_fees",
  "sold_at",
  "sale_price",
  "sale_fees",
] as const;

type CardCsvColumn = (typeof CARD_CSV_COLUMNS)[number];

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
  wnba: "wnba",
  ligue: "wnba",
  league: "wnba",
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
  photo: "photo_front",
  photo_front: "photo_front",
  photofront: "photo_front",
  recto: "photo_front",
  photo_back: "photo_back",
  photoback: "photo_back",
  verso: "photo_back",
  notes: "notes",
  note: "notes",
  remarques: "notes",
  commentaire: "notes",
  comment: "notes",
  purchase_price: "purchase_price",
  purchaseprice: "purchase_price",
  price: "purchase_price",
  prix: "purchase_price",
  prix_achat: "purchase_price",
  "prix_d'achat": "purchase_price",
  cost: "purchase_price",
  coût: "purchase_price",
  cout: "purchase_price",
  purchase_currency: "purchase_currency",
  purchasecurrency: "purchase_currency",
  currency: "purchase_currency",
  devise: "purchase_currency",
  investment: "investment",
  investissement: "investment",
  purchase_fees: "purchase_fees",
  purchasefees: "purchase_fees",
  frais_achat: "purchase_fees",
  "frais_d'achat": "purchase_fees",
  sold_at: "sold_at",
  soldat: "sold_at",
  date_vente: "sold_at",
  date_de_vente: "sold_at",
  sale_price: "sale_price",
  saleprice: "sale_price",
  prix_vente: "sale_price",
  prix_de_vente: "sale_price",
  sale_fees: "sale_fees",
  salefees: "sale_fees",
  frais_vente: "sale_fees",
  frais_de_vente: "sale_fees",
};

export type CardCsvImportMode = "create" | "upsert";

interface CardCsvImportRowError {
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
    formatCsvBoolean(card.wnba),
    card.serialNumber ?? "",
    card.serialCurrent == null ? "" : String(card.serialCurrent),
    card.serialTotal == null ? "" : String(card.serialTotal),
    card.cardNumber,
    card.grading,
    card.openingDate ?? "",
    card.protection,
    card.storage,
    card.photoFront ?? "",
    card.photoBack ?? "",
    card.notes,
    formatCentsAsAmount(card.purchasePriceCents),
    card.purchaseCurrency ?? "",
    formatCsvBoolean(card.investment),
    formatCentsAsAmount(card.purchaseFeesCents),
    card.soldAt ?? "",
    formatCentsAsAmount(card.salePriceCents),
    formatCentsAsAmount(card.saleFeesCents),
  ];
}

/** Serialises cards to CSV (UTF-8 BOM for spreadsheet apps). */
export function cardsToCsv(cards: Card[]): string {
  const lines = [CARD_CSV_HEADER, ...cards.map((card) => cardToCsvRow(card).map(escapeCsvCell).join(","))];
  return `\uFEFF${lines.join("\n")}\n`;
}

interface ParsedCardCsvRow {
  rowNumber: number;
  values: Partial<Record<CardCsvColumn, string>>;
}

/** Parses CSV text into rows keyed by known columns, with their original line numbers. */
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

/** Converts a parsed CSV row to a card write payload (the id is kept for upserts only). */
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
    wnba: parseCsvBoolean(row.wnba ?? ""),
    serialNumber: row.serial_number ?? "",
    serialCurrent: parseOptionalInt(row.serial_current ?? ""),
    serialTotal: parseOptionalInt(row.serial_total ?? ""),
    cardNumber: row.card_number ?? "",
    grading: row.grading ?? "",
    openingDate: row.opening_date ?? "",
    protection: row.protection ?? "",
    storage: row.storage ?? "",
    photoFront: row.photo_front ?? "",
    photoBack: row.photo_back ?? "",
    notes: row.notes ?? "",
    purchasePriceCents: row.purchase_price ?? "",
    purchaseCurrency: row.purchase_currency ?? "",
    investment: parseCsvBoolean(row.investment ?? ""),
    purchaseFeesCents: row.purchase_fees ?? "",
    soldAt: row.sold_at ?? "",
    salePriceCents: row.sale_price ?? "",
    saleFeesCents: row.sale_fees ?? "",
  });

  if (mode === "upsert" && rawId) {
    payload.id = rawId;
  }

  return payload;
}
