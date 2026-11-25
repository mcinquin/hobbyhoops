import type { Card, Shipment } from "./types";
import { formatTodayOpeningDateFr } from "./opening-date";

const YEAR_RE = /\b((?:19|20)\d{2}(?:-\d{2})?)\b/;

/** Extracts a likely player name and year from a free-text shipment description. */
export function parseShipmentDescription(description: string): {
  player: string;
  year: string | null;
  remainder: string;
} {
  const trimmed = description.trim();
  if (!trimmed) {
    return { player: "", year: null, remainder: "" };
  }

  const yearMatch = trimmed.match(YEAR_RE);
  const year = yearMatch?.[1] ?? null;
  let player = trimmed;

  if (yearMatch && yearMatch.index != null) {
    player = trimmed.slice(0, yearMatch.index).trim();
  }

  if (!player) {
    player = trimmed;
  }

  const remainder = yearMatch
    ? trimmed.slice(yearMatch.index! + yearMatch[0].length).trim()
    : "";

  return { player, year, remainder };
}

/**
 * Card draft pre-filled from a received shipment (player, year, rest as variation,
 * provenance note).
 */
export function buildCardDraftFromShipment(
  shipment: Shipment,
  provenanceNote: string
): Partial<Card> {
  const parsed = parseShipmentDescription(shipment.description);

  return {
    player: parsed.player,
    team: "",
    year: parsed.year,
    brand: "",
    set: "",
    variation: parsed.remainder,
    autograph: false,
    memorabilia: false,
    serialNumber: null,
    serialCurrent: null,
    serialTotal: null,
    cardNumber: "",
    grading: "Ungraded",
    openingDate: formatTodayOpeningDateFr(),
    protection: "",
    storage: "",
    photoFront: null,
    photoBack: null,
    tradable: false,
    rookie: false,
    wnba: false,
    notes: provenanceNote,
    purchasePriceCents: shipment.priceCents,
    purchaseCurrency: shipment.priceCents == null ? null : shipment.currency,
    investment: false,
    purchaseFeesCents: null,
    soldAt: null,
    salePriceCents: null,
    saleFeesCents: null,
  };
}
