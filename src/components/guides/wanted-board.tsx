"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { WantedBlock, WantedEntry } from "@/lib/guide-data";
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
import { useTranslations } from "@/i18n/client";

interface WantedBoardProps {
  blocks: WantedBlock[];
}

export function WantedBoard({ blocks }: WantedBoardProps) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [variationFilter, setVariationFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "variation", desc: false },
    { id: "slot", desc: false },
  ]);

  const rows = useMemo(() => blocks.flatMap((block) => block.entries), [blocks]);
  const variations = useMemo(
    () => [...new Set(rows.map((row) => row.variation))].sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const filteredRows = useMemo(() => {
    let result = rows;
    if (variationFilter) {
      result = result.filter((row) => row.variation === variationFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (row) =>
          row.player.toLowerCase().includes(q) ||
          row.variation.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, search, variationFilter]);

  const columns = useMemo<ColumnDef<WantedEntry>[]>(
    () => [
      {
        accessorKey: "variation",
        header: t("guides.wanted.variation"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.variation}</span>
        ),
      },
      {
        accessorKey: "slot",
        header: t("guides.wanted.slot"),
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">
            {row.original.slot ?? "—"}
          </span>
        ),
        sortingFn: (a, b) => (a.original.slot ?? 999) - (b.original.slot ?? 999),
      },
      {
        accessorKey: "player",
        header: t("guides.wanted.player"),
        cell: ({ row }) => <span className="font-medium">{row.original.player}</span>,
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <p
          key={block.set}
          className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium"
        >
          {block.set}
        </p>
      ))}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("guides.wanted.search")}
            className="pl-9"
          />
        </div>
        <ColumnFilterCombobox
          value={variationFilter}
          onChange={setVariationFilter}
          placeholder={t("guides.wanted.filterVariation")}
          suggestions={variations}
          className="h-9 w-full sm:h-8 sm:w-56"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {t("guides.wanted.count", { count: filteredRows.length })}
        {filteredRows.length !== rows.length &&
          ` ${t("common.filteredOf", { total: rows.length })}`}
      </p>

      <div className="space-y-2 md:hidden">
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-border bg-card p-3 text-sm"
            >
              <p className="font-medium">{row.original.player}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.original.variation}
                {row.original.slot != null ? ` · #${row.original.slot}` : ""}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
            {t("common.noneFound")}
          </div>
        )}
      </div>

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
                      {flexRender(header.column.columnDef.header, header.getContext())}
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                  {t("common.noneFound")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
    </div>
  );
}
