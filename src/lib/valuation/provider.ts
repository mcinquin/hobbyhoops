import type { CardListItem } from "@/lib/types";

/** Value suggested by a valuation provider, in cents. */
export interface ValuationEstimate {
  valueCents: number;
  currency: string;
}

/**
 * Extension point for automatic valuations (e.g. a paid price-guide API). A provider's
 * `id` is stored as the `source` of the readings it creates; manual readings use
 * `MANUAL_VALUATION_SOURCE`. No provider is implemented yet.
 */
export interface ValuationProvider {
  id: string;
  /** Estimated current value of a card, or null when the provider has no match. */
  estimate(card: CardListItem): Promise<ValuationEstimate | null>;
}

/** `source` of a reading entered by hand. */
export const MANUAL_VALUATION_SOURCE = "manual";
