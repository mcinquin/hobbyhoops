"use client";

import { useCallback } from "react";
import type { References } from "@/lib/types";
import {
  columnFilterPatch,
  type CollectionColumnFilterKey,
} from "@/lib/collection-query";
import type { CollectionUrlFilters } from "@/hooks/use-collection-url-filters";
import { useCatalogFilterSuggestions } from "@/hooks/use-catalog-filter-suggestions";
import { useTranslations } from "@/i18n/client";

/** Props shared by every admin column filter combobox, whatever the layout. */
export type AdminColumnFilter = {
  key: CollectionColumnFilterKey;
  value: string;
  placeholder: string;
  suggestions: string[];
  disabled?: boolean;
};

/** Applies a column filter (with catalog cascade) and goes back to page 1. */
export type ApplyAdminColumnFilter = (
  key: CollectionColumnFilterKey,
  value: string,
  opts: { immediate: boolean }
) => void;

/**
 * Admin cards column filters (player, team, year, brand, set, variation),
 * shared by the mobile filter stack and the desktop header row.
 */
export function useAdminColumnFilters(
  references: References,
  { filters, updateFilters }: CollectionUrlFilters
) {
  const t = useTranslations();
  const { setSuggestions, variationSuggestions } = useCatalogFilterSuggestions(
    references,
    filters.brand,
    filters.set
  );

  const applyFilter: ApplyAdminColumnFilter = useCallback(
    (key, value, opts) => {
      updateFilters({ ...columnFilterPatch(key, value), page: 1 }, opts);
    },
    [updateFilters]
  );

  const hasBrand = Boolean(filters.brand.trim());
  const columns: Record<CollectionColumnFilterKey, AdminColumnFilter> = {
    player: {
      key: "player",
      value: filters.player,
      placeholder: t("admin.cards.filterPlayerTeam"),
      suggestions: references.players,
    },
    team: {
      key: "team",
      value: filters.team,
      placeholder: t("admin.cards.filterTeam"),
      suggestions: references.teams,
    },
    year: {
      key: "year",
      value: filters.year,
      placeholder: t("admin.cards.filterYear"),
      suggestions: references.years,
    },
    brand: {
      key: "brand",
      value: filters.brand,
      placeholder: t("admin.cards.filterBrand"),
      suggestions: references.brands,
    },
    set: {
      key: "set",
      value: filters.set,
      placeholder: hasBrand ? t("admin.cards.filterSet") : t("cards.setNeedsBrand"),
      suggestions: setSuggestions,
      disabled: !hasBrand,
    },
    variation: {
      key: "variation",
      value: filters.variation,
      placeholder: t("admin.cards.filterVariation"),
      suggestions: variationSuggestions,
    },
  };

  return { columns, applyFilter };
}
