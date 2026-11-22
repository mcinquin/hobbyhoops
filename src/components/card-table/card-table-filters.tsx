"use client";

import { useId } from "react";
import type { CollectionColumnFilterKey } from "@/lib/collection-query";
import type { ReferencesFilterIndex } from "@/lib/types";
import type { CardBadgeLabels } from "@/components/card-badges";
import { ColumnFilterCombobox } from "@/components/column-filter-combobox";
import { CollectionSearchInput } from "@/components/collection-search-input";
import { TagFilterChips } from "@/components/tag-filter-chips";
import type { CollectionUrlFilters } from "@/hooks/use-collection-url-filters";
import { useCatalogFilterSuggestions } from "@/hooks/use-catalog-filter-suggestions";
import { useTranslations } from "@/i18n/client";

interface CardTableFiltersProps {
  urlFilters: CollectionUrlFilters;
  referenceFilters: ReferencesFilterIndex;
  badgeLabels: CardBadgeLabels;
  onColumnFilter: (key: CollectionColumnFilterKey, value: string) => void;
}

/** Collection search field and column filters (player, team, year, catalog, tags). */
export function CardTableFilters({
  urlFilters: { filters, updateFilters, toggleTag },
  referenceFilters,
  badgeLabels,
  onColumnFilter,
}: CardTableFiltersProps) {
  const t = useTranslations();
  const yearSelectId = useId();
  const { setSuggestions, variationSuggestions } = useCatalogFilterSuggestions(
    referenceFilters,
    filters.brand,
    filters.set
  );
  const clearOptionLabel = t("cards.selectNone");

  return (
    <>
      <CollectionSearchInput
        urlValue={filters.search}
        onSearch={(value) => updateFilters({ search: value }, { immediate: true })}
        label={t("cards.searchAll")}
        placeholder={t("cards.searchAll")}
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
        <ColumnFilterCombobox
          value={filters.player}
          onChange={(value) => onColumnFilter("player", value)}
          placeholder={t("cards.filterPlayer")}
          suggestions={referenceFilters.players}
          clearOptionLabel={clearOptionLabel}
          className="h-9 text-xs lg:h-8 lg:w-40"
        />
        <ColumnFilterCombobox
          value={filters.team}
          onChange={(value) => onColumnFilter("team", value)}
          placeholder={t("cards.filterTeam")}
          suggestions={referenceFilters.teams}
          clearOptionLabel={clearOptionLabel}
          className="h-9 text-xs lg:h-8 lg:w-36"
        />
        <div className="flex flex-col gap-1">
          <label htmlFor={yearSelectId} className="sr-only">
            {t("cards.year")}
          </label>
          <select
            id={yearSelectId}
            value={filters.year}
            onChange={(e) =>
              updateFilters({ year: e.target.value }, { immediate: true })
            }
            className="h-9 rounded-md border border-input bg-background px-2 text-xs lg:h-8"
          >
            <option value="">{t("cards.allYears")}</option>
            {[...referenceFilters.years].reverse().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <ColumnFilterCombobox
          value={filters.brand}
          onChange={(value) => onColumnFilter("brand", value)}
          placeholder={t("cards.allBrands")}
          suggestions={referenceFilters.brands}
          clearOptionLabel={clearOptionLabel}
          className="h-9 text-xs lg:h-8 lg:max-w-[200px]"
        />
        <ColumnFilterCombobox
          value={filters.set}
          onChange={(value) => onColumnFilter("set", value)}
          placeholder={filters.brand ? t("cards.allSets") : t("cards.setNeedsBrand")}
          suggestions={setSuggestions}
          disabled={!filters.brand.trim()}
          clearOptionLabel={clearOptionLabel}
          className="h-9 text-xs disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:h-8 lg:min-w-[140px] lg:max-w-[220px]"
        />
        <ColumnFilterCombobox
          value={filters.variation}
          onChange={(value) => onColumnFilter("variation", value)}
          placeholder={t("admin.cards.filterVariation")}
          suggestions={variationSuggestions}
          clearOptionLabel={clearOptionLabel}
          className="h-9 text-xs sm:col-span-2 lg:h-8 lg:min-w-[160px] lg:max-w-[240px]"
        />
        <TagFilterChips
          selected={filters.tags}
          labels={badgeLabels}
          onToggle={toggleTag}
          className="sm:col-span-2 lg:col-span-1"
        />
      </div>
    </>
  );
}
