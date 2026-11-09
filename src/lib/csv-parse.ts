import { parse } from "csv-parse/sync";
import {
  uniqueBrandSetEntries,
  uniqueBrandSetVariationEntries,
  uniqueStrings,
} from "./reference-mutations";

const DELIMITERS = [",", ";", "\t", "|"] as const;

export function parseDelimitedRows(text: string): string[][] {
  return parse(text, {
    bom: true,
    delimiter: [...DELIMITERS],
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as string[][];
}

export function parseSingleColumnValues(text: string): string[] {
  const rows = parseDelimitedRows(text);
  if (rows.length === 0) return [];
  if (rows[0].length === 1) {
    return uniqueStrings(rows.map((row) => row[0]));
  }
  const header = rows[0].map((cell) => cell.toLowerCase());
  const preferred = ["player", "joueur", "name", "nom", "team", "club", "brand", "marque", "set", "variation", "year", "annee", "année"];
  const index = header.findIndex((cell) => preferred.includes(cell));
  const column = index >= 0 ? index : 0;
  const start = index >= 0 ? 1 : 0;
  return uniqueStrings(rows.slice(start).map((row) => row[column] ?? ""));
}

export function parseBrandSetRows(text: string): { brand: string; set: string }[] {
  const rows = parseDelimitedRows(text);
  if (rows.length === 0) return [];

  const header = rows[0].map((cell) => cell.toLowerCase());
  const brandIndex = header.findIndex((cell) => ["brand", "marque"].includes(cell));
  const setIndex = header.findIndex((cell) => ["set"].includes(cell));
  const start = brandIndex >= 0 && setIndex >= 0 ? 1 : 0;

  return uniqueBrandSetEntries(
    rows.slice(start).flatMap((row) => {
      if (brandIndex >= 0 && setIndex >= 0) {
        const brand = row[brandIndex] ?? "";
        const set = row[setIndex] ?? "";
        return brand && set ? [{ brand, set }] : [];
      }
      if (row.length >= 2) {
        const [brand, set] = row;
        return brand && set ? [{ brand, set }] : [];
      }
      return [];
    })
  );
}

export function parseSetVariationRows(
  text: string
): { brand: string; set: string; variation: string }[] {
  const rows = parseDelimitedRows(text);
  if (rows.length === 0) return [];

  const header = rows[0].map((cell) => cell.toLowerCase());
  const brandIndex = header.findIndex((cell) =>
    ["brand", "marque"].includes(cell)
  );
  const setIndex = header.findIndex((cell) => ["set"].includes(cell));
  const variationIndex = header.findIndex((cell) =>
    ["variation"].includes(cell)
  );
  const hasHeader =
    brandIndex >= 0 && setIndex >= 0 && variationIndex >= 0;
  const start = hasHeader ? 1 : 0;

  return uniqueBrandSetVariationEntries(
    rows.slice(start).flatMap((row) => {
      if (hasHeader) {
        const brand = row[brandIndex] ?? "";
        const set = row[setIndex] ?? "";
        const variation = row[variationIndex] ?? "";
        return brand && set && variation
          ? [{ brand, set, variation }]
          : [];
      }
      if (row.length >= 3) {
        const [brand, set, variation] = row;
        return brand && set && variation
          ? [{ brand, set, variation }]
          : [];
      }
      return [];
    })
  );
}
