import wantedJson from "@/data/wanted.json";
import frNbaJson from "@/data/fr-nba.json";

export interface WantedEntry {
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
  player: string;
  draftYear: string;
  draftedBy: string;
  rookieCard: boolean | null;
  auto: string | null;
  patch: boolean | null;
  immaculate: boolean | null;
}

function normalizeAuto(value: string | null): string | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  if (lower === "on card") return "On card";
  if (lower === "sticker") return "Sticker";
  return value.trim();
}

export function getWantedBlocks(): WantedBlock[] {
  return wantedJson as WantedBlock[];
}

export function getFrNbaPlayers(): FrNbaPlayer[] {
  return (frNbaJson as FrNbaPlayer[]).map((row) => ({
    ...row,
    auto: normalizeAuto(row.auto),
  }));
}
