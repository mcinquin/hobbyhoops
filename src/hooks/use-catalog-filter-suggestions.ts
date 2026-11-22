"use client";

import { useMemo } from "react";
import {
  setsForBrandFilter,
  variationsForFilters,
} from "@/lib/collection-query";

type ReferenceFilterSource = Parameters<typeof setsForBrandFilter>[0];

/**
 * Set and variation suggestions for the column filters, narrowed to the
 * currently filtered brand (and set).
 */
export function useCatalogFilterSuggestions(
  references: ReferenceFilterSource,
  brand: string,
  set: string
) {
  const setSuggestions = useMemo(
    () => setsForBrandFilter(references, brand),
    [references, brand]
  );
  const variationSuggestions = useMemo(
    () => variationsForFilters(references, brand, set),
    [references, brand, set]
  );
  return { setSuggestions, variationSuggestions };
}
