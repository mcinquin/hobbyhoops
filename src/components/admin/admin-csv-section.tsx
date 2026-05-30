"use client";

import { useMemo, useState } from "react";
import type { References } from "@/lib/types";
import {
  COLLECTION_TAG_VALUES,
  setsForBrandFilter,
  variationsForFilters,
  type CollectionListQuery,
} from "@/lib/collection-query";
import { CardCsvTransfer } from "@/components/admin/card-csv-transfer";
import { CollectionSearchInput } from "@/components/collection-search-input";
import { ColumnFilterCombobox } from "@/components/column-filter-combobox";
import { FilterChipButton } from "@/components/filter-chip-button";
import { useTranslations } from "@/i18n/client";
import { useCardBadgeLabels } from "@/hooks/use-card-badge-labels";

const EMPTY_EXPORT_FILTERS: CollectionListQuery = {
  search: "",
  player: "",
  team: "",
  year: "",
  brand: "",
  set: "",
  variation: "",
  tags: [],
  page: 1,
  pageSize: 50,
  sort: "player",
  sortDesc: false,
};

interface AdminCsvSectionProps {
  references: References;
  onImported: () => void | Promise<void>;
}

export function AdminCsvSection({
  references,
  onImported,
}: AdminCsvSectionProps) {
  const t = useTranslations();
  const badgeLabels = useCardBadgeLabels();
  const [exportFilters, setExportFilters] =
    useState<CollectionListQuery>(EMPTY_EXPORT_FILTERS);

  const selectedTags = useMemo(
    () => new Set(exportFilters.tags),
    [exportFilters.tags]
  );

  const setSuggestions = useMemo(
    () => setsForBrandFilter(references, exportFilters.brand),
    [references, exportFilters.brand]
  );

  const variationSuggestions = useMemo(
    () =>
      variationsForFilters(
        references,
        exportFilters.brand,
        exportFilters.set
      ),
    [references, exportFilters.brand, exportFilters.set]
  );

  function patchExportFilters(patch: Partial<CollectionListQuery>): void {
    setExportFilters((current) => ({ ...current, ...patch }));
  }

  function toggleExportTag(tag: (typeof COLLECTION_TAG_VALUES)[number]): void {
    setExportFilters((current) => {
      const tags = current.tags.includes(tag)
        ? current.tags.filter((entry) => entry !== tag)
        : [...current.tags, tag];
      return { ...current, tags };
    });
  }

  return (
    <div className="min-w-0 space-y-6">
      <p className="text-sm text-muted-foreground">{t("admin.csv.intro")}</p>

      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{t("admin.csv.exportFiltersTitle")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("admin.csv.exportFiltersHelp")}
          </p>
        </div>

        <CollectionSearchInput
          urlValue={exportFilters.search}
          onSearch={(value) => patchExportFilters({ search: value })}
          label={t("admin.csv.search")}
          placeholder={t("admin.csv.search")}
        />

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <ColumnFilterCombobox
            value={exportFilters.player}
            onChange={(value) => patchExportFilters({ player: value })}
            placeholder={t("admin.csv.filterPlayer")}
            suggestions={references.players}
            className="h-9 text-xs"
          />
          <ColumnFilterCombobox
            value={exportFilters.team}
            onChange={(value) => patchExportFilters({ team: value })}
            placeholder={t("admin.csv.filterTeam")}
            suggestions={references.teams}
            className="h-9 text-xs"
          />
          <ColumnFilterCombobox
            value={exportFilters.year}
            onChange={(value) => patchExportFilters({ year: value })}
            placeholder={t("admin.csv.filterYear")}
            suggestions={references.years}
            className="h-9 text-xs"
          />
          <ColumnFilterCombobox
            value={exportFilters.brand}
            onChange={(value) =>
              patchExportFilters({ brand: value, set: "", variation: "" })
            }
            placeholder={t("admin.csv.filterBrand")}
            suggestions={references.brands}
            className="h-9 text-xs"
          />
          <ColumnFilterCombobox
            value={exportFilters.set}
            onChange={(value) =>
              patchExportFilters({ set: value, variation: "" })
            }
            placeholder={t("admin.csv.filterSet")}
            suggestions={setSuggestions}
            className="h-9 text-xs"
          />
          <ColumnFilterCombobox
            value={exportFilters.variation}
            onChange={(value) => patchExportFilters({ variation: value })}
            placeholder={t("admin.csv.filterVariation")}
            suggestions={variationSuggestions}
            className="h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {COLLECTION_TAG_VALUES.map((tag) => (
            <FilterChipButton
              key={tag}
              label={badgeLabels[tag]}
              pressed={selectedTags.has(tag)}
              onPressedChange={() => toggleExportTag(tag)}
            />
          ))}
        </div>
      </div>

      <CardCsvTransfer
        filters={exportFilters}
        onImported={() => void onImported()}
      />
    </div>
  );
}
