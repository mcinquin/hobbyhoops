import type { ChartCountRow } from "./types";

/** Entier YYYYMM dérivé de opening_date_sort (YYYYMMDD). */
export function openingDateSortToMonthKey(sortValue: number): number {
  return Math.floor(sortValue / 100);
}

/** Libellé mois pour graphique (monthKey = YYYYMM). */
export function formatAcquisitionMonthLabel(
  monthKey: number,
  locale: "fr" | "en"
): string {
  const year = Math.floor(monthKey / 100);
  const month = monthKey % 100;
  if (month < 1 || month > 12 || year < 1900) {
    return String(monthKey);
  }

  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

export function mapAcquisitionTimelineRows(
  rows: { month_key: number; count: number }[],
  locale: "fr" | "en"
): ChartCountRow[] {
  return rows.map((row) => ({
    name: formatAcquisitionMonthLabel(Number(row.month_key), locale),
    count: Number(row.count),
  }));
}
