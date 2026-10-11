import type {
  CardRecognitionSuggestion,
  RecognizedCard,
} from "@/lib/card-recognition/types";
import type { References } from "@/lib/types";
import { normalizeVariationLabel } from "@/lib/variation-label";

/** Folding accents/casse/ponctuation pour comparer des libellés. */
function fold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Libellé canonique des références si correspondance exacte après folding. */
function matchLabel(
  value: string,
  candidates: readonly string[]
): { value: string; matched: boolean } {
  const needle = fold(value);
  if (!needle) return { value: "", matched: false };
  const exact = candidates.find((candidate) => fold(candidate) === needle);
  return exact ? { value: exact, matched: true } : { value, matched: false };
}

/**
 * Années de références type « 2023-24 » : une année reconnue « 2023 »
 * correspond si elle est le premier segment du libellé.
 */
function matchYear(
  value: string,
  years: readonly string[]
): { value: string; matched: boolean } {
  const needle = value.trim();
  if (!needle) return { value: "", matched: false };
  const exact = years.find((year) => year.trim() === needle);
  if (exact) return { value: exact, matched: true };
  const prefixed = years.find((year) =>
    /^\d{4}/.test(needle)
      ? year.startsWith(needle) && /^[-/]/.test(year.slice(needle.length))
      : false
  );
  return prefixed
    ? { value: prefixed, matched: true }
    : { value: needle, matched: false };
}

/**
 * Rapproche un résultat de reconnaissance des références existantes :
 * renvoie les libellés canoniques quand ils existent (marque → sets liés →
 * variations liées), sinon la valeur brute du fournisseur (texte libre).
 */
export function buildCardSuggestion(
  recognized: RecognizedCard,
  references: References
): CardRecognitionSuggestion {
  const player = matchLabel(recognized.player, references.players);
  const year = matchYear(recognized.year, references.years);
  const brand = matchLabel(recognized.brand, references.brands);

  const setCandidates = brand.matched
    ? (references.brandSets[brand.value] ?? [])
    : references.sets;
  let set = matchLabel(recognized.set, setCandidates);
  if (!set.matched && brand.matched) {
    // Set inconnu sous cette marque : tenter les sets toutes marques.
    set = matchLabel(recognized.set, references.sets);
  }

  const normalizedVariation = normalizeVariationLabel(recognized.variation);
  const variationCandidates = set.matched
    ? (references.setVariations[set.value] ?? [])
    : references.variations;
  let variation = matchLabel(normalizedVariation, variationCandidates);
  if (!variation.matched && set.matched) {
    variation = matchLabel(normalizedVariation, references.variations);
  }

  return {
    ...recognized,
    player: player.value,
    year: year.value,
    brand: brand.value,
    set: set.value,
    variation: variation.value,
    matched: {
      player: player.matched,
      year: year.matched,
      brand: brand.matched,
      set: set.matched,
      variation: variation.matched,
    },
  };
}
