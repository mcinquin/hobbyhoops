"use client";

import { useState, useMemo, useEffect, useId, useRef } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  COLLECTION_TAG_VALUES,
  setsForBrandFilter,
  variationsForFilters,
  type CollectionSortKey,
  type CollectionTagValue,
} from "@/lib/collection-query";
import { Card, type References } from "@/lib/types";
import { CardBadges } from "@/components/card-badges";
import { CardDetail } from "@/components/card-detail";
import { ClickableTableRow } from "@/components/data-table/clickable-table-row";
import { SortableTableHead } from "@/components/data-table/sortable-table-head";
import { ServerTablePagination } from "@/components/data-table/server-table-pagination";
import { ColumnFilterCombobox } from "@/components/column-filter-combobox";
import { FilterChipButton } from "@/components/filter-chip-button";
import { SearchField } from "@/components/search-field";
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

/**
 * Isolated search input — its own useState + debounce so that
 * every keystroke only re-renders THIS tiny component, not the
 * entire CardTable (heavy: TanStack table, comboboxes, etc.).
 *
 * External URL changes (e.g. "reset filters" link) are detected via
 * the getDerivedStateFromProps pattern (calling setState during render),
 * which is React's official approach for syncing state from props without
 * using effects. The `sentValue` state prevents re-syncing our own URL updates.
 */
function SearchInput({
  urlValue,
  onSearch,
  label,
  placeholder,
}: {
  urlValue: string;
  onSearch: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState(urlValue);
  const [prevUrlValue, setPrevUrlValue] = useState(urlValue);
  // Tracks the value we last sent via onSearch — distinguishes our own
  // URL updates from external navigation/resets.
  const [sentValue, setSentValue] = useState(urlValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // getDerivedStateFromProps: sync input when URL changes externally.
  if (prevUrlValue !== urlValue) {
    setPrevUrlValue(urlValue);
    if (sentValue !== urlValue) {
      setInputValue(urlValue);
    }
  }

  function handleChange(newValue: string) {
    setInputValue(newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSentValue(newValue);
      onSearch(newValue);
    }, 300);
  }

  return (
    <SearchField
      value={inputValue}
      onChange={handleChange}
      label={label}
      placeholder={placeholder}
    />
  );
}

const SORT_COLUMN_KEYS = [
  "player",
  "team",
  "year",
  "brand",
  "set",
  "variation",
] as const satisfies readonly CollectionSortKey[];

interface CardTableProps {
  cards: Card[];
  totalCount: number;
  pageCount: number;
  references: References;
}

export function CardTable({
  cards,
  totalCount,
  pageCount,
  references,
}: CardTableProps) {
  const t = useTranslations();
  const yearSelectId = useId();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const { filters: urlFilters, updateFilters, toggleSort, isPending } =
    useCollectionUrlFilters();

  const selectedTags = useMemo(
    () => new Set(urlFilters.tags),
    [urlFilters.tags]
  );

  function sortState(column: CollectionSortKey): false | "asc" | "desc" {
    if (urlFilters.sort !== column) return false;
    return urlFilters.sortDesc ? "desc" : "asc";
  }
  const sortColumnLabels: Record<(typeof SORT_COLUMN_KEYS)[number], string> =
    useMemo(
      () => ({
        player: t("cards.player"),
        team: t("cards.team"),
        year: t("cards.year"),
        brand: t("cards.brand"),
        set: t("cards.set"),
        variation: t("cards.variation"),
      }),
      [t]
    );

  const badgeLabels = useCardBadgeLabels();

  const columns: ColumnDef<Card>[] = useMemo(
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

  // TanStack Table renvoie des helpers non mémoïsables compatibles React Compiler.
  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable
  const table = useReactTable({
    data: cards,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const setSuggestions = useMemo(
    () => setsForBrandFilter(references, urlFilters.brand),
    [references, urlFilters.brand]
  );

  const variationSuggestions = useMemo(
    () =>
      variationsForFilters(
        references,
        urlFilters.brand,
        urlFilters.set
      ),
    [references, urlFilters.brand, urlFilters.set]
  );

  useEffect(() => {
    if (!urlFilters.brand) {
      if (urlFilters.set) updateFilters({ set: "" }, { immediate: true });
      return;
    }
    if (
      urlFilters.set &&
      !setSuggestions.some((setName) =>
        setName.toLowerCase().includes(urlFilters.set.toLowerCase())
      )
    ) {
      updateFilters({ set: "" }, { immediate: true });
    }
  }, [urlFilters.brand, urlFilters.set, setSuggestions, updateFilters]);

  useEffect(() => {
    if (
      urlFilters.variation &&
      !variationSuggestions.some((variation) =>
        variation.toLowerCase().includes(urlFilters.variation.toLowerCase())
      )
    ) {
      updateFilters({ variation: "" }, { immediate: true });
    }
  }, [urlFilters.variation, variationSuggestions, updateFilters]);

  function toggleTag(tag: CollectionTagValue) {
    const next = selectedTags.has(tag)
      ? urlFilters.tags.filter((value) => value !== tag)
      : [...urlFilters.tags, tag];
    updateFilters({ tags: next }, { immediate: true });
  }

  const activeFilters = useMemo(
    () =>
      [
        urlFilters.search
          ? t("cards.activeSearch", { value: urlFilters.search })
          : "",
        urlFilters.player
          ? t("cards.activePlayer", { value: urlFilters.player })
          : "",
        urlFilters.team ? t("cards.activeTeam", { value: urlFilters.team }) : "",
        urlFilters.year ? t("cards.activeYear", { value: urlFilters.year }) : "",
        urlFilters.brand
          ? t("cards.activeBrand", { value: urlFilters.brand })
          : "",
        urlFilters.set ? t("cards.activeSet", { value: urlFilters.set }) : "",
        urlFilters.variation
          ? t("cards.activeVariation", { value: urlFilters.variation })
          : "",
        ...urlFilters.tags.map((tag) => badgeLabels[tag]),
      ].filter(Boolean),
    [badgeLabels, t, urlFilters]
  );

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col gap-4">
        <SearchInput
          urlValue={urlFilters.search}
          onSearch={(value) =>
            updateFilters({ search: value }, { immediate: true })
          }
          label={t("cards.searchAll")}
          placeholder={t("cards.searchAll")}
        />

        <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
          <ColumnFilterCombobox
            value={urlFilters.player}
            onChange={(value) => updateFilters({ player: value })}
            placeholder={t("cards.filterPlayer")}
            suggestions={references.players}
            className="h-9 text-xs lg:h-8 lg:w-40"
          />
          <ColumnFilterCombobox
            value={urlFilters.team}
            onChange={(value) => updateFilters({ team: value })}
            placeholder={t("cards.filterTeam")}
            suggestions={references.teams}
            className="h-9 text-xs lg:h-8 lg:w-36"
          />
          <div className="flex flex-col gap-1">
            <label htmlFor={yearSelectId} className="sr-only">
              {t("cards.year")}
            </label>
            <select
              id={yearSelectId}
              value={urlFilters.year}
              onChange={(e) =>
                updateFilters({ year: e.target.value }, { immediate: true })
              }
              className="h-9 rounded-md border border-input bg-background px-2 text-xs lg:h-8"
            >
              <option value="">{t("cards.allYears")}</option>
              {[...references.years].reverse().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <ColumnFilterCombobox
            value={urlFilters.brand}
            onChange={(value) => updateFilters({ brand: value })}
            placeholder={t("cards.allBrands")}
            suggestions={references.brands}
            className="h-9 text-xs lg:h-8 lg:max-w-[200px]"
          />
          <ColumnFilterCombobox
            value={urlFilters.set}
            onChange={(value) => updateFilters({ set: value })}
            placeholder={
              urlFilters.brand ? t("cards.allSets") : t("cards.setNeedsBrand")
            }
            suggestions={setSuggestions}
            disabled={!urlFilters.brand.trim()}
            className="h-9 text-xs disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:h-8 lg:min-w-[140px] lg:max-w-[220px]"
          />
          <ColumnFilterCombobox
            value={urlFilters.variation}
            onChange={(value) => updateFilters({ variation: value })}
            placeholder={t("admin.cards.filterVariation")}
            suggestions={variationSuggestions}
            className="h-9 text-xs sm:col-span-2 lg:h-8 lg:min-w-[160px] lg:max-w-[240px]"
          />

          <div className="flex flex-wrap gap-1 sm:col-span-2 lg:col-span-1">
            {COLLECTION_TAG_VALUES.map((tag) => (
              <FilterChipButton
                key={tag}
                label={badgeLabels[tag]}
                pressed={selectedTags.has(tag)}
                onPressedChange={() => toggleTag(tag)}
              />
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {t("cards.count", { count: totalCount })}
          {totalCount > cards.length &&
            ` · ${t("cards.pageSlice", {
              from: (urlFilters.page - 1) * urlFilters.pageSize + 1,
              to: (urlFilters.page - 1) * urlFilters.pageSize + cards.length,
            })}`}
        </div>
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-xs">
            <span className="font-medium text-muted-foreground">
              {t("cards.activeFilters")}
            </span>
            {activeFilters.map((filter) => (
              <span
                key={filter}
                className="rounded-full bg-muted px-2 py-1 text-muted-foreground"
              >
                {filter}
              </span>
            ))}
            <Link
              href="/collection"
              className="ml-auto font-medium text-amber-500 hover:underline"
            >
              {t("cards.resetFilters")}
            </Link>
          </div>
        )}
      </div>

      {/* Results — dimmed during pending server transition */}
      <div
        className={isPending ? "pointer-events-none opacity-50 transition-opacity duration-150" : "transition-opacity duration-150"}
        aria-busy={isPending}
      >

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => {
            const card = row.original;
            const meta = [card.team, card.year].filter(Boolean).join(" · ");
            const serialAndGrade = [
              card.cardNumber ? `#${card.cardNumber}` : "",
              card.serialNumber,
              card.grading,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <button
                key={row.id}
                type="button"
                className="block w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setSelectedCard(card)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium leading-tight">
                      {card.player}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
                  </div>
                  <CardBadges card={card} labels={badgeLabels} />
                </div>

                <div className="mt-2 space-y-0.5 text-sm">
                  <p className="truncate text-muted-foreground">
                    {card.brand} · {card.set}
                  </p>
                  <p className="truncate">{card.variation}</p>
                  {serialAndGrade && (
                    <p className="text-xs font-medium text-muted-foreground">
                      {serialAndGrade}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
            {t("cards.noneFound")}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden rounded-md border border-border md:block md:overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {SORT_COLUMN_KEYS.map((columnKey) => (
                <SortableTableHead
                  key={columnKey}
                  label={sortColumnLabels[columnKey]}
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
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <ClickableTableRow
                  key={row.id}
                  onActivate={() => setSelectedCard(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
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

      <ServerTablePagination
        page={urlFilters.page}
        pageCount={pageCount}
        onPageChange={(page) => updateFilters({ page }, { immediate: true })}
      />

      </div>{/* end results wrapper */}

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
