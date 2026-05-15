import {
  uniqueBrandSetEntries,
  uniqueSetVariationEntries,
  uniqueStrings,
} from "./reference-mutations";

const DELIMITERS = [",", ";", "\t", "|"] as const;

function detectDelimiter(line: string): string {
  let best = ",";
  let bestCount = 0;
  for (const delimiter of DELIMITERS) {
    const count = line.split(delimiter).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = delimiter;
    }
  }
  return best;
}

function splitRow(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((cell) => cell.trim());
}

export function parseDelimitedRows(text: string): string[][] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) => splitRow(line, delimiter));
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
): { set: string; variation: string }[] {
  const rows = parseDelimitedRows(text);
  if (rows.length === 0) return [];

  const header = rows[0].map((cell) => cell.toLowerCase());
  const setIndex = header.findIndex((cell) => ["set"].includes(cell));
  const variationIndex = header.findIndex((cell) => ["variation"].includes(cell));
  const start = setIndex >= 0 && variationIndex >= 0 ? 1 : 0;

  return uniqueSetVariationEntries(
    rows.slice(start).flatMap((row) => {
      if (setIndex >= 0 && variationIndex >= 0) {
        const set = row[setIndex] ?? "";
        const variation = row[variationIndex] ?? "";
        return set && variation ? [{ set, variation }] : [];
      }
      if (row.length >= 2) {
        const [set, variation] = row;
        return set && variation ? [{ set, variation }] : [];
      }
      return [];
    })
  );
}
