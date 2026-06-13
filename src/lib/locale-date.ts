export type DateLocale = "fr" | "en";

export const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const SLASH_DATE_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function dateLocaleTag(locale: DateLocale): string {
  return locale === "fr" ? "fr-FR" : "en-US";
}

export function isValidCalendarDate(
  day: number,
  month: number,
  year: number
): boolean {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function parseIsoDate(value: string): Date | null {
  const match = value.match(ISO_DATE_REGEX);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (!isValidCalendarDate(day, month, year)) return null;
  return new Date(year, month - 1, day);
}

export function formatTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse une saisie (ISO ou jj/mm/aaaa | mm/dd/yyyy) vers ISO. */
export function parseDateInputToIso(
  value: string | null | undefined,
  locale: DateLocale = "fr"
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (ISO_DATE_REGEX.test(trimmed)) {
    return parseIsoDate(trimmed) ? trimmed : null;
  }

  const slash = trimmed.match(SLASH_DATE_REGEX);
  if (!slash) return null;

  const first = Number.parseInt(slash[1], 10);
  const second = Number.parseInt(slash[2], 10);
  const year = Number.parseInt(slash[3], 10);
  const day = locale === "en" ? second : first;
  const month = locale === "en" ? first : second;
  const isoValue = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return parseIsoDate(isoValue) ? isoValue : null;
}

export function formatIsoDateLabel(
  iso: string | null | undefined,
  locale: DateLocale = "fr",
  emptyLabel = "—"
): string {
  if (!iso) return emptyLabel;
  const parsed = parseIsoDate(iso);
  if (!parsed) return emptyLabel;
  return new Intl.DateTimeFormat(dateLocaleTag(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export function formatIsoDateForInput(
  iso: string | null | undefined,
  locale: DateLocale = "fr"
): string {
  if (!iso) return "";
  const label = formatIsoDateLabel(iso, locale, "");
  return label === "" ? "" : label;
}
