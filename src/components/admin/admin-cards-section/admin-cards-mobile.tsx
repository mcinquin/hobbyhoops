"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { CardListItem } from "@/lib/types";
import type {
  CollectionColumnFilterKey,
  CollectionTagValue,
} from "@/lib/collection-query";
import { CardBadges, type CardBadgeLabels } from "@/components/card-badges";
import { TagFilterChips } from "@/components/tag-filter-chips";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/i18n/client";
import { AdminColumnFilter } from "./admin-column-filter";
import type {
  AdminColumnFilter as AdminColumnFilterConfig,
  ApplyAdminColumnFilter,
} from "./use-admin-column-filters";

const MOBILE_FILTER_CLASS = "h-9 text-xs";

interface AdminCardsMobileFiltersProps {
  columns: Record<CollectionColumnFilterKey, AdminColumnFilterConfig>;
  onApply: ApplyAdminColumnFilter;
  selectedTags: readonly CollectionTagValue[];
  onToggleTag: (tag: CollectionTagValue) => void;
  badgeLabels: CardBadgeLabels;
}

/** Mobile (< md) stack of admin card filters. */
export function AdminCardsMobileFilters({
  columns,
  onApply,
  selectedTags,
  onToggleTag,
  badgeLabels,
}: AdminCardsMobileFiltersProps) {
  const filter = (key: CollectionColumnFilterKey) => (
    <AdminColumnFilter
      filter={columns[key]}
      onApply={onApply}
      className={MOBILE_FILTER_CLASS}
    />
  );
  return (
    <div className="grid gap-2 md:hidden">
      {filter("player")}
      {filter("team")}
      {filter("year")}
      <TagFilterChips
        selected={selectedTags}
        labels={badgeLabels}
        onToggle={onToggleTag}
      />
      {filter("brand")}
      {filter("set")}
      {filter("variation")}
    </div>
  );
}

interface AdminCardsMobileListProps {
  cards: CardListItem[];
  isLoading: boolean;
  badgeLabels: CardBadgeLabels;
  onEdit: (card: CardListItem) => void;
  onDelete: (card: CardListItem) => void;
}

/** Mobile (< md) admin card list with edit / delete actions. */
export function AdminCardsMobileList({
  cards,
  isLoading,
  badgeLabels,
  onEdit,
  onDelete,
}: AdminCardsMobileListProps) {
  const t = useTranslations();

  if (cards.length === 0) {
    return (
      <div className="space-y-2 md:hidden">
        <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
          {isLoading ? t("common.loading") : t("cards.noneFound")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 md:hidden">
      {cards.map((card) => {
        const meta = [card.team, card.year].filter(Boolean).join(" · ");
        const catalog = [card.brand, card.set].filter(Boolean).join(" · ");

        return (
          <article
            key={card.id}
            className="rounded-lg border border-border bg-card p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium leading-tight">{card.player}</p>
                <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
              </div>
              <CardBadges card={card} labels={badgeLabels} />
            </div>

            <div className="mt-2 space-y-0.5 text-sm">
              <p className="truncate text-muted-foreground">{catalog}</p>
              <p className="truncate">{card.variation}</p>
            </div>

            <div className="mt-2 flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("admin.cards.editCard", { player: card.player })}
                onClick={() => onEdit(card)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                {t("common.edit")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                aria-label={t("admin.cards.deleteCard", { player: card.player })}
                onClick={() => onDelete(card)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {t("common.delete")}
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
