"use client";

import { useMemo } from "react";
import Link from "next/link";
import { XIcon } from "lucide-react";
import {
  formatSerialRangeLabel,
  type CollectionListQuery,
} from "@/lib/collection-query";
import type { CardBadgeLabels } from "@/components/card-badges";
import type { CollectionUrlFilters } from "@/hooks/use-collection-url-filters";
import { useTranslations } from "@/i18n/client";

type ActiveFilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

/** Text filters shown as removable chips, with their label key and reset patch. */
const TEXT_FILTER_CHIPS = [
  { key: "search", labelKey: "cards.activeSearch", reset: { search: "" } },
  { key: "player", labelKey: "cards.activePlayer", reset: { player: "" } },
  { key: "team", labelKey: "cards.activeTeam", reset: { team: "" } },
  { key: "year", labelKey: "cards.activeYear", reset: { year: "" } },
  {
    key: "brand",
    labelKey: "cards.activeBrand",
    reset: { brand: "", set: "", variation: "" },
  },
  { key: "set", labelKey: "cards.activeSet", reset: { set: "", variation: "" } },
  { key: "variation", labelKey: "cards.activeVariation", reset: { variation: "" } },
] as const satisfies ReadonlyArray<{
  key: keyof CollectionListQuery;
  labelKey: string;
  reset: Partial<CollectionListQuery>;
}>;

interface ActiveFilterChipsProps {
  urlFilters: CollectionUrlFilters;
  badgeLabels: CardBadgeLabels;
}

/** Summary of the active collection filters, each removable, plus a reset link. */
export function ActiveFilterChips({
  urlFilters: { filters, updateFilters, toggleTag },
  badgeLabels,
}: ActiveFilterChipsProps) {
  const t = useTranslations();

  const chips = useMemo((): ActiveFilterChip[] => {
    const result: ActiveFilterChip[] = [];
    for (const { key, labelKey, reset } of TEXT_FILTER_CHIPS) {
      const value = filters[key];
      if (!value) continue;
      result.push({
        id: key,
        label: t(labelKey, { value }),
        onRemove: () => updateFilters(reset, { immediate: true }),
      });
    }
    const serialRange = formatSerialRangeLabel(filters.serialMin, filters.serialMax);
    if (serialRange) {
      result.push({
        id: "serial-range",
        label: t("cards.activePrintRun", { value: serialRange }),
        onRemove: () =>
          updateFilters({ serialMin: null, serialMax: null }, { immediate: true }),
      });
    }
    if (filters.serialPosition) {
      result.push({
        id: "serial-position",
        label: t(
          filters.serialPosition === "first"
            ? "cards.activeSerialFirst"
            : "cards.activeSerialLast"
        ),
        onRemove: () => updateFilters({ serialPosition: "" }, { immediate: true }),
      });
    }
    for (const tag of filters.tags) {
      result.push({
        id: `tag-${tag}`,
        label: badgeLabels[tag],
        onRemove: () => toggleTag(tag),
      });
    }
    return result;
  }, [badgeLabels, filters, t, toggleTag, updateFilters]);

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-xs">
      <span className="font-medium text-muted-foreground">
        {t("cards.activeFilters")}
      </span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          aria-label={t("cards.removeFilter", { filter: chip.label })}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
        >
          <span>{chip.label}</span>
          <XIcon className="size-3 shrink-0 opacity-70" aria-hidden />
        </button>
      ))}
      <Link
        href="/collection"
        className="ml-auto font-medium text-amber-500 hover:underline"
      >
        {t("cards.resetFilters")}
      </Link>
    </div>
  );
}
