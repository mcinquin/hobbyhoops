import {
  formatIsoDateForInput,
  formatIsoDateLabel,
  formatTodayIsoDate,
  isValidCalendarDate,
  ISO_DATE_REGEX,
  parseDateInputToIso,
  parseIsoDate,
  type DateLocale,
} from "./locale-date";

export const OPENING_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toFrenchDate(day: number, month: number, year: number): string {
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

function openingDateToIso(value: string): string | null {
  const match = value.match(OPENING_DATE_REGEX);
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return parseIsoDate(iso) ? iso : null;
}

function isoToOpeningDate(iso: string): string | null {
  const match = iso.match(ISO_DATE_REGEX);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (!isValidCalendarDate(day, month, year)) return null;
  return toFrenchDate(day, month, year);
}

export function formatOpeningDateFrFromDate(date: Date): string {
  return toFrenchDate(date.getDate(), date.getMonth() + 1, date.getFullYear());
}

export function formatTodayOpeningDateFr(): string {
  return isoToOpeningDate(formatTodayIsoDate())!;
}

export function normalizeOpeningDate(
  value: string | null | undefined
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const french = trimmed.match(OPENING_DATE_REGEX);
  if (french) {
    const day = Number.parseInt(french[1], 10);
    const month = Number.parseInt(french[2], 10);
    const year = Number.parseInt(french[3], 10);
    if (!isValidCalendarDate(day, month, year)) return null;
    return toFrenchDate(day, month, year);
  }

  const iso = parseDateInputToIso(trimmed, "fr");
  if (iso) return isoToOpeningDate(iso);

  return null;
}

/** Entier YYYYMMDD pour tri SQL (colonne opening_date_sort). */
export function openingDateSortValue(
  value: string | null | undefined
): number | null {
  const normalized = normalizeOpeningDate(value);
  if (!normalized) return null;
  const match = normalized.match(OPENING_DATE_REGEX);
  if (!match) return null;
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  return year * 10000 + month * 100 + day;
}

export function formatOpeningDateLabel(
  value: string | null | undefined,
  locale: DateLocale = "fr"
): string {
  const normalized = normalizeOpeningDate(value);
  if (!normalized) return "—";
  const iso = openingDateToIso(normalized);
  if (!iso) return "—";
  return formatIsoDateLabel(iso, locale);
}

export function formatOpeningDateForInput(
  value: string | null | undefined,
  locale: DateLocale = "fr"
): string {
  const normalized = normalizeOpeningDate(value);
  if (!normalized) return "";
  const iso = openingDateToIso(normalized);
  if (!iso) return "";
  return formatIsoDateForInput(iso, locale);
}

export function parseOpeningDateInput(
  value: string | null | undefined,
  locale: DateLocale = "fr"
): string | null {
  const iso = parseDateInputToIso(value, locale);
  if (!iso) return null;
  return isoToOpeningDate(iso);
}
