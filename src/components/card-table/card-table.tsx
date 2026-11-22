"use client";

import { useState, useCallback } from "react";
import { useTable, flexRender } from "@tanstack/react-table";
import { serverTableFeatures } from "@/components/data-table/table-features";
import {
  columnFilterPatch,
  type CollectionColumnFilterKey,
  type CollectionSortKey,
} from "@/lib/collection-query";
import type { CardListItem, ReferencesFilterIndex } from "@/lib/types";
import { CardDetail } from "@/components/card-detail";
import { ClickableTableRow } from "@/components/data-table/clickable-table-row";
import { SortableTableHead } from "@/components/data-table/sortable-table-head";
import { PaginationControls } from "@/components/data-table/pagination-controls";
import { useCardBadgeLabels } from "@/hooks/use-card-badge-labels";
import { useCollectionUrlFilters } from "@/hooks/use-collection-url-filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "@/i18n/client";
import { CardTableFilters } from "./card-table-filters";
import { ActiveFilterChips } from "./active-filter-chips";
import { CardTableMobileList } from "./card-table-mobile-list";
import { useCardTableColumns } from "./use-card-table-columns";
import { useAdjacentPagePrefetch } from "./use-adjacent-page-prefetch";

const SORT_COLUMNS = [
  ["player", "cards.player"],
  ["team", "cards.team"],
  ["year", "cards.year"],
  ["brand", "cards.brand"],
  ["set", "cards.set"],
  ["variation", "cards.variation"],
] as const satisfies ReadonlyArray<readonly [CollectionSortKey, string]>;

interface CardTableProps {
  cards: CardListItem[];
  totalCount: number;
  pageCount: number;
  referenceFilters: ReferencesFilterIndex;
}

/** Collection table with URL-synced filters, sorting and server pagination. */
export function CardTable({
  cards,
  totalCount,
  pageCount,
  referenceFilters,
}: CardTableProps) {
  const t = useTranslations();
  const [selectedCard, setSelectedCard] = useState<CardListItem | null>(null);
  const urlFilters = useCollectionUrlFilters();
  const { filters, updateFilters, toggleSort, isPending } = urlFilters;
  const badgeLabels = useCardBadgeLabels();
  const columns = useCardTableColumns(badgeLabels);
  const table = useTable({ features: serverTableFeatures, data: cards, columns });
  const rows = table.getRowModel().rows;

  useAdjacentPagePrefetch(filters, pageCount);

  const updateColumnFilter = useCallback(
    (key: CollectionColumnFilterKey, value: string) => {
      updateFilters(columnFilterPatch(key, value), { immediate: !value.trim() });
    },
    [updateFilters]
  );

  function sortState(column: CollectionSortKey): false | "asc" | "desc" {
    if (filters.sort !== column) return false;
    return filters.sortDesc ? "desc" : "asc";
  }

  const pageStart = (filters.page - 1) * filters.pageSize;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <CardTableFilters
          urlFilters={urlFilters}
          referenceFilters={referenceFilters}
          badgeLabels={badgeLabels}
          onColumnFilter={updateColumnFilter}
        />

        <div className="text-xs text-muted-foreground">
          {t("cards.count", { count: totalCount })}
          {totalCount > cards.length &&
            ` · ${t("cards.pageSlice", {
              from: pageStart + 1,
              to: pageStart + cards.length,
            })}`}
        </div>
        <ActiveFilterChips urlFilters={urlFilters} badgeLabels={badgeLabels} />
      </div>

      {/* Results — dimmed during pending server transition */}
      <div
        className={isPending ? "pointer-events-none opacity-50 transition-opacity duration-150" : "transition-opacity duration-150"}
        aria-busy={isPending}
      >
        <CardTableMobileList
          cards={rows.map((row) => row.original)}
          badgeLabels={badgeLabels}
          onSelect={setSelectedCard}
        />

        {/* Desktop table */}
        <div className="hidden rounded-md border border-border md:block md:overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {SORT_COLUMNS.map(([columnKey, labelKey]) => (
                  <SortableTableHead
                    key={columnKey}
                    label={t(labelKey)}
                    sortKey={columnKey}
                    sorted={sortState(columnKey)}
                    onSortToggle={() => toggleSort(columnKey)}
                  />
                ))}
                <SortableTableHead label={t("cards.tags")} />
                <SortableTableHead
                  label={t("cards.number")}
                  sortKey="serialNumber"
                  sorted={sortState("serialNumber")}
                  onSortToggle={() => toggleSort("serialNumber")}
                />
                <SortableTableHead
                  label={t("cards.grading")}
                  sortKey="grading"
                  sorted={sortState("grading")}
                  onSortToggle={() => toggleSort("grading")}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <ClickableTableRow
                    key={row.id}
                    onActivate={() => setSelectedCard(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </ClickableTableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("cards.noneFound")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <PaginationControls
          page={filters.page}
          pageCount={pageCount}
          onPageChange={(page) => updateFilters({ page }, { immediate: true })}
        />
      </div>

      {/* Detail dialog */}
      {selectedCard && (
        <CardDetail
          card={selectedCard}
          open={!!selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
