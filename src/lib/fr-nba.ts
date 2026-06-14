import type {
  FrNbaAutoStyle,
  FrNbaHolding,
  FrNbaHoldingType,
  FrNbaPlayer,
} from "./types";

export const FR_NBA_HOLDING_TYPES: FrNbaHoldingType[] = [
  "auto",
  "patch",
  "rpa",
  "immaculate",
];

export const FR_NBA_AUTO_STYLES: FrNbaAutoStyle[] = ["on_card", "sticker"];

export interface FrNbaHoldingLabels {
  types: Record<FrNbaHoldingType, string>;
  autoStyles: Record<FrNbaAutoStyle, string>;
  rookie: string;
}

export function holdingNeedsAutoStyle(type: FrNbaHoldingType): boolean {
  return type === "auto" || type === "rpa";
}

export function formatFrNbaHoldingLabel(
  holding: FrNbaHolding,
  labels: FrNbaHoldingLabels
): string {
  const parts = [labels.types[holding.type]];
  if (
    holding.autoStyle &&
    holdingNeedsAutoStyle(holding.type)
  ) {
    parts.push(labels.autoStyles[holding.autoStyle]);
  }
  if (holding.rookie && holding.type !== "rpa") {
    parts.push(labels.rookie);
  }
  return parts.join(" · ");
}

export function playerHasHoldingType(
  player: FrNbaPlayer,
  type: FrNbaHoldingType
): boolean {
  return player.holdings.some((holding) => holding.type === type);
}

export function playerHasAutoStyle(
  player: FrNbaPlayer,
  style: FrNbaAutoStyle
): boolean {
  return player.holdings.some(
    (holding) =>
      holdingNeedsAutoStyle(holding.type) && holding.autoStyle === style
  );
}

export function playerHasRookieHolding(player: FrNbaPlayer): boolean {
  return player.holdings.some((holding) => holding.rookie);
}

export interface FrNbaCollectionStats {
  total: number;
  rpaAcquired: number;
  rpaMissing: number;
  immaculateCount: number;
  holdingsCount: number;
}

export function computeFrNbaCollectionStats(
  players: FrNbaPlayer[]
): FrNbaCollectionStats {
  let rpaAcquired = 0;
  let rpaMissing = 0;
  let immaculateCount = 0;
  let holdingsCount = 0;

  for (const player of players) {
    if (player.rpa === true) rpaAcquired += 1;
    else rpaMissing += 1;

    holdingsCount += player.holdings.length;
    if (playerHasHoldingType(player, "immaculate")) immaculateCount += 1;
  }

  return {
    total: players.length,
    rpaAcquired,
    rpaMissing,
    immaculateCount,
    holdingsCount,
  };
}

/** Convertit l'ancien modèle (colonnes booléennes) vers des holdings. */
export function legacyFrNbaRowToHoldings(input: {
  rookieCard: boolean | null;
  auto: string | null;
  patch: boolean | null;
  immaculate: boolean | null;
}): Omit<FrNbaHolding, "id">[] {
  const holdings: Omit<FrNbaHolding, "id">[] = [];
  const rookie = input.rookieCard === true;
  const hasPatch = input.patch === true;
  const autoStyle = normalizeLegacyAutoStyle(input.auto);
  const hasAuto = autoStyle != null;

  if (rookie && hasPatch && hasAuto) {
    holdings.push({ type: "rpa", autoStyle, rookie: true });
  } else {
    if (hasAuto) {
      holdings.push({ type: "auto", autoStyle, rookie });
    }
    if (hasPatch) {
      holdings.push({ type: "patch", autoStyle: null, rookie });
    }
  }

  if (input.immaculate === true) {
    holdings.push({ type: "immaculate", autoStyle: null, rookie: false });
  }

  return holdings;
}

export function deriveRpaObjectiveFromLegacy(input: {
  rookieCard: boolean | null;
  auto: string | null;
  patch: boolean | null;
}): boolean | null {
  const holdings = legacyFrNbaRowToHoldings({
    ...input,
    immaculate: null,
  });
  if (holdings.some((holding) => holding.type === "rpa")) return true;
  if (input.rookieCard === false || input.patch === false) return false;
  return null;
}

function normalizeLegacyAutoStyle(
  value: string | null
): FrNbaAutoStyle | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  if (lower === "on card") return "on_card";
  if (lower === "sticker") return "sticker";
  return null;
}

export function normalizeFrNbaAutoStyleDb(
  value: string | null | undefined
): FrNbaAutoStyle | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  if (lower === "on_card" || lower === "on card") return "on_card";
  if (lower === "sticker") return "sticker";
  return null;
}

export function frNbaAutoStyleToDb(
  value: FrNbaAutoStyle | null
): string | null {
  return value;
}
