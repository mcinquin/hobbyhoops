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
import type { WantedBlock, WantedEntry } from "@/lib/types";
import { ColumnFilterCombobox } from "@/components/column-filter-combobox";
import { SortableTableHead } from "@/components/data-table/sortable-table-head";
import { TablePagination } from "@/components/data-table/table-pagination";
import { SearchField } from "@/components/search-field";
import {
  Table,
  TableBody,
  TableCell,
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

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable
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
        <SearchField
          label={t("guides.wanted.search")}
          placeholder={t("guides.wanted.search")}
          value={search}
          onChange={setSearch}
          className="min-w-0 flex-1 sm:max-w-sm"
        />
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
                  <SortableTableHead key={header.id} header={header} />
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

      <TablePagination table={table} />
    </div>
  );
}
