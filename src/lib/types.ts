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
  photo: string | null;
  tradable: boolean;
  rookie: boolean;
  notes: string;
}

/** Carte sans photo — listes, pagination et fiches joueur. */
export type CardListItem = Omit<Card, "photo">;

export interface ReferencesFilterIndex {
  players: string[];
  teams: string[];
  years: string[];
  brands: string[];
  brandSets: Record<string, string[]>;
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
  set: string;
  variations: string[];
  entries: WantedEntry[];
}

export type FrNbaHoldingType = "auto" | "patch" | "rpa" | "immaculate";
export type FrNbaAutoStyle = "on_card" | "sticker";

export interface FrNbaHolding {
  id: number;
  type: FrNbaHoldingType;
  autoStyle: FrNbaAutoStyle | null;
  rookie: boolean;
}

export type FrNbaHoldingInput = Omit<FrNbaHolding, "id">;

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
  /** Variations connues par set (nom de set exact comme sur les cartes). */
  setVariations: Record<string, string[]>;
  variations: string[];
  gradings: string[];
  protections: string[];
  storages: string[];
}

export type ChartCountRow = { name: string; count: number };

export interface CollectionStats {
  total: number;
  autographs: number;
  memorabilia: number;
  numbered: number;
  rookies: number;
  tradable: number;
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
  setData: ChartCountRow[];
  playerData: ChartCountRow[];
  acquisitionData: ChartCountRow[];
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
