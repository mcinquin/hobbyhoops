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
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { FrNbaPlayer } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "@/i18n/client";

interface FrNbaTableProps {
  players: FrNbaPlayer[];
}

function BoolCell({ value, yesLabel }: { value: boolean | null; yesLabel: string }) {
  if (value === true) {
    return (
      <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400">
        {yesLabel}
      </Badge>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

export function FrNbaTable({ players }: FrNbaTableProps) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [rookieOnly, setRookieOnly] = useState(false);
  const [patchOnly, setPatchOnly] = useState(false);
  const [immaculateOnly, setImmaculateOnly] = useState(false);
  const [autoOnly, setAutoOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "player", desc: false },
  ]);

  const filteredPlayers = useMemo(() => {
    let result = players;
    if (rookieOnly) result = result.filter((p) => p.rookieCard === true);
    if (patchOnly) result = result.filter((p) => p.patch === true);
    if (immaculateOnly) result = result.filter((p) => p.immaculate === true);
    if (autoOnly) result = result.filter((p) => Boolean(p.auto));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.player.toLowerCase().includes(q) ||
          p.draftedBy.toLowerCase().includes(q) ||
          p.draftYear.includes(q)
      );
    }
    return result;
  }, [players, search, rookieOnly, patchOnly, immaculateOnly, autoOnly]);

  const columns = useMemo<ColumnDef<FrNbaPlayer>[]>(
    () => [
      {
        accessorKey: "player",
        header: t("guides.frNba.player"),
        cell: ({ row }) => <span className="font-medium">{row.original.player}</span>,
      },
      {
        accessorKey: "draftYear",
        header: t("guides.frNba.draftYear"),
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">{row.original.draftYear}</span>
        ),
      },
      {
        accessorKey: "draftedBy",
        header: t("guides.frNba.draftedBy"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.draftedBy}</span>
        ),
      },
      {
        accessorKey: "rookieCard",
        header: t("guides.frNba.rookieCard"),
        cell: ({ row }) => (
          <BoolCell value={row.original.rookieCard} yesLabel={t("guides.frNba.yes")} />
        ),
      },
      {
        accessorKey: "auto",
        header: t("guides.frNba.auto"),
        cell: ({ row }) =>
          row.original.auto ? (
            <span className="text-sm">{row.original.auto}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "patch",
        header: t("guides.frNba.patch"),
        cell: ({ row }) => (
          <BoolCell value={row.original.patch} yesLabel={t("guides.frNba.yes")} />
        ),
      },
      {
        accessorKey: "immaculate",
        header: t("guides.frNba.immaculate"),
        cell: ({ row }) => (
          <BoolCell value={row.original.immaculate} yesLabel={t("guides.frNba.yes")} />
        ),
      },
    ],
    [t]
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable
  const table = useReactTable({
    data: filteredPlayers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("guides.frNba.search")}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={rookieOnly ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setRookieOnly(!rookieOnly)}
        >
          {t("guides.frNba.rookieCard")}
        </Button>
        <Button
          variant={autoOnly ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setAutoOnly(!autoOnly)}
        >
          {t("guides.frNba.auto")}
        </Button>
        <Button
          variant={patchOnly ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setPatchOnly(!patchOnly)}
        >
          {t("guides.frNba.patch")}
        </Button>
        <Button
          variant={immaculateOnly ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setImmaculateOnly(!immaculateOnly)}
        >
          {t("guides.frNba.immaculate")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("guides.frNba.count", { count: filteredPlayers.length })}
        {filteredPlayers.length !== players.length &&
          ` ${t("common.filteredOf", { total: players.length })}`}
      </p>

      <div className="space-y-2 md:hidden">
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => {
            const p = row.original;
            const tags = [
              p.rookieCard ? t("guides.frNba.rookieCard") : null,
              p.auto,
              p.patch ? t("guides.frNba.patch") : null,
              p.immaculate ? t("guides.frNba.immaculate") : null,
            ].filter(Boolean);

            return (
              <div
                key={row.id}
                className="rounded-lg border border-border bg-card p-3 text-sm"
              >
                <p className="font-medium">{p.player}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.draftYear} · {p.draftedBy}
                </p>
                {tags.length > 0 && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    {tags.join(" · ")}
                  </p>
                )}
              </div>
            );
          })
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
