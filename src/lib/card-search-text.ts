/** Texte dénormalisé indexé par FTS5 (`cards_fts`) pour la recherche globale. */
export function buildCardSearchText(fields: {
  player: string;
  team: string;
  year: string | null;
  brand: string;
  set: string;
  variation: string;
  cardNumber: string;
  serialNumber: string | null;
}): string {
  return [
    fields.player,
    fields.team,
    fields.year ?? "",
    fields.brand,
    fields.set,
    fields.variation,
    fields.cardNumber,
    fields.serialNumber ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
