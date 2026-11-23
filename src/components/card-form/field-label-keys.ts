import type { CardFormField } from "@/lib/card-form-steps";

/** Label of each field, for validation messages that have no dedicated text. */
export const FIELD_LABEL_KEYS: Record<CardFormField, string> = {
  photoFront: "cards.photoFront",
  photoBack: "cards.photoBack",
  player: "cards.player",
  team: "cards.club",
  year: "cards.year",
  rookie: "badges.rookie",
  wnba: "badges.wnba",
  brand: "cards.brand",
  set: "cards.set",
  variation: "cards.variation",
  cardNumber: "cards.cardNum",
  serialNumber: "cards.serialNum",
  serialCurrent: "cards.serialNum",
  serialTotal: "cards.serialNum",
  autograph: "cards.autograph",
  memorabilia: "cards.memorabiliaLabel",
  openingDate: "cards.openingDate",
  grading: "cards.grading",
  protection: "cards.protection",
  storage: "cards.storage",
  tradable: "cards.tradable",
  notes: "cards.notes",
  purchasePriceCents: "cards.purchasePrice",
  purchaseCurrency: "cards.purchaseCurrency",
};
