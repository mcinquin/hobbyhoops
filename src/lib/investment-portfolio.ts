import { formatAcquisitionMonthLabel } from "./acquisition-timeline";
import { ISO_DATE_REGEX, parseIsoDate } from "./locale-date";
import { DEFAULT_CURRENCY } from "./money";
import { openingDateSortValue } from "./opening-date";
import type { CardListItem } from "./types";

/** A valuation becomes stale after this many days without a new reading. */
export const STALE_VALUATION_DAYS = 90;

/** Months shown in the portfolio value chart. */
const HISTORY_MONTHS = 24;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** One valuation reading of a card (`card_valuations` row). */
export interface CardValuation {
  id: number;
  cardId: string;
  valueCents: number;
  currency: string;
  /** ISO `YYYY-MM-DD`. */
  valuedAt: string;
  /** `manual`, or the id of an automatic valuation provider. */
  source: string;
  note: string;
}

/** An investment card with its cost, latest value and gain. */
export interface InvestmentHolding {
  card: CardListItem;
  /** Currency of every amount below; null when the card has no amount. */
  currency: string | null;
  /** Purchase price + purchase fees; null when the purchase price is unknown. */
  costCents: number | null;
  /** Latest reading in the card's currency, null when there is none. */
  latestValuation: CardValuation | null;
  isSold: boolean;
  /** Sale price − sale fees (sold cards only). */
  netSaleCents: number | null;
  /** Unrealized gain (held, valued) or realized gain (sold); null when it can't be computed. */
  gainCents: number | null;
  /** `gainCents / costCents`; null when the cost is unknown or zero. */
  gainRatio: number | null;
  /** Days from the opening date to the sale date (or today). */
  daysHeld: number | null;
  /** Held card whose latest reading is older than `STALE_VALUATION_DAYS`. */
  isValuationStale: boolean;
}

/** Portfolio figures for one currency (only cards with a known purchase price). */
export interface InvestmentCurrencyTotals {
  currency: string;
  /** Cost of the held cards. */
  investedCents: number;
  /** Latest value of the held cards; cards never valued count at their cost. */
  currentValueCents: number;
  unrealizedGainCents: number;
  /** Cost of the sold cards. */
  soldCostCents: number;
  netSalesCents: number;
  realizedGainCents: number;
  /** Cards counted in these totals. */
  count: number;
}

/** Point of the portfolio value chart (main currency). */
export interface InvestmentHistoryPoint {
  name: string;
  valueCents: number;
  costCents: number;
}

/** Everything the investments page shows. Amounts are never summed across currencies. */
export interface InvestmentPortfolio {
  /** Currency with the most priced investment cards; null when none is priced. */
  currency: string | null;
  /** Totals per currency, main currency first. */
  totals: InvestmentCurrencyTotals[];
  held: InvestmentHolding[];
  sold: InvestmentHolding[];
  /** Held cards without any valuation. */
  unvaluedCount: number;
  /** Investment cards without a purchase price (left out of the totals). */
  unpricedCount: number;
  history: InvestmentHistoryPoint[];
}

/** `YYYYMMDD` key of an ISO date, or null when invalid. */
function isoDateKey(iso: string | null | undefined): number | null {
  if (!iso || !ISO_DATE_REGEX.test(iso) || !parseIsoDate(iso)) return null;
  return Number(iso.replaceAll("-", ""));
}

/** Local `Date` of a `YYYYMMDD` key. */
function keyToDate(key: number): Date {
  return new Date(Math.floor(key / 10000), (Math.floor(key / 100) % 100) - 1, key % 100);
}

function daysBetween(fromKey: number, toKey: number): number {
  return Math.max(
    0,
    Math.round((keyToDate(toKey).getTime() - keyToDate(fromKey).getTime()) / MS_PER_DAY)
  );
}

function ratio(gain: number | null, cost: number | null): number | null {
  if (gain == null || cost == null || cost <= 0) return null;
  return gain / cost;
}

/** Card currency (all its amounts share it). */
function cardCurrency(card: CardListItem): string | null {
  const hasAmount = [
    card.purchasePriceCents,
    card.purchaseFeesCents,
    card.salePriceCents,
    card.saleFeesCents,
  ].some((value) => value != null);
  return hasAmount ? (card.purchaseCurrency ?? DEFAULT_CURRENCY) : null;
}

/** Purchase price + fees, or null without a purchase price. */
export function investmentCostCents(card: CardListItem): number | null {
  if (card.purchasePriceCents == null) return null;
  return card.purchasePriceCents + (card.purchaseFeesCents ?? 0);
}

/** Readings in the card's currency, oldest first. */
function readingsFor(
  card: CardListItem,
  currency: string | null,
  valuations: readonly CardValuation[]
): CardValuation[] {
  return valuations
    .filter(
      (valuation) =>
        valuation.cardId === card.id &&
        (currency === null || valuation.currency === currency)
    )
    .sort((a, b) => a.valuedAt.localeCompare(b.valuedAt) || a.id - b.id);
}

/**
 * Builds one holding.
 *
 * @param todayKey today as `YYYYMMDD`, for days held and staleness.
 */
export function buildInvestmentHolding(
  card: CardListItem,
  valuations: readonly CardValuation[],
  todayKey: number
): InvestmentHolding {
  const currency = cardCurrency(card);
  const costCents = investmentCostCents(card);
  const readings = readingsFor(card, currency, valuations);
  const latestValuation = readings.at(-1) ?? null;
  const soldKey = isoDateKey(card.soldAt);
  const isSold = soldKey !== null && card.salePriceCents != null;
  const netSaleCents = isSold
    ? (card.salePriceCents ?? 0) - (card.saleFeesCents ?? 0)
    : null;

  let gainCents: number | null = null;
  if (costCents != null) {
    if (isSold) gainCents = (netSaleCents ?? 0) - costCents;
    else if (latestValuation) gainCents = latestValuation.valueCents - costCents;
  }

  const acquiredKey = openingDateSortValue(card.openingDate);
  const endKey = isSold ? soldKey : todayKey;
  const latestKey = isoDateKey(latestValuation?.valuedAt);

  return {
    card,
    currency,
    costCents,
    latestValuation,
    isSold,
    netSaleCents,
    gainCents,
    gainRatio: ratio(gainCents, costCents),
    daysHeld: acquiredKey !== null && endKey !== null ? daysBetween(acquiredKey, endKey) : null,
    isValuationStale:
      !isSold && latestKey !== null && daysBetween(latestKey, todayKey) > STALE_VALUATION_DAYS,
  };
}

function emptyTotals(currency: string): InvestmentCurrencyTotals {
  return {
    currency,
    investedCents: 0,
    currentValueCents: 0,
    unrealizedGainCents: 0,
    soldCostCents: 0,
    netSalesCents: 0,
    realizedGainCents: 0,
    count: 0,
  };
}

function buildTotals(holdings: readonly InvestmentHolding[]): InvestmentCurrencyTotals[] {
  const byCurrency = new Map<string, InvestmentCurrencyTotals>();
  for (const holding of holdings) {
    if (holding.costCents == null || holding.currency == null) continue;
    const totals = byCurrency.get(holding.currency) ?? emptyTotals(holding.currency);
    totals.count += 1;
    if (holding.isSold) {
      totals.soldCostCents += holding.costCents;
      totals.netSalesCents += holding.netSaleCents ?? 0;
      totals.realizedGainCents += holding.gainCents ?? 0;
    } else {
      const value = holding.latestValuation?.valueCents ?? holding.costCents;
      totals.investedCents += holding.costCents;
      totals.currentValueCents += value;
      totals.unrealizedGainCents += value - holding.costCents;
    }
    byCurrency.set(holding.currency, totals);
  }
  return [...byCurrency.values()].sort(
    (a, b) =>
      b.count - a.count ||
      b.investedCents - a.investedCents ||
      a.currency.localeCompare(b.currency)
  );
}

/** `YYYYMM` of a `YYYYMMDD` key. */
function monthOf(key: number): number {
  return Math.floor(key / 100);
}

function nextMonth(monthKey: number): number {
  const month = monthKey % 100;
  return month === 12 ? monthKey + 89 : monthKey + 1;
}

/** Last day key of a month (`YYYYMM31` sorts after every day of the month). */
function monthEndKey(monthKey: number): number {
  return monthKey * 100 + 31;
}

/**
 * Month-end value and cost of the cards held in the main currency. A card counts from its
 * opening date (or first reading) until its sale, at its latest reading so far, or its cost.
 */
function buildHistory(
  holdings: readonly InvestmentHolding[],
  valuations: readonly CardValuation[],
  currency: string | null,
  todayKey: number,
  locale: "fr" | "en"
): InvestmentHistoryPoint[] {
  if (currency === null) return [];
  const tracked = holdings
    .filter((holding) => holding.currency === currency && holding.costCents != null)
    .map((holding) => {
      const readings = readingsFor(holding.card, currency, valuations).map((valuation) => ({
        key: isoDateKey(valuation.valuedAt) ?? 0,
        valueCents: valuation.valueCents,
      }));
      const startKey = openingDateSortValue(holding.card.openingDate) ?? readings[0]?.key ?? null;
      const endKey = holding.isSold ? isoDateKey(holding.card.soldAt) : null;
      return { costCents: holding.costCents ?? 0, readings, startKey, endKey };
    })
    .filter((entry) => entry.startKey !== null);

  if (tracked.length === 0) return [];

  const lastMonth = monthOf(todayKey);
  const firstMonth = Math.min(...tracked.map((entry) => monthOf(entry.startKey ?? todayKey)));
  const months: number[] = [];
  for (let month = firstMonth; month <= lastMonth; month = nextMonth(month)) {
    months.push(month);
  }

  return months.slice(-HISTORY_MONTHS).map((month) => {
    const endOfMonth = monthEndKey(month);
    let valueCents = 0;
    let costCents = 0;
    for (const entry of tracked) {
      if ((entry.startKey ?? Infinity) > endOfMonth) continue;
      if (entry.endKey !== null && entry.endKey <= endOfMonth) continue;
      const reading = entry.readings.filter((r) => r.key <= endOfMonth).at(-1);
      costCents += entry.costCents;
      valueCents += reading?.valueCents ?? entry.costCents;
    }
    return { name: formatAcquisitionMonthLabel(month, locale), valueCents, costCents };
  });
}

/** Today's local date as a `YYYYMMDD` key. */
export function todayDateKey(now: Date = new Date()): number {
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

/**
 * Builds the investments page data from the investment cards and their readings.
 * Held cards are sorted by gain ratio (best first), sold cards by sale date (latest first).
 */
export function buildInvestmentPortfolio(
  input: { cards: readonly CardListItem[]; valuations: readonly CardValuation[] },
  locale: "fr" | "en",
  todayKey: number = todayDateKey()
): InvestmentPortfolio {
  const holdings = input.cards.map((card) =>
    buildInvestmentHolding(card, input.valuations, todayKey)
  );
  const totals = buildTotals(holdings);
  const currency = totals[0]?.currency ?? null;

  const held = holdings
    .filter((holding) => !holding.isSold)
    .sort(
      (a, b) =>
        (b.gainRatio ?? -Infinity) - (a.gainRatio ?? -Infinity) ||
        a.card.player.localeCompare(b.card.player)
    );
  const sold = holdings
    .filter((holding) => holding.isSold)
    .sort((a, b) => (b.card.soldAt ?? "").localeCompare(a.card.soldAt ?? ""));

  return {
    currency,
    totals,
    held,
    sold,
    unvaluedCount: held.filter((holding) => holding.latestValuation === null).length,
    unpricedCount: holdings.filter((holding) => holding.costCents === null).length,
    history: buildHistory(holdings, input.valuations, currency, todayKey, locale),
  };
}
