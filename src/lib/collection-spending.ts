import { formatAcquisitionMonthLabel } from "./acquisition-timeline";
import { formatBrandSetLabel } from "./reference-mutations";

/** Priced cards aggregated per brand + set + currency (SQL row). */
export interface SpendingGroupRow {
  brand: string;
  set: string;
  currency: string;
  totalCents: number;
  count: number;
}

/** Priced cards aggregated per opening month (`YYYYMM`) + currency (SQL row). */
export interface SpendingMonthRow {
  monthKey: number;
  currency: string;
  totalCents: number;
}

interface SpendingCurrencyTotal {
  currency: string;
  totalCents: number;
  count: number;
}

/** Average purchase price of a brand or brand + set, in the main currency. */
export interface SpendingAverageRow {
  name: string;
  averageCents: number;
  count: number;
}

/** Spending figures for the dashboard. Breakdowns only use the main currency. */
export interface CollectionSpending {
  /** Currency with the most priced cards; null when no card has a price. */
  currency: string | null;
  /** Total per currency, main currency first. */
  totals: SpendingCurrencyTotal[];
  pricedCount: number;
  unpricedCount: number;
  /** Average price per priced card in the main currency. */
  averageCents: number | null;
  monthly: { name: string; totalCents: number }[];
  byBrand: SpendingAverageRow[];
  bySet: SpendingAverageRow[];
}

function averageRows(
  groups: Map<string, { totalCents: number; count: number }>,
  limit: number
): SpendingAverageRow[] {
  return [...groups.entries()]
    .map(([name, { totalCents, count }]) => ({
      name,
      averageCents: Math.round(totalCents / count),
      count,
    }))
    .sort((a, b) => b.averageCents - a.averageCents || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function addTo(
  map: Map<string, { totalCents: number; count: number }>,
  key: string,
  totalCents: number,
  count: number
): void {
  const existing = map.get(key) ?? { totalCents: 0, count: 0 };
  map.set(key, {
    totalCents: existing.totalCents + totalCents,
    count: existing.count + count,
  });
}

/**
 * Builds the dashboard spending summary. Amounts in different currencies are never
 * summed together: the totals are listed per currency, and the monthly / average
 * breakdowns use the main currency (the one with the most priced cards).
 */
export function buildCollectionSpending(
  input: {
    totalCards: number;
    groups: readonly SpendingGroupRow[];
    months: readonly SpendingMonthRow[];
  },
  locale: "fr" | "en",
  limit = 8
): CollectionSpending {
  const byCurrency = new Map<string, { totalCents: number; count: number }>();
  for (const row of input.groups) {
    addTo(byCurrency, row.currency, row.totalCents, row.count);
  }

  const totals = [...byCurrency.entries()]
    .map(([currency, { totalCents, count }]) => ({ currency, totalCents, count }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.totalCents - a.totalCents ||
        a.currency.localeCompare(b.currency)
    );

  const pricedCount = totals.reduce((sum, entry) => sum + entry.count, 0);
  const main = totals[0] ?? null;
  const currency = main?.currency ?? null;

  const brandGroups = new Map<string, { totalCents: number; count: number }>();
  const setGroups = new Map<string, { totalCents: number; count: number }>();
  for (const row of input.groups) {
    if (row.currency !== currency) continue;
    const brand = row.brand.trim();
    if (brand) addTo(brandGroups, brand, row.totalCents, row.count);
    const setLabel = row.set.trim() ? formatBrandSetLabel(brand, row.set.trim()) : "";
    if (setLabel) addTo(setGroups, setLabel, row.totalCents, row.count);
  }

  const monthly = input.months
    .filter((row) => row.currency === currency)
    .sort((a, b) => a.monthKey - b.monthKey)
    .map((row) => ({
      name: formatAcquisitionMonthLabel(row.monthKey, locale),
      totalCents: row.totalCents,
    }));

  return {
    currency,
    totals,
    pricedCount,
    unpricedCount: Math.max(0, input.totalCards - pricedCount),
    averageCents: main ? Math.round(main.totalCents / main.count) : null,
    monthly,
    byBrand: averageRows(brandGroups, limit),
    bySet: averageRows(setGroups, limit),
  };
}
