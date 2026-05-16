"use client";

import { useState, useMemo, useEffect } from "react";
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
import { CardBadges } from "@/components/card-badges";
import { CardDetail } from "@/components/card-detail";
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
  filters?: {
    tradableOnly?: boolean;
  };
}

export function CardTable({ cards, filters }: CardTableProps) {
  const t = useTranslations();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const [playerFilter, setPlayerFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [setFilter, setSetFilter] = useState("");
  const [rookieOnly, setRookieOnly] = useState(false);
  const [autoOnly, setAutoOnly] = useState(false);
  const [memoOnly, setMemoOnly] = useState(false);
  const [serialOnly, setSerialOnly] = useState(false);
  const badgeLabels = useMemo(
    () => ({
      rookie: t("badges.rookie"),
      autograph: t("badges.autograph"),
      memorabilia: t("badges.memorabilia"),
      tradable: t("badges.tradable"),
    }),
    [t]
  );

  const filteredCards = useMemo(() => {
    let result = cards;
    if (filters?.tradableOnly) {
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
      result = result.filter((c) => c.brand === brandFilter);
    }
    if (setFilter) {
      result = result.filter((c) => c.set === setFilter);
    }
    if (rookieOnly) result = result.filter((c) => c.rookie);
    if (autoOnly) result = result.filter((c) => c.autograph);
    if (memoOnly) result = result.filter((c) => c.memorabilia);
    if (serialOnly) result = result.filter((c) => c.serialNumber);
    return result;
  }, [cards, filters, playerFilter, teamFilter, yearFilter, brandFilter, setFilter, rookieOnly, autoOnly, memoOnly, serialOnly]);

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

  const uniqueYears = useMemo(
    () => [...new Set(cards.map((c) => c.year).filter(Boolean))].sort().reverse(),
    [cards]
  );
  const uniqueBrands = useMemo(
    () => [...new Set(cards.map((c) => c.brand).filter(Boolean))].sort(),
    [cards]
  );

  const setsForBrand = useMemo(() => {
    if (!brandFilter) return [];
    return [
      ...new Set(
        cards
          .filter((c) => c.brand === brandFilter)
          .map((c) => c.set)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [cards, brandFilter]);

  useEffect(() => {
    if (!brandFilter) {
      setSetFilter("");
      return;
    }
    if (setFilter && !setsForBrand.includes(setFilter)) {
      setSetFilter("");
    }
  }, [brandFilter, setsForBrand, setFilter]);

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

        <div className="flex flex-wrap gap-2">
          <Input
            placeholder={t("cards.filterPlayer")}
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            className="w-40 h-8 text-xs"
          />
          <Input
            placeholder={t("cards.filterTeam")}
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-36 h-8 text-xs"
          />
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="h-8 text-xs rounded-md border border-input bg-background px-2"
          >
            <option value="">{t("cards.allYears")}</option>
            {uniqueYears.map((y) => (
              <option key={y} value={y!}>{y}</option>
            ))}
          </select>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="h-8 text-xs rounded-md border border-input bg-background px-2 max-w-[200px]"
          >
            <option value="">{t("cards.allBrands")}</option>
            {uniqueBrands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select
            value={setFilter}
            onChange={(e) => setSetFilter(e.target.value)}
            disabled={!brandFilter}
            title={
              brandFilter
                ? t("cards.setsForBrandTitle")
                : t("cards.chooseBrandForSetsList")
            }
            className="h-8 text-xs rounded-md border border-input bg-background px-2 max-w-[220px] min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {brandFilter ? t("cards.allSets") : t("cards.setNeedsBrand")}
            </option>
            {setsForBrand.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="flex gap-1">
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
              {t("cards.number")}
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {t("cards.count", { count: filteredCards.length })}
          {filteredCards.length !== cards.length &&
            ` ${t("common.filteredOf", { total: cards.length })}`}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-auto">
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
      <div className="flex items-center justify-between">
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
