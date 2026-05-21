export const OPENING_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isValidCalendarDate(day: number, month: number, year: number): boolean {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function toFrenchDate(day: number, month: number, year: number): string {
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

export function formatOpeningDateFrFromDate(date: Date): string {
  return toFrenchDate(date.getDate(), date.getMonth() + 1, date.getFullYear());
}

export function formatTodayOpeningDateFr(): string {
  return formatOpeningDateFrFromDate(new Date());
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

  const iso = trimmed.match(ISO_DATE_REGEX);
  if (iso) {
    const year = Number.parseInt(iso[1], 10);
    const month = Number.parseInt(iso[2], 10);
    const day = Number.parseInt(iso[3], 10);
    if (!isValidCalendarDate(day, month, year)) return null;
    return toFrenchDate(day, month, year);
  }

  return null;
}

export function openingDateTimestamp(value: string | null | undefined): number | null {
  const normalized = normalizeOpeningDate(value);
  if (!normalized) return null;
  const match = normalized.match(OPENING_DATE_REGEX);
  if (!match) return null;
  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  return new Date(year, month - 1, day).getTime();
}

export function compareOpeningDates(
  left: string | null | undefined,
  right: string | null | undefined
): number {
  const leftTs = openingDateTimestamp(left);
  const rightTs = openingDateTimestamp(right);
  if (leftTs == null && rightTs == null) return 0;
  if (leftTs == null) return 1;
  if (rightTs == null) return -1;
  return leftTs - rightTs;
}

export function formatOpeningDateLabel(
  value: string | null | undefined,
  locale: "fr" | "en" = "fr"
): string {
  const normalized = normalizeOpeningDate(value);
  if (!normalized) return "—";
  if (locale === "en") {
    const match = normalized.match(OPENING_DATE_REGEX);
    if (!match) return normalized;
    return `${match[2]}/${match[1]}/${match[3]}`;
  }
  return normalized;
}
