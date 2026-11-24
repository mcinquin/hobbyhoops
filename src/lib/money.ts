/** Money helpers: amounts are stored as integer cents next to an ISO 4217 currency code. */

/** Currency used when a price is entered without one. */
export const DEFAULT_CURRENCY = "EUR";

/** Currencies offered in the price pickers (any ISO 4217 code is still accepted). */
export const PRICE_CURRENCIES = ["EUR", "USD", "GBP", "CAD", "CHF", "JPY"] as const;

/** ISO 4217 alphabetic code. */
export const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;

/** Upper bound of a single price, in cents (1 000 000.00). */
export const MAX_PRICE_CENTS = 100_000_000;

const AMOUNT_REGEX = /^\d+(?:[.,]\d{1,2})?$/;

/**
 * Parses a user-typed amount (`12`, `12.5`, `12,50`) to cents.
 *
 * @returns `null` for an empty input, `NaN` for an invalid one (negative, more than two
 * decimals, not a number…).
 */
export function parseAmountToCents(value: string | null | undefined): number | null {
  const trimmed = (value ?? "").trim().replace(/\s+/g, "");
  if (!trimmed) return null;
  if (!AMOUNT_REGEX.test(trimmed)) return Number.NaN;
  const [units, decimals = ""] = trimmed.replace(",", ".").split(".");
  return Number(units) * 100 + Number(decimals.padEnd(2, "0"));
}

/** Cents formatted as a plain decimal amount for inputs and CSV (`1250` → `12.50`). */
export function formatCentsAsAmount(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return "";
  const units = Math.trunc(cents / 100);
  const decimals = String(Math.abs(cents % 100)).padStart(2, "0");
  return `${units}.${decimals}`;
}

/** Normalises a currency code (`eur` → `EUR`), or null when empty. */
export function normalizeCurrency(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim().toUpperCase();
  return trimmed ? trimmed : null;
}

/** Localised money label from cents (`12,50 €` / `€12.50`), or null when the amount is unknown. */
export function formatMoney(
  cents: number | null | undefined,
  currency: string | null | undefined,
  locale: "fr" | "en" = "fr"
): string | null {
  if (cents == null || !Number.isFinite(cents)) return null;
  const code = normalizeCurrency(currency) ?? DEFAULT_CURRENCY;
  const tag = locale === "fr" ? "fr-FR" : "en-US";
  try {
    return new Intl.NumberFormat(tag, { style: "currency", currency: code }).format(
      cents / 100
    );
  } catch {
    // Unknown currency code: fall back to a plain amount followed by the code.
    return `${new Intl.NumberFormat(tag, { minimumFractionDigits: 2 }).format(cents / 100)} ${code}`;
  }
}

/** Money label with an explicit sign for gains (`+12,50 €`, `−3,00 €`), or null when unknown. */
export function formatSignedMoney(
  cents: number | null | undefined,
  currency: string | null | undefined,
  locale: "fr" | "en" = "fr"
): string | null {
  const label = formatMoney(cents == null ? cents : Math.abs(cents), currency, locale);
  if (label === null || cents == null) return null;
  if (cents > 0) return `+${label}`;
  if (cents < 0) return `−${label}`;
  return label;
}

/** Signed percentage of a ratio (`0.256` → `+25,6 %`), or null when unknown. */
export function formatSignedPercent(
  ratio: number | null | undefined,
  locale: "fr" | "en" = "fr"
): string | null {
  if (ratio == null || !Number.isFinite(ratio)) return null;
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "percent",
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(ratio);
}
