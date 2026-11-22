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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "@/i18n/client";
import { AdminColumnFilter } from "./admin-column-filter";
import type {
  AdminColumnFilter as AdminColumnFilterConfig,
  ApplyAdminColumnFilter,
} from "./use-admin-column-filters";

/** Desktop header filters: column, label key, width, and whether typing applies at once. */
const HEADER_FILTERS: ReadonlyArray<{
  key: CollectionColumnFilterKey;
  labelKey: string;
  width: string;
  alwaysImmediate: boolean;
}> = [
  { key: "player", labelKey: "cards.player", width: "min-w-44", alwaysImmediate: true },
  { key: "team", labelKey: "cards.team", width: "min-w-36", alwaysImmediate: true },
  { key: "year", labelKey: "cards.year", width: "min-w-24", alwaysImmediate: true },
  { key: "brand", labelKey: "cards.brand", width: "min-w-36", alwaysImmediate: false },
  { key: "set", labelKey: "cards.set", width: "min-w-44", alwaysImmediate: false },
  { key: "variation", labelKey: "cards.variation", width: "min-w-40", alwaysImmediate: false },
];

interface AdminCardsTableProps {
  cards: CardListItem[];
  columns: Record<CollectionColumnFilterKey, AdminColumnFilterConfig>;
  onApply: ApplyAdminColumnFilter;
  selectedTags: readonly CollectionTagValue[];
  onToggleTag: (tag: CollectionTagValue) => void;
  badgeLabels: CardBadgeLabels;
  onEdit: (card: CardListItem) => void;
  onDelete: (card: CardListItem) => void;
}

/** Desktop (md+) admin cards table with a filter row under the headers. */
export function AdminCardsTable({
  cards,
  columns,
  onApply,
  selectedTags,
  onToggleTag,
  badgeLabels,
  onEdit,
  onDelete,
}: AdminCardsTableProps) {
  const t = useTranslations();
  return (
    <div className="hidden rounded-md border border-border md:block md:overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {HEADER_FILTERS.map(({ key, labelKey }) => (
              <TableHead key={key}>{t(labelKey)}</TableHead>
            ))}
            <TableHead>{t("cards.tags")}</TableHead>
            <TableHead className="w-[100px]">{t("admin.cards.actions")}</TableHead>
          </TableRow>
          <TableRow>
            {HEADER_FILTERS.map(({ key, width, alwaysImmediate }) => (
              <TableHead key={key}>
                <AdminColumnFilter
                  filter={columns[key]}
                  onApply={onApply}
                  alwaysImmediate={alwaysImmediate}
                  className={`h-8 ${width} text-xs font-normal`}
                />
              </TableHead>
            ))}
            <TableHead>
              <TagFilterChips
                selected={selectedTags}
                labels={badgeLabels}
                onToggle={onToggleTag}
              />
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.map((card) => (
            <TableRow key={card.id}>
              <TableCell>
                <p className="font-medium text-sm">{card.player}</p>
              </TableCell>
              <TableCell className="text-sm">{card.team}</TableCell>
              <TableCell className="text-sm">{card.year}</TableCell>
              <TableCell className="text-sm">{card.brand}</TableCell>
              <TableCell className="text-sm">{card.set}</TableCell>
              <TableCell className="text-sm max-w-[180px] truncate">
                {card.variation}
              </TableCell>
              <TableCell>
                <CardBadges card={card} labels={badgeLabels} />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    aria-label={t("admin.cards.editCard", { player: card.player })}
                    onClick={() => onEdit(card)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    aria-label={t("admin.cards.deleteCard", { player: card.player })}
                    onClick={() => onDelete(card)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
