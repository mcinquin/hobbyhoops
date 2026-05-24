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

export interface FrNbaPlayer {
  id: number;
  player: string;
  draftYear: string;
  draftedBy: string;
  rookieCard: boolean | null;
  auto: string | null;
  patch: boolean | null;
  immaculate: boolean | null;
}

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
