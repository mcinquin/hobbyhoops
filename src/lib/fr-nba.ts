import type {
  FrNbaAutoStyle,
  FrNbaHolding,
  FrNbaHoldingType,
  FrNbaPlayer,
} from "./types";

export const FR_NBA_HOLDING_TYPES: FrNbaHoldingType[] = [
  "simple",
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

/** Whether a holding type carries an autograph style (auto and RPA). */
export function holdingNeedsAutoStyle(type: FrNbaHoldingType): boolean {
  return type === "auto" || type === "rpa";
}

/** Display label for a holding: type, then autograph style and rookie flag when relevant. */
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

/** Whether the player has at least one holding of `type`. */
export function playerHasHoldingType(
  player: FrNbaPlayer,
  type: FrNbaHoldingType
): boolean {
  return player.holdings.some((holding) => holding.type === type);
}

/** Whether the player has an autographed holding with the given style. */
export function playerHasAutoStyle(
  player: FrNbaPlayer,
  style: FrNbaAutoStyle
): boolean {
  return player.holdings.some(
    (holding) =>
      holdingNeedsAutoStyle(holding.type) && holding.autoStyle === style
  );
}

/** Whether the player has at least one rookie holding. */
export function playerHasRookieHolding(player: FrNbaPlayer): boolean {
  return player.holdings.some((holding) => holding.rookie);
}

/** 0 = aucune carte associée, 1 = au moins une. */
export function frNbaMissingHoldingsPriority(player: FrNbaPlayer): 0 | 1 {
  return player.holdings.length === 0 ? 0 : 1;
}

/** Joueurs sans holdings d'abord, puis tri alphabétique du nom. */
export function compareFrNbaPlayersByMissingHoldings(
  a: FrNbaPlayer,
  b: FrNbaPlayer
): number {
  const priority =
    frNbaMissingHoldingsPriority(a) - frNbaMissingHoldingsPriority(b);
  if (priority !== 0) return priority;
  return a.player.localeCompare(b.player, undefined, { sensitivity: "base" });
}

interface FrNbaCollectionStats {
  total: number;
  rpaAcquired: number;
  rpaMissing: number;
  immaculateCount: number;
  holdingsCount: number;
}

/** Checklist counters: RPA objective acquired / missing, players with an Immaculate, holdings. */
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

/** RPA objective derived from the legacy rookie / auto / patch columns (migration). */
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

/** Autograph style read from the database or legacy labels, or null when unknown. */
export function normalizeFrNbaAutoStyleDb(
  value: string | null | undefined
): FrNbaAutoStyle | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  if (lower === "on_card" || lower === "on card") return "on_card";
  if (lower === "sticker") return "sticker";
  return null;
}

/** Autograph style as stored in the database. */
export function frNbaAutoStyleToDb(
  value: FrNbaAutoStyle | null
): string | null {
  return value;
}
