/** Corrige la typo « SIlver » et les espaces multiples dans les libellés de variation. */
export function normalizeVariationLabel(variation: string): string {
  return variation.replace(/SIlver/g, "Silver").replace(/\s{2,}/g, " ").trim();
}
