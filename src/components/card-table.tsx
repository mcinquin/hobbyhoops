"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import { Card } from "@/lib/types";
import { uniqueSorted } from "@/lib/string-list";
import { CardBadges } from "@/components/card-badges";
import { CardDetail } from "@/components/card-detail";
import { ColumnFilterCombobox } from "@/components/column-filter-combobox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface CardTableProps {
  cards: Card[];
  initialFilters?: {
    search?: string;
    player?: string;
    team?: string;
    year?: string;
    brand?: string;
    set?: string;
    variation?: string;
    tag?: string;
  };
  filters?: {
    tradableOnly?: boolean;
  };
}

export function CardTable({ cards, initialFilters, filters }: CardTableProps) {
  const t = useTranslations();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState(initialFilters?.search ?? "");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const [playerFilter, setPlayerFilter] = useState(initialFilters?.player ?? "");
  const [teamFilter, setTeamFilter] = useState(initialFilters?.team ?? "");
  const [yearFilter, setYearFilter] = useState(initialFilters?.year ?? "");
  const [brandFilter, setBrandFilter] = useState(initialFilters?.brand ?? "");
  const [setFilter, setSetFilter] = useState(initialFilters?.set ?? "");
  const [variationFilter, setVariationFilter] = useState(
    initialFilters?.variation ?? ""
  );
  const [rookieOnly, setRookieOnly] = useState(initialFilters?.tag === "rookie");
  const [autoOnly, setAutoOnly] = useState(initialFilters?.tag === "autograph");
  const [memoOnly, setMemoOnly] = useState(initialFilters?.tag === "memorabilia");
  const [serialOnly, setSerialOnly] = useState(initialFilters?.tag === "numbered");
  const tradableOnly = filters?.tradableOnly || initialFilters?.tag === "tradable";
  const badgeLabels = useMemo(
    () => ({
      rookie: t("badges.rookie"),
      autograph: t("badges.autograph"),
      memorabilia: t("badges.memorabilia"),
      numbered: t("badges.numbered"),
      tradable: t("badges.tradable"),
    }),
    [t]
  );

  const filteredCards = useMemo(() => {
    let result = cards;
    if (tradableOnly) {
      result = result.filter((c) => c.tradable);
    }
    if (playerFilter) {
      const q = playerFilter.toLowerCase();
      result = result.filter((c) => c.player.toLowerCase().includes(q));
    }
    if (teamFilter) {
      const q = teamFilter.toLowerCase();
      result = result.filter((c) => c.team.toLowerCase().includes(q));
    }
    if (yearFilter) {
      result = result.filter((c) => c.year === yearFilter);
    }
    if (brandFilter) {
      const q = brandFilter.toLowerCase();
      result = result.filter((c) => c.brand.toLowerCase().includes(q));
    }
    if (setFilter) {
      const q = setFilter.toLowerCase();
      result = result.filter((c) => c.set.toLowerCase().includes(q));
    }
    if (variationFilter) {
      const q = variationFilter.toLowerCase();
      result = result.filter((c) => c.variation.toLowerCase().includes(q));
    }
    if (rookieOnly) result = result.filter((c) => c.rookie);
    if (autoOnly) result = result.filter((c) => c.autograph);
    if (memoOnly) result = result.filter((c) => c.memorabilia);
    if (serialOnly) result = result.filter((c) => c.serialNumber);
    return result;
  }, [
    cards,
    tradableOnly,
    playerFilter,
    teamFilter,
    yearFilter,
    brandFilter,
    setFilter,
    variationFilter,
    rookieOnly,
    autoOnly,
    memoOnly,
    serialOnly,
  ]);

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
    data: filteredCards,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  const uniquePlayers = useMemo(
    () => uniqueSorted(cards.map((card) => card.player)),
    [cards]
  );
  const uniqueYears = useMemo(
    () => [...new Set(cards.map((c) => c.year).filter(Boolean))].sort().reverse(),
    [cards]
  );
  const uniqueBrands = useMemo(
    () => uniqueSorted(cards.map((card) => card.brand)),
    [cards]
  );
  const uniqueTeams = useMemo(
    () => uniqueSorted(cards.map((card) => card.team)),
    [cards]
  );

  const setsForBrand = useMemo(() => {
    const brandQuery = brandFilter.trim().toLowerCase();
    if (!brandQuery) return [];
    return uniqueSorted(
      cards
        .filter((card) => card.brand.toLowerCase().includes(brandQuery))
        .map((card) => card.set)
    );
  }, [brandFilter, cards]);

  const variationsForFilters = useMemo(() => {
    const brandQuery = brandFilter.trim().toLowerCase();
    const setQuery = setFilter.trim().toLowerCase();
    return uniqueSorted(
      cards
        .filter((card) => {
          const brandValue = card.brand.toLowerCase();
          const setValue = card.set.toLowerCase();
          return (
            (!brandQuery || brandValue.includes(brandQuery)) &&
            (!setQuery || setValue.includes(setQuery))
          );
        })
        .map((card) => card.variation)
    );
  }, [brandFilter, cards, setFilter]);

  useEffect(() => {
    if (!brandFilter) {
      setSetFilter("");
      return;
    }
    if (
      setFilter &&
      !setsForBrand.some((setName) =>
        setName.toLowerCase().includes(setFilter.toLowerCase())
      )
    ) {
      setSetFilter("");
    }
  }, [brandFilter, setsForBrand, setFilter]);

  useEffect(() => {
    if (
      variationFilter &&
      !variationsForFilters.some((variation) =>
        variation.toLowerCase().includes(variationFilter.toLowerCase())
      )
    ) {
      setVariationFilter("");
    }
  }, [variationFilter, variationsForFilters]);

  const activeFilters = useMemo(
    () =>
      [
        globalFilter ? t("cards.activeSearch", { value: globalFilter }) : "",
        playerFilter ? t("cards.activePlayer", { value: playerFilter }) : "",
        teamFilter ? t("cards.activeTeam", { value: teamFilter }) : "",
        yearFilter ? t("cards.activeYear", { value: yearFilter }) : "",
        brandFilter ? t("cards.activeBrand", { value: brandFilter }) : "",
        setFilter ? t("cards.activeSet", { value: setFilter }) : "",
        variationFilter
          ? t("cards.activeVariation", { value: variationFilter })
          : "",
        rookieOnly ? t("badges.rookie") : "",
        autoOnly ? t("badges.autograph") : "",
        memoOnly ? t("badges.memorabilia") : "",
        serialOnly ? t("badges.numbered") : "",
        tradableOnly ? t("badges.tradable") : "",
      ].filter(Boolean),
    [
      autoOnly,
      brandFilter,
      globalFilter,
      memoOnly,
      playerFilter,
      rookieOnly,
      serialOnly,
      setFilter,
      t,
      teamFilter,
      tradableOnly,
      variationFilter,
      yearFilter,
    ]
  );

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("cards.searchAll")}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
          <ColumnFilterCombobox
            value={playerFilter}
            onChange={setPlayerFilter}
            placeholder={t("cards.filterPlayer")}
            suggestions={uniquePlayers}
            className="h-9 text-xs lg:h-8 lg:w-40"
          />
          <ColumnFilterCombobox
            value={teamFilter}
            onChange={setTeamFilter}
            placeholder={t("cards.filterTeam")}
            suggestions={uniqueTeams}
            className="h-9 text-xs lg:h-8 lg:w-36"
          />
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs lg:h-8"
          >
            <option value="">{t("cards.allYears")}</option>
            {uniqueYears.map((y) => (
              <option key={y} value={y!}>
                {y}
              </option>
            ))}
          </select>
          <ColumnFilterCombobox
            value={brandFilter}
            onChange={setBrandFilter}
            placeholder={t("cards.allBrands")}
            suggestions={uniqueBrands}
            className="h-9 text-xs lg:h-8 lg:max-w-[200px]"
          />
          <ColumnFilterCombobox
            value={setFilter}
            onChange={setSetFilter}
            placeholder={
              brandFilter ? t("cards.allSets") : t("cards.setNeedsBrand")
            }
            suggestions={setsForBrand}
            disabled={!brandFilter.trim()}
            className="h-9 text-xs disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:h-8 lg:min-w-[140px] lg:max-w-[220px]"
          />
          <ColumnFilterCombobox
            value={variationFilter}
            onChange={setVariationFilter}
            placeholder={t("admin.cards.filterVariation")}
            suggestions={variationsForFilters}
            className="h-9 text-xs sm:col-span-2 lg:h-8 lg:min-w-[160px] lg:max-w-[240px]"
          />

          <div className="flex flex-wrap gap-1 sm:col-span-2 lg:col-span-1">
            <Button
              variant={rookieOnly ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs px-2"
              onClick={() => setRookieOnly(!rookieOnly)}
            >
              {t("badges.rookie")}
            </Button>
            <Button
              variant={autoOnly ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs px-2"
              onClick={() => setAutoOnly(!autoOnly)}
            >
              {t("badges.autograph")}
            </Button>
            <Button
              variant={memoOnly ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs px-2"
              onClick={() => setMemoOnly(!memoOnly)}
            >
              {t("badges.memorabilia")}
            </Button>
            <Button
              variant={serialOnly ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs px-2"
              onClick={() => setSerialOnly(!serialOnly)}
            >
              {t("badges.numbered")}
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {t("cards.count", { count: filteredCards.length })}
          {filteredCards.length !== cards.length &&
            ` ${t("common.filteredOf", { total: cards.length })}`}
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
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="cursor-pointer select-none whitespace-nowrap"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => setSelectedCard(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
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

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("common.pageOf", {
            page: table.getState().pagination.pageIndex + 1,
            total: table.getPageCount(),
          })}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            aria-label={t("common.firstPage")}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={t("common.previousPage")}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={t("common.nextPage")}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={t("common.lastPage")}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
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
