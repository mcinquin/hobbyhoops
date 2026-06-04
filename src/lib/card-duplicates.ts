import type { CardListItem, DuplicateCardGroup } from "./types";

export type DuplicateGroupRow = {
  player: string;
  year: string | null;
  brand: string;
  set_name: string;
  variation: string;
  card_number: string;
  serial_number: string;
  ids: string;
};

/** Regroupe des lignes SQL (GROUP_CONCAT ids) en groupes de doublons stricts. */
export function buildDuplicateGroups(
  rows: DuplicateGroupRow[],
  cardsById: Map<string, CardListItem>
): DuplicateCardGroup[] {
  const groups: DuplicateCardGroup[] = [];

  for (const row of rows) {
    const ids = row.ids
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const cards = ids
      .map((id) => cardsById.get(id))
      .filter((card): card is CardListItem => card != null);
    if (cards.length < 2) continue;

    groups.push({
      player: row.player,
      year: row.year == null || row.year === "" ? null : String(row.year),
      brand: row.brand,
      set: row.set_name,
      variation: row.variation,
      cardNumber: row.card_number,
      serialNumber: row.serial_number || "",
      cards,
    });
  }

  return groups.sort(
    (a, b) =>
      b.cards.length - a.cards.length ||
      a.player.localeCompare(b.player) ||
      a.set.localeCompare(b.set)
  );
}
