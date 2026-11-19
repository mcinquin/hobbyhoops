import type { ChartCountRow } from "./types";
import { dateLocaleTag } from "./locale-date";

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
  return new Intl.DateTimeFormat(dateLocaleTag(locale), {
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Turns `month_key` / `count` rows into chart data with localised month labels. */
export function mapAcquisitionTimelineRows(
  rows: { month_key: number; count: number }[],
  locale: "fr" | "en"
): ChartCountRow[] {
  return rows.map((row) => ({
    name: formatAcquisitionMonthLabel(Number(row.month_key), locale),
    count: Number(row.count),
  }));
}
