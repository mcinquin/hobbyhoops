"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { ServerTableFeatures } from "@/components/data-table/table-features";
import type { CardListItem } from "@/lib/types";
import { CardBadges, type CardBadgeLabels } from "@/components/card-badges";
import { useTranslations } from "@/i18n/client";

/** Column definitions of the desktop collection table. */
export function useCardTableColumns(
  badgeLabels: CardBadgeLabels
): ColumnDef<ServerTableFeatures, CardListItem>[] {
  const t = useTranslations();
  return useMemo(
    () => [
      {
        accessorKey: "player",
        header: t("cards.player"),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.player}</span>
        ),
      },
      {
        accessorKey: "team",
        header: t("cards.team"),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.team}
          </span>
        ),
      },
      {
        accessorKey: "year",
        header: t("cards.year"),
      },
      {
        accessorKey: "brand",
        header: t("cards.brand"),
      },
      {
        accessorKey: "set",
        header: t("cards.set"),
      },
      {
        accessorKey: "variation",
        header: t("cards.variation"),
        cell: ({ row }) => (
          <span className="text-sm max-w-[200px] truncate block">
            {row.original.variation}
          </span>
        ),
      },
      {
        id: "badges",
        header: t("cards.tags"),
        cell: ({ row }) => (
          <CardBadges card={row.original} labels={badgeLabels} />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "serialNumber",
        header: t("cards.number"),
        cell: ({ row }) => (
          <span className="text-xs text-red-400 font-mono">
            {row.original.serialNumber || "—"}
          </span>
        ),
      },
      {
        accessorKey: "grading",
        header: t("cards.grading"),
        cell: ({ row }) => (
          <span className="text-xs">{row.original.grading}</span>
        ),
      },
    ],
    [badgeLabels, t]
  );
}
