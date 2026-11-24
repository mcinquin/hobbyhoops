export interface Card {
  id: string;
  player: string;
  team: string;
  year: string | null;
  brand: string;
  set: string;
  variation: string;
  autograph: boolean;
  memorabilia: boolean;
  serialNumber: string | null;
  serialCurrent: number | null;
  serialTotal: number | null;
  cardNumber: string;
  grading: string;
  openingDate: string | null;
  protection: string;
  storage: string;
  photoFront: string | null;
  photoBack: string | null;
  tradable: boolean;
  rookie: boolean;
  wnba: boolean;
  notes: string;
  /** Purchase price in cents; null when unknown. */
  purchasePriceCents: number | null;
  /**
   * ISO 4217 code shared by every amount of the card (purchase price and fees, sale);
   * null when the card has no amount.
   */
  purchaseCurrency: string | null;
  /** Bought to be resold at a profit (shown on the investments page). */
  investment: boolean;
  /** Purchase fees (shipping, grading, taxes) in cents; null when unknown. */
  purchaseFeesCents: number | null;
  /** Sale date (ISO `YYYY-MM-DD`); null while the card is held. */
  soldAt: string | null;
  /** Sale price in cents; set together with `soldAt`. */
  salePriceCents: number | null;
  /** Sale fees (platform, shipping) in cents; null when none. */
  saleFeesCents: number | null;
}

/** Carte sans photos — listes, pagination et fiches joueur. */
export type CardListItem = Omit<Card, "photoFront" | "photoBack">;

export interface ReferencesFilterIndex {
  players: string[];
  teams: string[];
  years: string[];
  brands: string[];
  brandSets: Record<string, string[]>;
  /** Clés `${brand}\u0000${set}` → variations. */
  setVariations: Record<string, string[]>;
}

export interface PlayerCardGroup {
  groupKey: string;
  cards: CardListItem[];
}

export interface WantedEntry {
  id: number;
  variation: string;
  slot: number | null;
  player: string;
}

export interface WantedBlock {
  brand: string;
  set: string;
  variations: string[];
  entries: WantedEntry[];
}

export type FrNbaHoldingType =
  | "simple"
  | "auto"
  | "patch"
  | "rpa"
  | "immaculate";
export type FrNbaAutoStyle = "on_card" | "sticker";

export interface FrNbaHolding {
  id: number;
  type: FrNbaHoldingType;
  autoStyle: FrNbaAutoStyle | null;
  rookie: boolean;
}

type FrNbaHoldingInput = Omit<FrNbaHolding, "id">;

export interface FrNbaPlayer {
  id: number;
  player: string;
  draftYear: string;
  draftedBy: string;
  /** Objectif checklist : 1 RPA par joueur. */
  rpa: boolean | null;
  holdings: FrNbaHolding[];
}

export type FrNbaPlayerWrite = Omit<FrNbaPlayer, "id" | "holdings"> & {
  holdings: FrNbaHoldingInput[];
};

export interface References {
  players: string[];
  teams: string[];
  years: string[];
  brands: string[];
  sets: string[];
  /** Sets connus par marque (nom de marque exact comme sur les cartes). */
  brandSets: Record<string, string[]>;
  /**
   * Variations connues par marque+set.
   * Clé interne : `${brand}\u0000${set}` (voir brandSetKey).
   */
  setVariations: Record<string, string[]>;
  variations: string[];
  gradings: string[];
  protections: string[];
  storages: string[];
}

export type ChartCountRow = { name: string; count: number };

/** Set chart entry: display label plus the raw brand / set used for drill-down filters. */
export type SetChartCountRow = ChartCountRow & { brand: string; set: string };

export interface CollectionStats {
  total: number;
  autographs: number;
  memorabilia: number;
  numbered: number;
  rookies: number;
  tradable: number;
  /** Cartes taguées WNBA. Les cartes NBA sont déduites (total - wnba). */
  wnba: number;
}

type CardLeague = "nba" | "wnba";

interface LeagueCountRow {
  league: CardLeague;
  count: number;
}

export interface PlayerSummaryRow {
  name: string;
  team: string;
  count: number;
  autos: number;
  memos: number;
  serials: number;
  rookies: number;
}

export type PlayerPageSummary = Omit<PlayerSummaryRow, "name">;

export interface CardsPageResult {
  cards: CardListItem[];
  totalCount: number;
  pageCount: number;
  page: number;
  pageSize: number;
}

export interface DashboardChartData {
  brandData: ChartCountRow[];
  yearData: ChartCountRow[];
  setData: SetChartCountRow[];
  playerData: ChartCountRow[];
  acquisitionData: ChartCountRow[];
  leagueData: LeagueCountRow[];
}

export type ShipmentPlatform = "ebay" | "vinted" | "comc" | "private" | "other";

export type ShipmentStatus =
  | "pending"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "received"
  | "dispute";

export interface Shipment {
  id: string;
  platform: ShipmentPlatform;
  orderId: string | null;
  seller: string | null;
  description: string;
  priceCents: number | null;
  currency: string;
  orderedAt: string;
  shippedAt: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  expectedDelivery: string | null;
  status: ShipmentStatus;
  cardId: string | null;
  notes: string;
}

export interface DuplicateCardGroup {
  player: string;
  year: string | null;
  brand: string;
  set: string;
  variation: string;
  cardNumber: string;
  serialNumber: string;
  cards: CardListItem[];
}
